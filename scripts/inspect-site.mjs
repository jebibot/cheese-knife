// Read-only public CHZZK inspection in a fresh browser context. No user profile,
// authentication state, raw playback URLs, chat content or tokens are exported.
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, ...(process.argv.includes('--chrome') ? { channel: 'chrome' } : {}) });
try {
  const context = await browser.newContext({ locale: 'ko-KR', viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  let target = process.argv.slice(2).find(value => !value.startsWith('--')) || 'https://chzzk.naver.com/lives';
  const parsed = new URL(target);
  if (parsed.origin !== 'https://chzzk.naver.com' || parsed.search || parsed.hash) throw new Error('Expected a public CHZZK URL without query/hash');
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (parsed.pathname === '/lives') {
    await page.locator('#layout-body a[href^="/live/"]').first().waitFor({ timeout: 30000 });
    const href = await page.locator('#layout-body a[href^="/live/"]').first().getAttribute('href');
    target = new URL(href, parsed.origin).href;
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  try { await page.locator('.pzp-pc').waitFor({ state: 'attached', timeout: 15000 }); }
  catch { console.log(JSON.stringify({ playerUnavailable: true, title: await page.title(),
    headings: await page.locator('h1,h2').allTextContents() })); }
  const report = await page.evaluate(async () => {
    const getFiber = node => Object.entries(node || {}).find(([key]) => key.startsWith('__reactFiber$'))?.[1];
    const scan = (node, predicate) => {
      const seen = new Set();
      let fiber = getFiber(node);
      while (fiber && !seen.has(fiber) && seen.size < 300) {
        seen.add(fiber);
        let hook = fiber.memoizedState;
        const hooks = new Set();
        while (hook && !hooks.has(hook) && hooks.size < 300) {
          hooks.add(hook);
          try { if (predicate(hook.memoizedState)) return hook.memoizedState; } catch {}
          hook = hook.next;
        }
        fiber = fiber.return;
      }
      return null;
    };
    const layout = document.getElementById('live_player_layout') || document.getElementById('player_layout');
    const pzp = layout?.querySelector('.pzp-pc') || document.querySelector('.pzp-pc');
    const video = pzp?.querySelector('video');
    const chat = document.querySelector('#aside-chatting') || document.querySelector('#layout-body aside');
    const core = scan(layout, value => !!value?._corePlayer)?._corePlayer;
    const controller = scan(chat, value => typeof value?.messageFilter === 'function');
    const ancestors = [];
    for (let node = layout, count = 0; node && count < 6; node = node.parentElement, count++) {
      ancestors.push({ tag: node.tagName, id: node.id, classes: String(node.className) });
    }
    const ranges = list => Array.from({ length: list?.length || 0 }, (_, index) => [list.start(index), list.end(index)]);
    let api = null;
    const uid = location.pathname.match(/^\/live\/([a-f0-9]{32})/)?.[1];
    if (uid) {
      try {
        const response = await fetch(`https://api.chzzk.naver.com/service/v3.3/channels/${uid}/live-detail`, { credentials: 'omit', signal: AbortSignal.timeout(7000) });
        const data = await response.json();
        const playback = JSON.parse(data.content?.livePlaybackJson || '{}');
        const media = playback.media || [];
        api = { httpStatus: response.status, code: data.code, status: data.content?.status,
          media: media.map(item => ({ id: item.mediaId, hasPath: typeof item.path === 'string', trackCount: item.encodingTrack?.length || 0 })) };
        const hls = media.find(item => ['HLS', 'LLHLS'].includes(item.mediaId) && item.path?.startsWith('https://'));
        if (hls && !data.content?.adult) {
          const playlist = await fetch(hls.path, { credentials: 'omit', signal: AbortSignal.timeout(7000) });
          const body = await playlist.text();
          api.playlist = { httpStatus: playlist.status, isM3u8: body.startsWith('#EXTM3U'), isMaster: body.includes('#EXT-X-STREAM-INF'), hasLowLatencyParts: body.includes('#EXT-X-PART') };
        }
      } catch (error) { api = { error: error.name }; }
    }
    return {
      route: location.pathname.startsWith('/video/') ? 'vod' : 'live',
      webpackKnown: typeof window.webpackChunkglive_fe_pc?.push === 'function',
      vue: !!pzp?.__vue__, reactOnLayout: !!getFiber(layout), reactOnChat: !!getFiber(chat),
      corePlayer: !!core, hls: !!core?.player?._mediaController?._hls,
      chatFilter: !!controller, blindListener: typeof controller?.notiBlindListener === 'function',
      licenseMenu: !!document.getElementById('license'),
      pzpCount: document.querySelectorAll('.pzp-pc').length,
      mediaCandidates: { videos: document.querySelectorAll('video').length,
        playerClasses: [...document.querySelectorAll('[class*="pzp"], [id*="player"]')].slice(0, 12).map(node => ({ tag: node.tagName, id: node.id, classes: String(node.className) })),
        unsupportedBrowserNotice: [...document.querySelectorAll('main, [role="dialog"]')].some(node => node.innerText?.includes('이 브라우저는 고화질 라이브를 감상할 수 없습니다')) },
      video: video ? { sourceKind: video.currentSrc.startsWith('blob:') ? 'blob' : 'other',
        crossOrigin: video.crossOrigin, paused: video.paused, readyState: video.readyState,
        finiteDuration: Number.isFinite(video.duration), buffered: ranges(video.buffered), seekable: ranges(video.seekable) } : null,
      playerAncestors: ancestors, api,
      publicVodLinks: [...document.querySelectorAll('a[href^="/video/"]')].length,
    };
  });
  console.log(JSON.stringify({ browserVersion: browser.version(), ...report }, null, 2));
} finally {
  await browser.close();
}
