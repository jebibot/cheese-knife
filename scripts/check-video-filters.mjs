// Controlled native SVG verification; no user profile or broadcast data.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, ...(process.argv.includes('--chrome') ? { channel: 'chrome' } : {}) });
const cases = [
  { name: 'neutral', change: {}, expected: [100, 80, 60], nodes: 0 },
  { name: 'brightness zero', change: { brightness: 0 }, expected: [0, 0, 0], nodes: 1 },
  { name: 'brightness above neutral', change: { brightness: 1.5 }, direction: 'brighter', nodes: 1 },
  { name: 'contrast zero', change: { contrast: 0 }, expected: [128, 128, 128], nodes: 1 },
  { name: 'contrast increase on darker input', change: { contrast: 2 }, direction: 'darker', nodes: 1 },
  { name: 'gamma zero', change: { gamma: 0 }, expected: [255, 255, 255], nodes: 1 },
  { name: 'gamma above neutral', change: { gamma: 2 }, direction: 'darker', nodes: 1 },
  { name: 'saturation zero', change: { saturation: 0 }, grayscale: true, nodes: 1 },
  { name: 'sharpen uniform interior', change: { sharpness: 5 }, expected: [100, 80, 60], nodes: 1, kernel: '0 -1 0 -1 5 -1 0 -1 0' },
  { name: 'all five filters combined', change: { brightness: 1.5, contrast: 1.1, gamma: 0.8, saturation: 0.5, sharpness: 2 }, direction: 'brighter', nodes: 5, kernel: '0 -0.4 0 -0.4 2.6 -0.4 0 -0.4 0' },
  { name: 'combined neutral reset', change: {}, expected: [100, 80, 60], nodes: 0 },
];
const reports = [];
const failures = [];
const readPixel = async page => {
  // Read the rendered CSS-filtered video, not canvas.filter or the source frame.
  const screenshot = await page.screenshot({ clip: { x: 0, y: 0, width: 64, height: 64 } });
  return page.evaluate(async encoded => {
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    try {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
      return Array.from(ctx.getImageData(32, 32, 1, 1).data).slice(0, 3);
    } finally { bitmap.close(); }
  }, screenshot.toString('base64'));
};
try {
  const page = await browser.newPage();
  await page.route('https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', route => route.fulfill({ contentType: 'text/html', body: '<style>body{margin:0}video{display:block;width:64px;height:64px}canvas{display:none}</style><video id="primary" muted playsinline></video><canvas id="input" width="64" height="64"></canvas>' }));
  await page.goto('https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  await page.evaluate(() => {
    window.chrome = {
      storage: { local: { get: async () => ({ config: {}, styleParameters: {} }), onChanged: { addListener(fn) { window.__filterStorageChange = fn; } } } },
      i18n: { getMessage: key => key }, runtime: { onMessage: { addListener() {} } },
    };
  });
  await page.evaluate(await fs.readFile('config.js', 'utf8'));
  await page.evaluate(await fs.readFile('web/main.js', 'utf8'));
  await page.addStyleTag({ content: await fs.readFile('web/main.css', 'utf8') });
  await page.evaluate(async () => {
    const input = document.getElementById('input'), video = document.getElementById('primary');
    const source = input.getContext('2d'); source.fillStyle = 'rgb(100,80,60)';
    video.muted = true; video.srcObject = input.captureStream(10);
    window.__filterPaintTimer = setInterval(() => source.fillRect(0, 0, 64, 64), 100);
    let timeout;
    try {
      await Promise.race([video.play(), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Synthetic video start timeout')), 5000); })]);
    } finally { clearTimeout(timeout); }
  });
  for (const item of cases) {
    const report = await page.evaluate(change => {
      const config = normalizeConfig(change);
      window.__filterStorageChange({ config: { newValue: config } });
      return { nodes: document.getElementById('knifeFilter').children.length,
        interpolation: getComputedStyle(document.getElementById('knifeFilter')).colorInterpolationFilters,
        videoFilter: getComputedStyle(document.getElementById('primary')).filter,
        parameters: [...document.getElementById('knifeFilter').children].map(n => ({ tag: n.tagName, kernel: n.getAttribute('kernelMatrix') })) };
    }, item.change);
    report.pixel = await readPixel(page);
    assert.equal(report.nodes, item.nodes, item.name);
    if (item.nodes) assert.match(report.videoFilter, /knifeFilter/, item.name); else assert.equal(report.videoFilter, 'none', item.name);
    if (item.expected) for (let i = 0; i < 3; i++) assert.ok(Math.abs(report.pixel[i] - item.expected[i]) <= 1, `${item.name} channel${i}: ${report.pixel[i]}`);
    if (item.grayscale) { assert.equal(report.pixel[0], report.pixel[1]); assert.equal(report.pixel[1], report.pixel[2]); assert.ok(report.pixel[0] > 0 && report.pixel[0] < 255); }
    if (item.direction) for (const [i, original] of [100, 80, 60].entries()) assert.ok(item.direction === 'brighter' ? report.pixel[i] > original : report.pixel[i] < original, `${item.name} channel${i}`);
    if (item.kernel) assert.equal(report.parameters.find(n => n.tag === 'feConvolveMatrix')?.kernel, item.kernel);
    reports.push({ name: item.name, ...report });
  }
  // Break caught: PZP's more specific native video-filter rule wins over the
  // generic extension rule. Preserve that inner pipeline, applying ours once
  // to the direct video's source wrapper; never to both video and wrapper.
  const wrapperCases = [
    { name: 'live native source wrapper receives extension filter', route: 'live', native: true, active: true, pixel: [0, 0, 0] },
    { name: 'VOD native source wrapper receives extension filter', route: 'vod', native: true, active: true, pixel: [0, 0, 0] },
    { name: 'native wrapper without native filter applies extension only once', route: 'live', native: false, active: true, pixel: [0, 0, 0] },
    { name: 'neutral reset removes wrapper filter and preserves native pixels', route: 'vod', native: true, active: false, reset: true, pixel: [50, 40, 30] },
    { name: 'neutral native pipeline is not replaced by extension', route: 'live', native: true, active: false, pixel: [50, 40, 30] },
    { name: 'non-PZP source wrapper retains legacy video filtering', route: 'live', native: false, active: true, foreign: true, pixel: [0, 0, 0] },
  ];
  for (const item of wrapperCases) {
    const report = await page.evaluate(item => {
      const video = document.getElementById('primary');
      document.body.append(video);
      for (const id of ['native-fixture-root', 'native-fixture-svg', 'native-fixture-style']) document.getElementById(id)?.remove();
      video.className = 'webplayer-internal-video';
      const root = document.createElement('div'); root.id = 'native-fixture-root';
      root.className = item.foreign ? 'foreign-player' : 'pzp-pc pzp-pc--fixture pzp-pc--filter';
      root.innerHTML = '<div class="pzp-pc__video"><div id="source-wrapper" class="webplayer-internal-source-wrapper"></div></div>';
      if (item.foreign) root.firstChild.className = 'foreign-video-container';
      root.querySelector('#source-wrapper').append(video); document.body.append(root);
      const nativeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      nativeSvg.id = 'native-fixture-svg'; nativeSvg.style.display = 'none';
      // A known native half-brightness pipeline makes preservation observable:
      // sRGB [100,80,60] -> [50,40,30], independently of extension helpers.
      nativeSvg.innerHTML = '<filter id="nativeFilter" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="0.5"/><feFuncG type="linear" slope="0.5"/><feFuncB type="linear" slope="0.5"/></feComponentTransfer></filter>';
      document.body.append(nativeSvg);
      if (item.native) {
        const style = document.createElement('style'); style.id = 'native-fixture-style';
        style.textContent = '.pzp-pc--fixture.pzp-pc--filter .webplayer-internal-video{filter:url("#nativeFilter")}';
        document.body.append(style);
      }
      history.replaceState(null, '', item.route === 'vod' ? '/video/12345' : '/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      window.__filterStorageChange({ config: { newValue: normalizeConfig({ brightness: 0 }) } });
      const wrapper = document.getElementById('source-wrapper');
      const beforeReset = { wrapper: getComputedStyle(wrapper).filter, video: getComputedStyle(video).filter };
      if (!item.active) window.__filterStorageChange({ config: { newValue: normalizeConfig({}) } });
      return { beforeReset, wrapperFilter: getComputedStyle(wrapper).filter, videoFilter: getComputedStyle(video).filter,
        nodes: document.getElementById('knifeFilter').children.length, paused: video.paused };
    }, item);
    report.pixel = await readPixel(page);
    reports.push({ name: item.name, ...report });
    try {
      if (item.reset) assert.match(report.beforeReset.wrapper, /knifeFilter/, 'active wrapper before reset');
      if (item.active && !item.foreign) assert.match(report.wrapperFilter, /knifeFilter/, 'extension applies to current source wrapper');
      else assert.equal(report.wrapperFilter, 'none', 'neutral or foreign wrapper is untouched');
      if (item.native) assert.match(report.videoFilter, /nativeFilter/, 'native pipeline remains on video');
      else if (item.foreign) assert.match(report.videoFilter, /knifeFilter/, 'legacy video still receives filter');
      else assert.equal(report.videoFilter, 'none', 'current video is not filtered twice');
      assert.equal(report.nodes, item.active ? 1 : 0);
      assert.equal(report.paused, false);
      for (const [i, expected] of item.pixel.entries()) assert.ok(Math.abs(report.pixel[i] - expected) <= 1, `${item.name} channel${i}: ${report.pixel[i]}`);
    } catch (error) { failures.push({ name: item.name, error: error.message }); }
  }
  console.log(JSON.stringify({ browser: browser.version(), checks: reports.length, passed: reports.length - failures.length, failures, reports }, null, 2));
  assert.equal(failures.length, 0, 'Native source-wrapper filter regressions');
} finally { await browser.close(); }
