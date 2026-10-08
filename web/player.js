(() => {
  const runtime = window[Symbol.for('cheese-knife.runtime.v1')];
  if (!runtime || runtime.player) return;
  let current;
  const defaultRequested = new WeakSet();
  const manuallyToggled = new WeakSet();
  const label = (key, fallback) => runtime.i18n[key] || fallback;
  const ranges = video => {
    const list = video?.seekable?.length ? video.seekable : video?.buffered;
    const result = [];
    for (let index = 0; index < (list?.length || 0); index++) {
      const start = list.start(index), end = list.end(index);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) result.push([start, end]);
    }
    return result;
  };
  const bounded = (value, available, forward) => {
    for (const [start, end] of available) {
      const insideEnd = end - Math.min(0.05, (end - start) / 2);
      if (value >= start && value <= insideEnd) return value;
      if (value < start) {
        if (forward) return start;
        const previous = available[available.findIndex(range => range[0] === start) - 1];
        return previous ? previous[1] - Math.min(0.05, (previous[1] - previous[0]) / 2) : start;
      }
    }
    const [start, end] = available.at(-1);
    return end - Math.min(0.05, (end - start) / 2);
  };
  const seek = backward => {
    const state = runtime.state;
    const video = state.player?.video;
    if (state.route?.kind !== 'live' || runtime.config.arrowSeek !== true || !video) return false;
    const available = ranges(video);
    if (!available.length) return false;
    video.currentTime = bounded(video.currentTime + (backward ? -5 : 5), available, !backward);
    return true;
  };
  const liveEdge = () => {
    const video = runtime.state.player?.video;
    const available = ranges(video);
    if (available.length) video.currentTime = bounded(Infinity, available, true);
  };
  const ownedButton = (className, text, icon) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `pzp-button knife-owned ${className}`;
    button.title = text; button.setAttribute('aria-label', text);
    button.innerHTML = icon;
    return button;
  };
  const mount = player => {
    const scope = runtime.createScope();
    const state = { ...player, scope, nodes: new Set(), pointer: null, path: runtime.state.route.path };
    scope.add(() => {
      // UI ownership is not audio ownership: React can remount controls/layout
      // while keeping the very same irreversibly intercepted media element.
      if (runtime.selectPlayer()?.video !== state.video) runtime.audio?.bypass(state.video);
      for (const node of state.nodes) node.remove();
    });
    const track = node => { state.nodes.add(node); return node; };
    state.track = track;
    const clearClick = () => { clearTimeout(state.clickTimer); state.clickTimer = null; state.clickBlock = null; state.cancelledHold = null; };
    scope.add(clearClick);
    const blockCompletingClick = hold => {
      clearClick(); state.clickBlock = { target: hold.target, id: hold.id };
      state.clickTimer = setTimeout(clearClick, 1000);
    };
    const stopHold = event => {
      const cancelled = state.cancelledHold;
      if (cancelled) {
        if (event?.type?.startsWith('pointer') && event.pointerId != null && cancelled.id != null && event.pointerId !== cancelled.id) return;
        if (event?.type === 'pointerup') blockCompletingClick(cancelled);
        else if (event?.type !== 'config-off') state.cancelledHold = null;
      }
      const hold = state.pointer;
      if (!hold) return;
      if (event?.type?.startsWith('pointer') && event.pointerId != null && hold.id != null && event.pointerId !== hold.id) return;
      state.pointer = null; clearTimeout(hold.timer);
      if (hold.active && event?.type === 'pointerup') {
        // pointerup restores our gesture; its following click must not then
        // toggle native playback. Bound the token, and clear on the next down.
        blockCompletingClick(hold);
      } else if (hold.active && event?.type === 'config-off') {
        // Restore immediately, but consume this completed hold's native click
        // only when its physical pointerup arrives, even after a long delay.
        clearClick(); state.cancelledHold = { target: hold.target, id: hold.id };
      }
      if (hold.active && state.video.playbackRate === 2) state.video.playbackRate = hold.originalRate;
      if (hold.active && hold.startedPlaying && !state.video.paused) state.video.pause();
      hold.indicator?.remove();
      if (hold.target.hasPointerCapture?.(hold.id)) hold.target.releasePointerCapture(hold.id);
    };
    state.stopHold = stopHold; scope.add(stopHold);
    scope.on(window, 'pointerdown', clearClick, true);
    scope.on(window, 'click', event => {
      const block = state.clickBlock;
      if (!block || event.detail === 0 || (event.pointerId != null && block.id != null && event.pointerId !== block.id) ||
        !(block.target.contains(event.target) || event.target === state.pzp)) return;
      clearClick(); event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    scope.on(window, 'blur', stopHold);
    scope.on(window, 'pagehide', stopHold);
    scope.on(window, 'pointerup', stopHold, true);
    scope.on(window, 'pointercancel', stopHold, true);
    scope.on(window, 'pointermove', event => {
      const hold = state.pointer;
      if (hold && !hold.active && (Math.abs(event.clientX - hold.x) > 10 || Math.abs(event.clientY - hold.y) > 10)) stopHold();
    }, true);
    return state;
  };
  const controls = state => {
    const { pzp, video, scope, track } = state;
    if (runtime.config.pressToFastForward !== true) state.stopHold({ type: 'config-off' });
    if (runtime.state.route.kind === 'live') {
      const play = pzp.querySelector('.pzp-pc__playback-switch');
      if (play && !pzp.querySelector('.knife-ff')) {
        const button = track(ownedButton('pzp-pc__playback-switch knife-ff', label('fastForward', 'Live edge'),
          '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 6v12l8-6zm9 0v12l8-6z"/></svg>'));
        scope.on(button, 'click', event => { event.stopPropagation(); liveEdge(); });
        play.after(button);
      }
    }
    const license = state.layout.querySelector('#license') || document.getElementById('license');
    if (license && state.pzp.contains(license) && !state.pzp.querySelector('#knife-stats')) {
      const menu = track(license.cloneNode(true)); menu.id = 'knife-stats'; menu.classList.add('knife-owned');
      const link = menu.querySelector('button,a');
      if (link) {
        link.textContent = label('stats', 'Stats');
        if (link.tagName === 'A') link.href = '#';
        scope.on(link, 'click', event => {
          event.preventDefault(); event.stopPropagation();
          if (state.layout.querySelector('.knife-stats-overlay')) return;
          const overlayScope = runtime.createScope(); scope.add(() => overlayScope.dispose());
          const overlay = track(document.createElement('div')); overlay.className = 'knife-stats-overlay knife-owned';
          const content = document.createElement('pre'); const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.title = label('close','Close');
          overlay.append(content, close); state.layout.append(overlay);
          overlayScope.add(() => overlay.remove()); overlayScope.on(close, 'click', () => overlayScope.dispose());
          let last;
          const update = async () => {
            const core = await runtime.adapter?.getCorePlayer(state.layout);
            if (overlayScope.disposed || scope.disposed) return;
            const info = readStats(video, core);
            let fps = null;
            const quality = video.getVideoPlaybackQuality?.();
            const now = performance.now();
            if (quality) {
              if (last && now > last.at) fps = Math.round((quality.totalVideoFrames - last.frames) * 1000 / (now - last.at));
              last = { frames: quality.totalVideoFrames, at: now };
            }
            const unknown = label('unknown','Unknown');
            content.textContent = [label('resolution','Resolution') + ': ' + (info.resolution || unknown),
              label('bitrate','Bitrate') + ': ' + unknown,
              label('fps','FPS') + ' (' + label('measured','measured') + '): ' + (fps ?? unknown),
              label('latency','Latency') + ': ' + unknown,
              label('codec','Codec') + ': ' + (info.codec || unknown)].join('\n');
          };
          update(); overlayScope.interval(update, 1000);
          runtime.setStatus('statistics', 'limited', 'internal-metrics-unavailable');
        });
        license.before(menu);
      }
    }
    if (video && runtime.audio) {
      const volume = pzp.querySelector('.pzp-pc__volume-control:not(.knife-comp)');
      if (volume && !pzp.querySelector('.knife-comp')) {
        const box = track(document.createElement('div')); box.className = 'pzp-pc__volume-control knife-comp knife-owned';
        const button = ownedButton('pzp-pc__volume-button', label('enableCompressor', 'Enable compressor'),
          '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path stroke="currentColor" stroke-width="2" d="M3 7v10m4-13v16m5-18v20m5-18v16m4-13v10"/></svg>');
        const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = '2'; slider.step = '0.05';
        slider.className = 'knife-gain-slider'; slider.setAttribute('aria-label', 'Gain');
        box.append(button, slider); volume.after(box);
        scope.on(button, 'click', event => {
          event.stopPropagation(); manuallyToggled.add(video);
          runtime.audio.setEnabled(video, !['on','pending'].includes(runtime.audio.getState(video)));
        });
        scope.on(slider, 'input', () => runtime.audio.setGain(video, Number(slider.value)));
        // Native player shortcuts otherwise prevent the range's own defaults.
        // Do not preventDefault: arrows/Home/End and Tab retain browser behavior.
        scope.on(slider, 'keydown', event => event.stopPropagation());
        scope.add(runtime.audio.subscribe(video, (status, gain) => {
          box.dataset.state = status; button.setAttribute('aria-pressed', String(status === 'on'));
          const text = label(status === 'on' || status === 'pending' ? 'disableCompressor' : 'enableCompressor', 'Compressor');
          button.title = text; button.setAttribute('aria-label', text);
          slider.value = String(gain); slider.hidden = status !== 'on'; slider.title = `${Math.round(gain * 100)}%`;
        }));
      }
      runtime.audio.configure();
      if (runtime.config.compressorDefault === true && !defaultRequested.has(video) && !manuallyToggled.has(video) && runtime.audio.eligible(video)) {
        defaultRequested.add(video); runtime.audio.setEnabled(video, true);
      }
    }
    const container = pzp.querySelector('.pzp-pc__video');
    if (runtime.state.route.kind === 'vod' && container && state.holdTarget !== container) {
      state.holdTarget = container;
      scope.on(container, 'pointerdown', event => {
        if (event.button !== 0 || runtime.config.pressToFastForward !== true || !video) return;
        state.stopHold();
        const hold = state.pointer = { target: container, id: event.pointerId, x: event.clientX, y: event.clientY, originalRate: video.playbackRate, active: false };
        hold.timer = setTimeout(async () => {
          if (state.pointer !== hold || scope.disposed) return;
          if (runtime.config.pressToFastForward !== true) { state.stopHold(); return; }
          hold.active = true; hold.originalRate = video.playbackRate; video.playbackRate = 2;
          const indicator = hold.indicator = document.createElement('div'); indicator.className = 'knife-ff-indicator knife-owned';
          indicator.textContent = label('speed2x', '2x'); pzp.append(indicator);
          try {
            container.setPointerCapture?.(hold.id);
            if (video.paused) { hold.startedPlaying = true; await video.play(); if (state.pointer !== hold && !video.paused) video.pause(); }
          } catch { state.stopHold(); }
        }, 500);
      });
    }
  };
  const readStats = (video, core) => ({
    resolution: video?.videoWidth > 0 && video?.videoHeight > 0 ? video.videoWidth + '×' + video.videoHeight : null,
    bitrate: null, latency: null,
    codec: core?._currentCodecs ? [core._currentCodecs.video, core._currentCodecs.audio].filter(Boolean).join(', ') : null,
  });
  runtime.player = { seek, liveEdge, ranges, readStats };
  runtime.subscribe(state => {
    const player = state.player;
    if (current && (!runtime.configReady || !player || current.pzp !== player.pzp || current.video !== player.video || current.layout !== player.layout || current.path !== state.route.path)) {
      current.scope.dispose(); current = null;
    }
    if (!runtime.configReady || !player?.video) return;
    if (!current) {
      current = mount(player);
      for (const type of ['loadedmetadata', 'loadeddata', 'emptied']) current.scope.on(player.video, type, () => runtime.schedule());
    }
    controls(current);
    runtime.setStatus('player', 'ready');
  });
  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      !['ArrowLeft','ArrowRight'].includes(event.key) || event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]')) return;
    const video = runtime.state.player?.video;
    if (runtime.state.route?.kind !== 'live' || runtime.config.arrowSeek !== true || !video || video.seeking || !ranges(video).length) return;
    // Window bubbling comes after native body/document handlers. Respect a seek
    // already requested by CHZZK instead of applying another five seconds.
    event.preventDefault(); event.stopImmediatePropagation(); seek(event.key === 'ArrowLeft');
  });
  window.addEventListener('pagehide', event => { if (!event.persisted && current) { current.scope.dispose(); current = null; } });
})();
