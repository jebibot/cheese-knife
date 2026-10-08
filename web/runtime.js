(() => {
  const key = Symbol.for('cheese-knife.runtime.v1');
  if (window[key]) return;
  const subscribers = new Set();
  const statuses = {};
  const transitions = [];
  const requestId = `knife-${Date.now().toString(36)}`;
  let revision = -1;
  let frame;
  let pulse;
  let requestTimer;
  let attempts = 0;
  let suspended = false;

  const runtime = window[key] = {
    requestId, config: {}, i18n: {}, configReady: false, state: {}, statuses,
    features: {}, generation: 0,
    route() {
      const path = location.pathname;
      if (/^\/(?:chat|donation|video-donation|mission-donation|party-donation|gift-effect|product-purchase|embed|error|subs_integration|event|partner|clip-editor|account-interlock|watchparty-source|prime|settings|broadcast-information|close)(?:\/|$)/.test(path) || /\/profile\//.test(path)) return { kind: 'excluded', path };
      const live = path.match(/^\/live\/([a-f0-9]{32})(?:\/chat)?\/?$/i);
      if (live) return { kind: 'live', id: live[1], path };
      const vod = path.match(/^\/video\/(\d+)\/?$/);
      if (vod) return { kind: 'vod', id: vod[1], path };
      const channel = path.match(/^\/([a-f0-9]{32})(?:\/(?:videos|clips|community))?\/?$/i);
      return channel ? { kind: 'channel', id: channel[1], path } : { kind: 'explore', path };
    },
    selectPlayer() {
      const route = this.route();
      if (!['live', 'vod'].includes(route.kind)) return null;
      const body = document.getElementById('layout-body');
      const layout = document.getElementById(route.kind === 'live' ? 'live_player_layout' : 'player_layout');
      const container = layout || body;
      if (!container) return null;
      const candidates = [...container.querySelectorAll('.pzp-pc')].filter(node => !node.closest('.knife-preview, .knife-popup'));
      if (container.matches?.('.pzp-pc')) candidates.unshift(container);
      if (candidates.length !== 1) return null;
      const pzp = candidates[0];
      const video = pzp.querySelector('.pzp-pc__video video') || pzp.querySelector('video');
      return { layout: layout || pzp.parentElement, pzp, video };
    },
    setStatus(feature, state, reason = '') {
      if (!['pending', 'ready', 'limited', 'failed', 'disabled'].includes(state)) return;
      if (statuses[feature]?.state === state && statuses[feature]?.reason === reason) return;
      statuses[feature] = { state, reason };
      transitions.push({ feature, state, reason });
      if (transitions.length > 20) transitions.shift();
      window.postMessage({ namespace: 'cheese-knife', protocol: 1, type: 'status',
        statuses: { ...statuses }, diagnostics: this.diagnostics() }, location.origin);
    },
    diagnostics() {
      const player = this.state.player;
      return { world: 'MAIN', route: this.route().kind, player: !!player,
        vue: !!player?.pzp.__vue__,
        webpackKnown: Array.isArray(Object.getOwnPropertyDescriptor(window, 'webpackChunkglive_fe_pc')?.value),
        reactOnLayout: !!player && Object.keys(player.layout || {}).some(name => name.startsWith('__reactFiber$')),
        mediaBlob: !!player?.video?.currentSrc?.startsWith('blob:') };
    },
    subscribe(fn) {
      subscribers.add(fn);
      fn(this.state);
      return () => subscribers.delete(fn);
    },
    notify() {
      for (const callback of subscribers) {
        try { callback(this.state); }
        catch { this.setStatus('runtime', 'failed', 'feature-initialization'); }
      }
    },
    reconcile() {
      const route = this.route();
      const body = document.getElementById('layout-body');
      const player = this.selectPlayer();
      const sidebar = document.getElementById('sidebar') || document.querySelector('aside[aria-label="사이드바"]');
      const previous = this.state;
      if (previous.route?.path === route.path && previous.body === body && previous.sidebar === sidebar &&
        previous.player?.pzp === player?.pzp && previous.player?.video === player?.video) {
        // Controls can be replaced without changing the media element.
        this.notify();
        return;
      }
      this.generation++;
      this.state = { route, body, player, sidebar, generation: this.generation };
      this.notify();
    },
    schedule() {
      if (suspended || frame != null) return;
      frame = requestAnimationFrame(() => { frame = null; this.reconcile(); });
    },
    createScope() {
      const cleanups = new Set();
      const controller = new AbortController();
      const scope = {
        signal: controller.signal, disposed: false,
        add(fn) { if (this.disposed) fn(); else cleanups.add(fn); return fn; },
        on(target, type, listener, options) {
          target.addEventListener(type, listener, options);
          this.add(() => target.removeEventListener(type, listener, options));
        },
        timeout(fn, ms) {
          const id = setTimeout(() => { cleanups.delete(clear); if (!this.disposed) fn(); }, ms);
          const clear = () => clearTimeout(id);
          this.add(clear); return id;
        },
        interval(fn, ms) { const id = setInterval(() => { if (!this.disposed) fn(); }, ms); this.add(() => clearInterval(id)); return id; },
        observe(observer, target, options) { observer.observe(target, options); this.add(() => observer.disconnect()); },
        dispose() {
          if (this.disposed) return;
          this.disposed = true; controller.abort();
          for (const cleanup of [...cleanups].reverse()) { try { cleanup(); } catch {} }
          cleanups.clear();
        },
      };
      return scope;
    },
  };

  window.addEventListener('message', event => {
    const data = event.data;
    if (event.source !== window || event.origin !== location.origin || data == null || typeof data !== 'object' ||
      data.namespace !== 'cheese-knife' || data.protocol !== 1 || data.type !== 'config' || data.requestId !== requestId ||
      !Number.isSafeInteger(data.revision) || data.revision <= revision || data.config == null || typeof data.config !== 'object' || Array.isArray(data.config)) return;
    revision = data.revision;
    runtime.config = { ...data.config };
    runtime.i18n = data.i18n && typeof data.i18n === 'object' && !Array.isArray(data.i18n)
      ? Object.fromEntries(Object.entries(data.i18n).filter(([, value]) => typeof value === 'string')) : {};
    runtime.configReady = true;
    clearTimeout(requestTimer);
    runtime.setStatus('configuration', 'ready');
    runtime.reconcile();
  });

  const requestConfig = () => {
    if (runtime.configReady) return;
    if (attempts++ >= 20) { runtime.setStatus('configuration', 'limited', 'config-unavailable'); return; }
    window.postMessage({ namespace: 'cheese-knife', protocol: 1, type: 'config-request', requestId }, location.origin);
    requestTimer = setTimeout(requestConfig, 100);
  };
  const observer = new MutationObserver(mutations => {
    const interesting = '#root, #layout-body, #sidebar, #live_player_layout, #player_layout, .pzp-pc, .pzp-pc__video, .pzp-pc__bottom-buttons-left, #license, video, section, aside, [role="tablist"]';
    if (runtime.state.player && !runtime.state.player.pzp.isConnected) return runtime.schedule();
    for (const mutation of mutations) {
      const changed = [...mutation.addedNodes, ...mutation.removedNodes];
      const foreign = changed.some(node => node.nodeType === 1 && !node.classList?.contains('knife-owned') && !node.closest?.('.knife-owned'));
      if (foreign && !mutation.target.closest?.('.knife-owned') &&
        mutation.target.closest?.('.pzp-pc__bottom-buttons-left, .pzp-pc__video, #license')) return runtime.schedule();
      for (const node of changed) {
        if (node.nodeType !== 1 || node.classList?.contains('knife-owned') || node.closest?.('.knife-owned')) continue;
        if (node.matches?.(interesting) || node.querySelector?.(interesting)) return runtime.schedule();
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const startPulse = () => {
    clearInterval(pulse);
    if (!document.hidden) pulse = setInterval(() => {
      if (runtime.state.route?.path !== location.pathname) runtime.reconcile();
    }, 1000);
  };
  document.addEventListener('visibilitychange', () => { startPulse(); runtime.reconcile(); });
  window.addEventListener('popstate', () => runtime.reconcile());
  window.addEventListener('pageshow', () => { suspended = false; startPulse(); runtime.reconcile(); if (!runtime.configReady) requestConfig(); });
  window.addEventListener('pagehide', event => {
    suspended = true; clearInterval(pulse); clearTimeout(requestTimer);
    if (frame != null) { cancelAnimationFrame(frame); frame = null; }
    if (!event.persisted) observer.disconnect();
  });
  runtime.reconcile();
  startPulse();
  requestConfig();
})();
