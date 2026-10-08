(() => {
  const runtime = window[Symbol.for('cheese-knife.runtime.v1')];
  if (!runtime || runtime.audio) return;
  const entries = new WeakMap();
  const connected = new Set();
  const scope = runtime.createScope();
  let context;
  const limits = { threshold: [-100, 0, -50], knee: [0, 40, 40], ratio: [1, 20, 12], attack: [0, 1, 0], release: [0, 1, 0.25] };
  const number = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  const storedGain = () => {
    try { const value = localStorage.getItem('knifeGain'); return value == null || !value.trim() ? 1 : number(Number(value), 0, 2, 1); }
    catch { return 1; }
  };
  const entryFor = video => {
    let entry = entries.get(video);
    if (!entry) { entry = { video, state: 'off', wanted: false, generation: 0, gain: storedGain(), listeners: new Set() }; entries.set(video, entry); }
    return entry;
  };
  const announce = (entry, state, reason = '') => {
    entry.state = state;
    runtime.setStatus('compressor', state === 'on' ? 'ready' : state === 'off' ? 'disabled' : state === 'pending' ? 'pending' : 'limited', reason);
    for (const callback of entry.listeners) callback(state, entry.gain);
  };
  const ramp = (parameter, value) => {
    parameter.cancelScheduledValues?.(context.currentTime);
    parameter.setValueAtTime?.(parameter.value, context.currentTime);
    if (parameter.linearRampToValueAtTime) parameter.linearRampToValueAtTime(value, context.currentTime + 0.01);
    else parameter.value = value;
  };
  const applyGain = entry => {
    const parameter = entry.gainNode.gain;
    const previous = entry.gainTransition;
    const now = context.currentTime;
    if (!previous) {
      // The new wet graph is not connected yet: initialize without a fade-in.
      parameter.value = entry.gain;
      entry.gainTransition = { from: entry.gain, to: entry.gain, start: now, end: now };
      return;
    }
    if (previous.to === entry.gain) return;
    // Track our own linear automation so rapid changes anchor at the in-flight
    // value, rather than the previous target or an implementation-specific .value.
    const progress = previous.end > previous.start ? Math.max(0, Math.min(1, (now - previous.start) / (previous.end - previous.start))) : 1;
    const from = previous.from + (previous.to - previous.from) * progress;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(from, now);
    parameter.linearRampToValueAtTime(entry.gain, now + 0.01);
    entry.gainTransition = { from, to: entry.gain, start: now, end: now + 0.01 };
  };
  const apply = entry => {
    if (!entry.compressor) return;
    for (const [key, [min, max, fallback]] of Object.entries(limits)) {
      entry.compressor[key].value = number(runtime.config[`compressor${key[0].toUpperCase()}${key.slice(1)}`], min, max, fallback);
    }
    applyGain(entry);
  };
  const connect = entry => {
    if (entry.connected) return;
    entry.source.connect(entry.dry);
    entry.source.connect(entry.compressor);
    entry.compressor.connect(entry.gainNode);
    entry.gainNode.connect(entry.wet);
    entry.dry.connect(context.destination); entry.wet.connect(context.destination);
    entry.connected = true; connected.add(entry);
  };
  const bypass = entry => {
    if (entry.source) { ramp(entry.dry.gain, 1); ramp(entry.wet.gain, 0); }
  };
  const eligible = video => {
    if (!video || video.ownerDocument !== document || video.mediaKeys) return false;
    try { return video.currentSrc.startsWith('blob:') && new URL(video.currentSrc).origin === location.origin; }
    catch { return false; }
  };
  runtime.audio = {
    async setEnabled(video, enabled) {
      const entry = entryFor(video);
      const generation = ++entry.generation;
      entry.wanted = enabled === true;
      if (!entry.wanted) { bypass(entry); announce(entry, 'off'); return 'off'; }
      if (runtime.selectPlayer()?.video !== video || !eligible(video)) {
        bypass(entry); announce(entry, 'unavailable', 'unsupported-media-source'); return entry.state;
      }
      announce(entry, 'pending', 'audio-context');
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('audio-context-unavailable');
        context ||= new AudioContextClass();
        if (context.state !== 'running') {
          let timer;
          try {
            await Promise.race([context.resume(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('user-gesture-required')), 1000); })]);
          } finally { clearTimeout(timer); }
        }
        if (generation !== entry.generation || !entry.wanted) return entry.state;
        if (context.state !== 'running' || runtime.selectPlayer()?.video !== video || !eligible(video)) throw new Error('audio-not-ready');
        if (!entry.source) {
          // Prepare all outputs before the irreversible source interception.
          entry.dry = context.createGain(); entry.dry.gain.value = 1;
          entry.wet = context.createGain(); entry.wet.gain.value = 0;
          entry.compressor = context.createDynamicsCompressor();
          entry.gainNode = context.createGain(); entry.gainTransition = null; apply(entry);
          entry.source = context.createMediaElementSource(video);
        }
        connect(entry); apply(entry);
        ramp(entry.dry.gain, 0); ramp(entry.wet.gain, 1);
        announce(entry, 'on');
      } catch (error) {
        if (generation !== entry.generation || !entry.wanted) return entry.state;
        if (entry.source) {
          try { connect(entry); bypass(entry); }
          catch { try { entry.source.disconnect(); entry.source.connect(context.destination); } catch {} }
        }
        announce(entry, 'unavailable', error.message === 'user-gesture-required' ? 'user-gesture-required' : 'audio-unavailable');
      }
      return entry.state;
    },
    getState(video) { return entries.get(video)?.state || 'off'; },
    setGain(video, value) {
      const entry = entryFor(video); entry.gain = number(value, 0, 2, 1);
      try { localStorage.setItem('knifeGain', String(entry.gain)); } catch {}
      apply(entry); announce(entry, entry.state); return entry.gain;
    },
    configure() { for (const entry of connected) apply(entry); },
    bypass(video) { const entry = entries.get(video); if (entry) { entry.generation++; entry.wanted = false; bypass(entry); announce(entry, 'off'); } },
    subscribe(video, callback) { const entry = entryFor(video); entry.listeners.add(callback); callback(entry.state, entry.gain); return () => entry.listeners.delete(callback); },
    eligible,
  };
  scope.interval(() => {
    for (const entry of connected) {
      if (entry.video.isConnected || !entry.video.paused) { entry.detachedSince = null; continue; }
      entry.detachedSince ||= Date.now();
      if (Date.now() - entry.detachedSince >= 5000) {
        // MediaElementSource interception is irreversible. Retire the expensive
        // wet graph and our strong reference, never the video's audible path.
        runtime.audio.bypass(entry.video);
        for (const node of [entry.source, entry.compressor, entry.gainNode, entry.wet]) node.disconnect();
        entry.source.connect(entry.dry);
        entry.connected = false; connected.delete(entry);
      }
    }
  }, 1000);
  scope.on(window, 'pagehide', event => {
    if (!event.persisted) {
      for (const entry of connected) runtime.audio.bypass(entry.video);
      scope.dispose();
    }
  });
})();
