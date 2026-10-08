(() => {
  const runtime = window[Symbol.for('cheese-knife.runtime.v1')];
  if (!runtime || runtime.adapter) return;
  const fiberOf = node => Object.entries(node || {}).find(([key]) => key.startsWith('__reactFiber$'))?.[1];
  const propsOf = node => Object.entries(node || {}).find(([key]) => key.startsWith('__reactProps$'))?.[1];
  const stateOf = (node, criteria, raw = false) => {
    const fibers = new Set();
    for (let fiber = fiberOf(node); fiber && !fibers.has(fiber) && fibers.size < 300; fiber = fiber.return) {
      fibers.add(fiber);
      const hooks = new Set();
      for (let state = fiber.memoizedState; state && !hooks.has(state) && hooks.size < 300; state = state.next) {
        hooks.add(state);
        let value = state.memoizedState;
        if (state.queue?.pending?.hasEagerState) value = state.queue.pending.eagerState;
        else if (state.baseQueue?.hasEagerState) value = state.baseQueue.eagerState;
        try { if (value != null && criteria(value)) return raw ? state : value; } catch {}
      }
    }
    return null;
  };
  let webpackPromise;
  const getWebpackRequire = () => {
    if (webpackPromise) return webpackPromise;
    webpackPromise = new Promise(resolve => {
      const attempted = new WeakMap();
      const id = `knife-${Date.now().toString(36)}`;
      const started = Date.now();
      let settled = false;
      let timer;
      const done = value => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
      const probe = () => {
        // Only the known CHZZK chunk is eligible. Never walk all globals/getters.
        const chunk = Object.getOwnPropertyDescriptor(window, 'webpackChunkglive_fe_pc')?.value;
        if (Array.isArray(chunk) && typeof chunk.push === 'function' && attempted.get(chunk) !== chunk.push) {
          attempted.set(chunk, chunk.push);
          try { chunk.push([[id], { [id]: (_module, _exports, require) => done(require) }, require => require(id)]); } catch {}
        }
        if (settled) return;
        if (Date.now() - started >= 2000) { done(null); return; }
        timer = setTimeout(probe, 100);
      };
      window.addEventListener('pagehide', () => done(null), { once: true });
      probe();
    });
    return webpackPromise;
  };
  runtime.adapter = {
    fiberOf, propsOf, stateOf, getWebpackRequire,
    async getCorePlayer(node = runtime.state.player?.layout) {
      return stateOf(node, value => !!value?._corePlayer)?._corePlayer || null;
    },
    contextOf(node, criteria) {
      const seen = new Set();
      for (let fiber = fiberOf(node); fiber && !seen.has(fiber) && seen.size < 300; fiber = fiber.return) {
        seen.add(fiber);
        let context = fiber.dependencies?.firstContext;
        for (let count = 0; context && count < 100; count++, context = context.next) {
          try { if (context.memoizedValue != null && criteria(context.memoizedValue)) return context.memoizedValue; } catch {}
        }
      }
      return null;
    },
  };
})();
