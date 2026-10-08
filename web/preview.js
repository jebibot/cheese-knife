(() => {
  const runtime = window[Symbol.for('cheese-knife.runtime.v1')];
  if (!runtime || runtime.preview) return;
  let generation = 0;
  let controller;
  let current;
  let panel;
  let backend;
  let media;
  let timers = new Set();
  const cache = new Map();
  const diagnostic = { events: [] };
  const note = event => { diagnostic.events.push(event); if (diagnostic.events.length > 20) diagnostic.events.shift(); };
  const scope = runtime.createScope();
  const later = (fn, delay) => { const timer = setTimeout(() => { timers.delete(timer); fn(); }, delay); timers.add(timer); return timer; };
  const parseURL = href => {
    try { const url = new URL(href); return url.origin === location.origin && /^\/live\/[a-f0-9]{32}\/?$/i.test(url.pathname) ? url : null; }
    catch { return null; }
  };
  const cleanup = () => {
    generation++; controller?.abort(); controller = null; current = null;
    for (const timer of timers) clearTimeout(timer); timers.clear();
    try { backend?.destroy?.(); } catch {}
    backend = null;
    if (media) {
      try { media.pause(); media.removeAttribute('src'); media.srcObject = null; media.load(); } catch {}
      media.remove(); media = null;
    }
    if (panel) { panel.hidden = true; panel.querySelector('img').removeAttribute('src'); }
  };
  const ensurePanel = () => {
    if (panel?.isConnected) return;
    panel = document.createElement('div'); panel.className = 'knife-preview knife-owned'; panel.hidden = true;
    const image = document.createElement('img'); image.alt = '';
    const player = document.createElement('div'); player.className = 'knife-preview-player';
    const uptime = document.createElement('div'); uptime.className = 'knife-preview-uptime';
    panel.append(image, player, uptime); document.body.append(panel);
  };
  const valid = (token, anchor, href) => token === generation && !!current && anchor.isConnected && anchor.href === href && !document.hidden && runtime.configReady;
  const prepare = async (info, anchor, href, token) => {
    if (!valid(token, anchor, href) || runtime.config.livePreview !== true || info.adult) return;
    const Hls = runtime.Hls;
    diagnostic.hlsSupported = !!Hls?.isSupported();
    const path = info.playback?.media?.find(item => item.mediaId === 'HLS' && typeof item.path === 'string' && item.path.startsWith('https://'))?.path;
    if (!path) { runtime.setStatus('livePreview', 'limited', 'stream-unavailable'); return; }
    const video = document.createElement('video'); video.playsInline = true; video.muted = true;
    video.className = 'knife-preview-video'; video.style.visibility = 'hidden';
    video.style.cssText += ';width:100%;height:100%;object-fit:contain;background:#000;';
    panel.querySelector('.knife-preview-player').append(video); media = video;
    let failed = false;
    const fail = () => {
      if (!valid(token, anchor, href) || failed) return;
      failed = true; cache.delete(current.id);
      try { backend?.destroy?.(); video.pause(); video.removeAttribute('src'); video.load(); } catch {}
      backend = null; video.style.visibility = 'hidden';
      runtime.setStatus('livePreview', 'limited', 'stream-playback-unavailable');
    };
    const play = async () => {
      if (!valid(token, anchor, href) || failed) return;
      try {
        await video.play();
        if (!valid(token, anchor, href)) { video.pause(); return; }
        video.style.visibility = ''; runtime.setStatus('livePreview', 'ready');
      } catch { fail(); }
    };
    video.addEventListener('loadeddata', play, { once: true });
    video.addEventListener('error', fail, { once: true });
    video.addEventListener('contextmenu', event => {
      if (runtime.config.rightClickToUnmute !== true || !valid(token, anchor, href)) return;
      event.preventDefault(); video.volume = Math.max(0, Math.min(1, Number(runtime.config.previewVolume || 0) / 100)); video.muted = !video.muted;
    });
    try {
      if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = path;
      else if (Hls?.isSupported()) {
        const hls = backend = new Hls({ enableWorker: false, maxBufferLength: 8, maxMaxBufferLength: 16, backBufferLength: 0 });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          note({ type: data.type, details: data.details, fatal: data.fatal === true,
            status: typeof data.response?.code === 'number' ? data.response.code : null });
          if (data.fatal) fail();
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          note({ type: 'manifestParsed', levels: hls.levels.map(level => ({ height: level.height, videoCodec: level.videoCodec, audioCodec: level.audioCodec })) });
          const below = hls.levels.map((level, index) => ({ level, index })).filter(item => item.level.height <= 480 && item.level.height > 0);
          if (below.length) hls.currentLevel = below.at(-1).index;
        });
        hls.loadSource(path); hls.attachMedia(video);
      } else { fail(); return; }
      runtime.setStatus('livePreview', 'pending', 'stream-loading');
      later(() => { if (video.readyState < 2) fail(); }, 5000);
    } catch { fail(); }
  };
  runtime.preview = {
    diagnostics: diagnostic,
    async show(href, anchor, tooltip = false) {
      const url = parseURL(href);
      if (!url || !anchor?.isConnected || href !== anchor.href ||
        (tooltip ? runtime.config.preview !== true : runtime.config.preview !== true && runtime.config.customPreview !== true) || !runtime.configReady) return;
      if (current?.href === href && current.anchor === anchor) return;
      cleanup();
      const token = generation;
      const hoverStarted = Date.now();
      const id = url.pathname.split('/')[2];
      const request = controller = new AbortController();
      current = { id, href, anchor, route: location.pathname, live: runtime.config.livePreview === true,
        permission: tooltip || runtime.config.customPreview !== true ? 'preview' : 'customPreview' };
      const timeout = later(() => request.abort(), 5000);
      let info;
      try {
        const cached = cache.get(id);
        if (cached && cached.expires > Date.now()) info = cached.info;
        else {
          const response = await fetch('https://api.chzzk.naver.com/service/v3.3/channels/' + id + '/live-detail', { credentials: 'include', signal: request.signal });
          if (!response.ok) throw new Error('api-unavailable');
          const body = await response.json();
          if (body.code !== 200 || !body.content) throw new Error('api-unavailable');
          info = { ...body.content };
          try { info.playback = JSON.parse(info.livePlaybackJson); } catch { info.playback = null; }
          if (valid(token, anchor, href)) {
            cache.delete(id); cache.set(id, { info, expires: Date.now() + (info.status === 'OPEN' ? 30000 : 5000) });
            while (cache.size > 100) cache.delete(cache.keys().next().value);
          }
        }
      } catch {
        if (valid(token, anchor, href)) runtime.setStatus('livePreview', 'limited', 'live-detail-unavailable');
        return;
      } finally { clearTimeout(timeout); timers.delete(timeout); }
      if (!valid(token, anchor, href)) return;
      const rect = anchor.getBoundingClientRect();
      if (!rect.width) return;
      ensurePanel();
      const width = Math.min(Math.max(Number(runtime.config.previewWidth) || 400, rect.width), window.innerWidth - 32);
      panel.style.position = 'fixed'; panel.style.width = width + 'px';
      panel.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)) + 'px';
      panel.style.top = Math.max(0, Math.min(tooltip ? rect.bottom : rect.top, window.innerHeight - width * 9 / 16)) + 'px';
      const thumbnail = info.liveImageUrl || info.playback?.thumbnail?.snapshotThumbnailTemplate;
      if (typeof thumbnail === 'string' && thumbnail.startsWith('https://')) panel.querySelector('img').src = thumbnail.replace('{type}', '480');
      const open = info.openDate ? new Date(info.openDate + '+0900').getTime() : NaN;
      const uptime = panel.querySelector('.knife-preview-uptime');
      const updateUptime = () => {
        if (!valid(token, anchor, href)) return;
        if (Number.isFinite(open)) {
          const seconds = Math.max(0, Math.floor((Date.now() - open) / 1000));
          uptime.textContent = Math.floor(seconds / 3600) + ':' + String(Math.floor(seconds / 60) % 60).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
        } else uptime.textContent = '';
        later(updateUptime, 1000);
      };
      // Metadata/network time is part of the user's hover delay. Start muted
      // loading in parallel with the remaining wait, not after another full wait.
      if (runtime.config.livePreview === true && info.status === 'OPEN' && !info.adult) prepare(info, anchor, href, token);
      else if (info.adult) runtime.setStatus('livePreview', 'limited', 'age-restricted-stream');
      const delay = Math.max(100, Math.min(3000, Number(runtime.config.previewDelay) * 1000 || 1000));
      later(() => {
        if (!valid(token, anchor, href)) return;
        panel.hidden = false; updateUptime(); runtime.setStatus('preview', 'ready');
      }, Math.max(0, hoverStarted + delay - Date.now()));
    },
    hide(href) { if (!href || current?.href === href) cleanup(); },
  };
  scope.on(document, 'mouseover', event => {
    const anchor = event.target.closest?.('a[href]');
    if (anchor?.closest('#sidebar') || !anchor?.closest('#layout-body') || anchor.contains(event.relatedTarget)) return;
    if (runtime.config.customPreview === true && parseURL(anchor.href)) runtime.preview.show(anchor.href, anchor, false);
  });
  scope.on(document, 'mouseout', event => {
    const anchor = event.target.closest?.('a[href]');
    if (anchor && !anchor.contains(event.relatedTarget)) runtime.preview.hide(anchor.href);
  });
  scope.on(document, 'visibilitychange', () => { if (document.hidden) cleanup(); });
  scope.on(document, 'contextmenu', event => {
    if (runtime.config.rightClickToUnmute !== true) return;
    let video = current?.anchor.contains(event.target) ? media : null;
    if (!video && runtime.config.customPreview !== true) {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor?.closest('#layout-body') || anchor.closest('#sidebar, .pzp-pc, .knife-popup') || !parseURL(anchor.href)) return;
      const candidates = anchor.querySelectorAll('video');
      if (candidates.length === 1) video = candidates[0];
    }
    if (!video) return;
    event.preventDefault(); video.volume = Math.max(0, Math.min(1, Number(runtime.config.previewVolume || 0) / 100)); video.muted = !video.muted;
  });
  scope.on(window, 'pagehide', event => { cleanup(); if (!event.persisted) scope.dispose(); });
  const checkActive = () => {
    if (current && (location.pathname !== current.route || !current.anchor.isConnected || current.anchor.href !== current.href ||
      (panel && !panel.isConnected) || runtime.config[current.permission] !== true ||
      (current.live && runtime.config.livePreview !== true))) cleanup();
  };
  // Constant-time identity check, not a document-wide card scan. Invalidation
  // must stop an existing stream as well as reject future async completions.
  scope.observe(new MutationObserver(checkActive), document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  runtime.subscribe(checkActive);
})();
