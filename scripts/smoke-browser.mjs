import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { playerHTML } = require('../tests/helpers.cjs');
const manifest = JSON.parse(await fs.readFile('manifest.json', 'utf8'));
const scripts = manifest.content_scripts.find(script => script.world === 'MAIN').js;
const browser = await chromium.launch({ headless: true, ...(process.argv.includes('--chrome') ? { channel: 'chrome' } : {}) });
try {
  const context = await browser.newContext({ locale: 'ko-KR' });
  const page = await context.newPage();
  const errors = [];
  let mediaRequests = 0;
  page.on('request', request => {
    try { if (/\.(?:m3u8|ts|m4s)(?:$|\/)/i.test(new URL(request.url()).pathname)) mediaRequests++; } catch {}
  });
  page.on('pageerror', error => errors.push(error.name + ': ' + error.message.slice(0, 120)));
  if (!process.argv.includes('--public')) {
    await page.route('https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', route => route.fulfill({ contentType: 'text/html', body: playerHTML }));
    await page.goto('https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    await page.evaluate(() => {
      window.__audioProbe = { gains: [], sources: 0 };
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(...args) { super(...args); window.__audioProbe.context = this; }
        createGain() { const node = super.createGain(); window.__audioProbe.gains.push(node); return node; }
        createMediaElementSource(video) { const node = super.createMediaElementSource(video); window.__audioProbe.sources++; return node; }
      };
    });
  } else {
    const supplied = process.argv.find(value => value.startsWith('https://chzzk.naver.com/live/'));
    if (supplied) await page.goto(supplied, { waitUntil: 'domcontentloaded' });
    else {
      await page.goto('https://chzzk.naver.com/lives', { waitUntil: 'domcontentloaded' });
      await page.locator('#layout-body a[href^="/live/"]').first().waitFor();
      const href = await page.locator('#layout-body a[href^="/live/"]').first().getAttribute('href');
      await page.goto(new URL(href, 'https://chzzk.naver.com').href, { waitUntil: 'domcontentloaded' });
    }
    try { await page.locator('.pzp-pc').waitFor({ state: 'attached', timeout: 15000 }); }
    catch {
      console.log(JSON.stringify({ mode: 'public-page-unavailable', title: await page.title(),
        headings: await page.locator('h1,h2').allTextContents(), errors: errors.map(value => value.split(':')[0]) }, null, 2));
      // The native player can refuse a headless browser's high-quality codec.
      // Continue only with the extension's independent public preview probe;
      // do not dismiss the notice or claim native player verification.
    }
  }
  // DevTools MAIN evaluation checks production logic, not extension loading or
  // ISOLATED Chrome APIs. The distinction is retained in the validation record.
  if (process.argv.includes('--hls-js')) await page.evaluate(() => {
    const native = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function(type) {
      return type === 'application/vnd.apple.mpegurl' ? '' : native.call(this, type);
    };
  });
  for (const file of scripts) await page.evaluate(await fs.readFile(file, 'utf8'));
  await page.evaluate(await fs.readFile('config.js', 'utf8'));
  await page.addStyleTag({ content: await fs.readFile('web/main.css', 'utf8') });
  await page.evaluate(() => {
    const runtime = window[Symbol.for('cheese-knife.runtime.v1')];
    window.postMessage({ namespace: 'cheese-knife', protocol: 1, type: 'config', requestId: runtime.requestId,
      revision: 100, config: normalizeConfig({ customPreview: true }),
      i18n: { fastForward: 'Live edge', enableCompressor: 'Enable compressor', disableCompressor: 'Disable compressor', speed2x: '2x' } }, location.origin);
  });
  if (!process.argv.includes('--public') || await page.locator('.pzp-pc').count()) await page.locator('.knife-comp button').waitFor();
  if (process.argv.includes('--public')) {
    await page.evaluate(() => {
      const anchor = document.createElement('a'); anchor.href = location.href;
      anchor.textContent = 'Public preview smoke'; anchor.className = 'knife-owned';
      anchor.style.cssText = 'position:fixed;top:10px;left:10px;width:140px;height:24px;';
      document.body.append(anchor);
      return window[Symbol.for('cheese-knife.runtime.v1')].preview.show(anchor.href, anchor, true);
    });
    await page.waitForFunction(() => {
      const status = window[Symbol.for('cheese-knife.runtime.v1')].statuses.livePreview;
      return status?.state === 'ready' || status?.state === 'limited';
    }, null, { timeout: 20000 });
    const before = await page.locator('.knife-preview video').evaluate(video => ({ time: video.currentTime, frames: video.getVideoPlaybackQuality?.().totalVideoFrames })).catch(() => null);
    await page.waitForTimeout(2000);
    const report = await page.evaluate(() => {
      const runtime = window[Symbol.for('cheese-knife.runtime.v1')];
      const video = document.querySelector('.knife-preview video');
      const main = runtime.state.player?.video;
      return { mode: 'public-main-logic', diagnostics: runtime.diagnostics(), statuses: runtime.statuses,
        hlsDiagnostics: runtime.preview.diagnostics,
        codecSupport: { avc: MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"'), hevc: MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.6.L93.B0"'), aac: MediaSource.isTypeSupported('audio/mp4; codecs="mp4a.40.2"') },
        mainMedia: main ? { readyState: main.readyState, decodedFrames: main.getVideoPlaybackQuality?.().totalVideoFrames } : null,
        fastForwardButtons: document.querySelectorAll('.knife-ff').length,
        compressorButtons: document.querySelectorAll('.knife-comp').length,
        preview: video ? { readyState: video.readyState, time: video.currentTime, decodedFrames: video.getVideoPlaybackQuality?.().totalVideoFrames } : null };
    });
    await page.evaluate(() => window[Symbol.for('cheese-knife.runtime.v1')].preview.hide());
    await page.waitForTimeout(500);
    const stoppedAt = mediaRequests;
    await page.waitForTimeout(2000);
    const afterHide = await page.evaluate(() => ({ mediaRemoved: !document.querySelector('.knife-preview video'), panelHidden: document.querySelector('.knife-preview')?.hidden === true }));
    console.log(JSON.stringify({ browser: browser.version(), forcedHlsJs: process.argv.includes('--hls-js'), ...report, before, afterHide, mediaRequestsAfterSettling: mediaRequests - stoppedAt }, null, 2));
    if (!report.preview || !before || report.preview.time <= before.time || report.preview.decodedFrames <= before.frames || !afterHide.mediaRemoved || !afterHide.panelHidden)
      throw new Error('Public preview did not demonstrate advancing video frames and cleanup');
  } else {
    await page.locator('.pzp-pc__playback-switch:not(.knife-ff)').click();
    await page.locator('video').evaluate(async video => {
      const rate = 48000, length = rate * 3;
      const bytes = new ArrayBuffer(44 + length * 2); const view = new DataView(bytes);
      const text = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
      text(0,'RIFF'); view.setUint32(4,36 + length * 2,true); text(8,'WAVE'); text(12,'fmt '); view.setUint32(16,16,true);
      view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,rate,true); view.setUint32(28,rate * 2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
      text(36,'data'); view.setUint32(40,length * 2,true);
      for (let index=0;index<length;index++) view.setInt16(44 + index * 2, Math.sin(index * 440 * Math.PI * 2 / rate) * 16000, true);
      video.src = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })); video.loop = true; await video.play();
    });
    await page.locator('.knife-comp button').click();
    await page.waitForFunction(() => document.querySelector('.knife-comp').dataset.state === 'on');
    await page.evaluate(() => {
      const { context, gains } = window.__audioProbe;
      const analyser = context.createAnalyser(); analyser.fftSize = 2048;
      gains[0].connect(analyser); gains[1].connect(analyser); analyser.connect(context.createMediaStreamDestination());
      window.__audioProbe.analyser = analyser;
    });
    const rms = () => page.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      const analyser = window.__audioProbe.analyser, data = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(data);
      return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
    });
    const compressedRms = await rms();
    await page.locator('.knife-comp button').click();
    const bypassRms = await rms();
    const report = await page.evaluate(() => ({ mode: 'controlled-production-modules',
      sources: window.__audioProbe.sources, context: window.__audioProbe.context.state,
      state: document.querySelector('.knife-comp').dataset.state,
      fastForwardButtons: document.querySelectorAll('.knife-ff').length }));
    console.log(JSON.stringify({ browser: browser.version(), ...report, compressedRms, bypassRms, errors }, null, 2));
    if (report.sources !== 1 || report.state !== 'off' || compressedRms <= 0 || bypassRms <= compressedRms || errors.length) throw new Error('Real browser audio/control smoke failed');
  }
} finally { await browser.close(); }
