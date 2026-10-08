(() => {
  const runtime = window[Symbol.for('cheese-knife.runtime.v1')];
  if (!runtime?.adapter || runtime.coordinatorStarted) return;
  runtime.coordinatorStarted = true;
  const { stateOf, propsOf } = runtime.adapter;
  let config = {};
  let i18n = {};
  let owner;
  let ownerGeneration = -1;
  let chats;
  let anchors;
  let sidebar;
  let sidebarRecord;
  let timestampRoots;
  const popups = new Map();
  const videoMetadata = new Map();
  const pad = value => String(value).padStart(2, '0');
  const formatTime = value => {
    const total = Math.max(0, Math.floor(value / 1000));
    const hours = Math.floor(total / 3600), minutes = Math.floor(total / 60) % 60, seconds = total % 60;
    return hours ? hours + ':' + pad(minutes) + ':' + pad(seconds) : minutes + ':' + pad(seconds);
  };
  const liveURL = href => {
    try { const url = new URL(href, location.origin); return url.origin === location.origin && /^\/live\/[a-f0-9]{32}\/?$/i.test(url.pathname) ? url : null; }
    catch { return null; }
  };
  let zIndex = 1000;
  const createPopupPlayer = (url, left, top) => {
    const popup = document.createElement("div");
    const popupScope = runtime.createScope();
    popupScope.add(() => { player.src = "about:blank"; popup.remove(); popups.delete(popup); });
    popup.classList.add("knife-popup");
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.zIndex = `${zIndex++}`;

    const player = document.createElement("iframe");
    player.classList.add("knife-popup-player");
    player.src = url;
    player.allowFullscreen = true;
    player.allow = "autoplay; encrypted-media; picture-in-picture";
    player.scrolling = "no";
    popup.appendChild(player);

    const dragArea = document.createElement("div");
    dragArea.classList.add("knife-popup-drag-area");
    popup.appendChild(dragArea);

    let x = 0;
    let y = 0;
    let dx = 0;
    let dy = 0;
    let stopDrag = () => {};
    popupScope.add(() => stopDrag());
    popupScope.on(window, 'blur', () => stopDrag());
    popupScope.on(window, 'pagehide', () => stopDrag());
    popupScope.on(dragArea, "mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      stopDrag();
      popup.style.zIndex = `${zIndex++}`;
      x = e.clientX;
      y = e.clientY;

      const onMouseMove = (e) => {
        if (!(e.buttons & 1)) { stopDrag(); return; }
        e.preventDefault();
        document.body.classList.add("knife-dragging");
        dx = e.clientX - x;
        dy = e.clientY - y;
        x = e.clientX;
        if (popup.offsetTop + dy < 0) {
          popup.style.top = "0";
        } else {
          y = e.clientY;
          popup.style.top = `${popup.offsetTop + dy}px`;
        }
        popup.style.left = `${popup.offsetLeft + dx}px`;
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.classList.remove("knife-dragging");
        stopDrag = () => {};
      };
      stopDrag = onMouseUp;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    const button = document.createElement("button");
    button.classList.add("knife-popup-close-button");
    button.title = i18n.close;
    button.textContent = "X";
    popupScope.on(button, "click", () => {
      popupScope.dispose();
    });
    popup.appendChild(button);

    popups.set(popup, popupScope);
    return popup;
  };


  const resizeChat = (container, scope) => {
    if (getComputedStyle(document.documentElement).getPropertyValue('--knife-chat-resize').trim() !== '1') return;
    if (!container.parentElement || container.parentElement.querySelector('.knife-resize-handle')) return;
    const handle = document.createElement('div');
    handle.className = 'knife-resize-handle knife-owned'; handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'vertical');
    container.before(handle);
    scope.add(() => { handle.remove(); container.style.width = ''; });
    let dragging;
    let width;
    try {
      const saved = Number(localStorage.getItem('chatWidth'));
      if (Number.isFinite(saved) && saved >= 24 && saved < window.innerWidth) document.documentElement.style.setProperty('--knife-chat-width', saved + 'px');
    } catch {}
    const finish = () => {
      if (!dragging) return;
      if (handle.hasPointerCapture?.(dragging.id)) handle.releasePointerCapture(dragging.id);
      dragging = null; container.style.width = '';
      if (Number.isFinite(width)) {
        document.documentElement.style.setProperty('--knife-chat-width', width + 'px');
        try { localStorage.setItem('chatWidth', String(width)); } catch {}
      }
    };
    scope.on(handle, 'pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      dragging = { id: event.pointerId, left: rect.left, right: rect.right,
        reverse: getComputedStyle(container.parentElement).flexDirection.endsWith('reverse') };
      handle.setPointerCapture?.(event.pointerId);
    });
    scope.on(handle, 'pointermove', event => {
      if (!dragging) return;
      width = Math.max(24, Math.min(window.innerWidth - 24, dragging.reverse ? event.clientX - dragging.left - 1 : dragging.right - event.clientX - 1));
      container.style.width = width + 'px';
    });
    scope.on(handle, 'pointerup', finish); scope.on(handle, 'pointercancel', finish);
    scope.on(window, 'blur', finish); scope.add(() => { dragging = null; });
    runtime.setStatus('chatResize', 'ready');
  };
  const timestamps = (container, isLive, scope) => {
    if (getComputedStyle(document.documentElement).getPropertyValue('--knife-chat-timestamp').trim() !== '1') return;
    // Current VOD rows contain nickname wrappers too; those are not log roots.
    const root = container.querySelector('[role="log"], [class^="live_chatting_list_wrapper__"], [class^="vod_chatting_list__"]');
    if (!root || timestampRoots.has(root)) return;
    timestampRoots.add(root);
    const apply = () => {
      let supported = 0;
      for (const node of root.querySelectorAll('[class^="_item_"], [class^="live_chatting_item__"], [class^="vod_chatting_item__"]')) {
        const props = propsOf(node);
        const message = props?.chatMessage || props?.children?.props?.chatMessage;
        const target = node.querySelector('[class^="_chatting_message_"], [class^="live_chatting_message_chatting_message__"]');
        if (!message || !target) continue;
        if (isLive) {
          const date = new Date(message.time);
          if (Number.isFinite(date.getTime())) { target.dataset.timestamp = pad(date.getHours()) + ':' + pad(date.getMinutes()); supported++; }
        } else if (Number.isFinite(message.playerMessageTime)) { target.dataset.timestamp = formatTime(message.playerMessageTime); supported++; }
      }
      runtime.setStatus('chatTimestamp', supported ? 'ready' : 'pending', supported ? '' : 'message-props-unavailable');
    };
    apply();
    scope.observe(new MutationObserver(apply), root, { childList: true, subtree: true, characterData: true });
  };
  const bindDeletedChat = (controller, container, isLive, scope) => {
    // Native blind events retain content and alter status. Preserve native
    // handling, then disclose only an ordinary message seen before deletion.
    // No JSX, historical cache, server lookup or extra DOM observer is needed.
    const retained = new WeakMap();
    const markers = new Set();
    let binding;
    let conflicted = false;
    const rows = '[class^="_item_"], [class^="live_chatting_item__"]';
    const texts = '[class^="_chatting_message_"] > span[class^="_text_"], [class^="live_chatting_message_chatting_message__"] > span[class^="live_chatting_message_text__"]';
    const ownsMessage = (message, saved) => saved && message.status === 'NORMAL' && message.type === 1 &&
      message.key === saved.key && message.user === saved.user && message.time === saved.time && message.content === saved.content;
    const releaseMarker = node => {
      if (node.dataset.knifeDeleted === '1') delete node.dataset.knifeDeleted;
      markers.delete(node);
    };
    const paint = () => {
      const wanted = new Set();
      if (config.showDeleted === true && !scope.disposed) for (const row of container.querySelectorAll(rows)) {
        const props = propsOf(row);
        const message = props?.chatMessage || props?.children?.props?.chatMessage;
        // Memoized native rendering can update props without any DOM mutation.
        // Match only the same currently retained message, never a row ordinal.
        const current = message && Array.isArray(controller.messageList) && controller.messageList.find(value =>
          value.key === message.key && value.user === message.user && value.time === message.time);
        const saved = current && retained.get(current);
        if (saved && !ownsMessage(current, saved)) retained.delete(current);
        if (!ownsMessage(current, saved) || message.status !== 'NORMAL' || message.content !== saved.content) continue;
        for (const node of row.querySelectorAll(texts)) wanted.add(node);
      }
      for (const node of markers) if (!wanted.has(node) || !node.isConnected) releaseMarker(node);
      for (const node of wanted) {
        if (markers.has(node)) {
          if (node.dataset.knifeDeleted !== '1') markers.delete(node); // Foreign writer now owns it.
        } else if (!node.hasAttribute('data-knife-deleted')) {
          node.dataset.knifeDeleted = '1'; markers.add(node);
        }
      }
    };
    const rehide = () => {
      let changed = false;
      if (Array.isArray(controller.messageList)) for (let i = 0; i < controller.messageList.length; i++) {
        const message = controller.messageList[i], saved = message && retained.get(message);
        if (!saved) continue;
        retained.delete(message);
        if (message.status !== 'NORMAL' || message.content !== saved.content || message.key !== saved.key ||
          message.user !== saved.user || message.time !== saved.time || message.type !== 1) continue;
        controller.messageList[i] = { ...message, status: saved.status }; changed = true;
      }
      if (changed) controller.notiUpdateMessageList();
      for (const node of markers) releaseMarker(node);
    };
    const unbind = () => {
      if (!binding) return;
      const { entry, original, replacement } = binding;
      if (entry.listener === replacement) entry.listener = original;
      if (controller.notiBlindListener === replacement) controller.notiBlindListener = original;
      binding = null;
    };
    const dispose = () => { unbind(); rehide(); };
    const sync = () => {
      if (config.showDeleted !== true) {
        dispose(); conflicted = false; runtime.setStatus('deletedChat', 'disabled'); return;
      }
      const client = controller.chatClient;
      const entries = Object.getOwnPropertyDescriptor(client || {}, '_events')?.value?.notiBlind;
      if (binding) {
        const { entry, original, replacement } = binding;
        if (controller.notiBlindListener !== replacement || entry.listener !== replacement) {
          conflicted = true; dispose();
        } else if (client === binding.client && Array.isArray(entries) && entries.includes(entry)) {
          paint(); runtime.setStatus('deletedChat', 'ready'); return;
        } else {
          // A native reconnect may already have copied our instance callback.
          // Retire the old slot, and unwrap only our exact copied identity.
          unbind();
          if (Array.isArray(entries)) for (const next of entries) if (next?.listener === replacement) next.listener = original;
        }
      }
      const original = controller.notiBlindListener;
      const matches = Array.isArray(entries) ? entries.filter(entry => entry?.listener === original) : [];
      if (!isLive || conflicted || controller.emptyMessage?.status !== 'NORMAL' || !Array.isArray(controller.messageList) ||
        typeof original !== 'function' || typeof controller.notiUpdateMessageList !== 'function' ||
        matches.length !== 1 || matches[0].once !== false ||
        Object.getOwnPropertyDescriptor(matches[0], 'listener')?.writable !== true ||
        Object.getOwnPropertyDescriptor(controller, 'notiBlindListener')?.writable !== true) {
        rehide(); runtime.setStatus('deletedChat', 'limited', 'native-deletion-adapter-unavailable'); return;
      }
      const next = { client, entry: matches[0], original };
      const replacement = next.replacement = function (event, ...args) {
        const enabled = binding === next && !scope.disposed && config.showDeleted === true;
        const before = enabled && Array.isArray(controller.messageList) && event &&
          controller.messageList.find(message => message.time === event.messageTime && message.user === event.userId);
        const previous = before && retained.get(before);
        const unchanged = !previous || ownsMessage(before, previous);
        if (previous && !unchanged) retained.delete(before);
        const eligible = before && before.type === 1 && before.status === 'NORMAL' && unchanged &&
          typeof event.blindType === 'string' && event.blindType.length > 0 && event.blindType.length <= 80 &&
          !['CANCEL', 'NORMAL', 'CBOTBLIND'].includes(event.blindType);
        const result = original.call(this, event, ...args);
        if (!eligible || binding !== next || scope.disposed || config.showDeleted !== true || result?.then) { paint(); return result; }
        const index = controller.messageList.findIndex(message => message.time === before.time && message.user === before.user);
        const after = controller.messageList[index];
        if (after && after !== before && after.key === before.key && after.type === 1 &&
          after.status === event.blindType && after.content === before.content) {
          const visible = { ...after, status: 'NORMAL' };
          retained.delete(before);
          retained.set(visible, { status: after.status, content: before.content, key: before.key, user: before.user, time: before.time });
          controller.messageList[index] = visible; controller.notiUpdateMessageList();
        }
        paint(); return result;
      };
      next.entry.listener = replacement; controller.notiBlindListener = replacement; binding = next;
      paint(); runtime.setStatus('deletedChat', 'ready');
    };
    return { sync, paint, dispose };
  };
  const attachChat = (container, isLive, scope) => {
    if (!container) return;
    timestamps(container, isLive, scope);
    if (chats.has(container)) { chats.get(container).find(); return; }
    resizeChat(isLive ? container : container.closest('aside') || container.parentElement, scope);
    const record = { timer: null, restore: null, controller: null, replacement: null, deleted: null };
    const reportControllerStatus = () => {
      runtime.setStatus('donationChat', config.hideDonation ? 'ready' : 'disabled');
      record.deleted?.sync();
    };
    let attempts = 0;
    const findController = () => {
      if (scope.disposed || !container.isConnected) return;
      const controller = stateOf(container, value => typeof value.messageFilter === 'function');
      if (controller === record.controller && controller?.messageFilter === record.replacement) { reportControllerStatus(); return; }
      record.deleted?.dispose(); record.deleted = null;
      record.restore?.(); record.restore = null; record.controller = null;
      if (!controller) {
        if (record.timer) return;
        if (++attempts < 20) record.timer = scope.timeout(() => { record.timer = null; findController(); }, 100);
        else {
          runtime.setStatus('donationChat', config.hideDonation ? 'limited' : 'disabled', config.hideDonation ? 'chat-controller-unavailable' : '');
          runtime.setStatus('deletedChat', config.showDeleted ? 'limited' : 'disabled', config.showDeleted ? 'chat-controller-unavailable' : '');
        }
        return;
      }
      const original = controller.messageFilter;
      const replacement = function (message) {
        return original.call(this, message) && !(config.hideDonation === true && message?.type === 10);
      };
      controller.messageFilter = replacement;
      record.controller = controller; record.replacement = replacement;
      record.restore = () => { if (controller.messageFilter === replacement) controller.messageFilter = original; };
      record.deleted = bindDeletedChat(controller, container, isLive, scope);
      reportControllerStatus();
    };
    record.find = findController; chats.set(container, record);
    // One disposer per chat root; replaced controller managers are released
    // immediately instead of retained by a new scope callback each time.
    scope.add(() => { record.deleted?.dispose(); record.restore?.(); });
    scope.observe(new MutationObserver(mutations => {
      timestamps(container, isLive, scope);
      record.deleted?.paint();
      if (mutations.some(mutation => [...mutation.addedNodes, ...mutation.removedNodes].some(node => node.nodeType === 1 && !node.closest?.('.knife-owned')))) {
        attempts = 0; findController();
      }
    }), container, { childList: true, subtree: true });
    findController();
  };
  const bindSidebar = (node, scope) => {
    if (!node) return;
    if (sidebar === node) { sidebarRecord.sync(); return; }
    sidebar = node;
    const record = sidebarRecord = { timer: null, expanded: new WeakSet(), suspended: false };
    // Native sections arrive independently. Never identify a hiding target by
    // its position: cold loading may contain only the general menu and services.
    const sectionAttribute = 'data-knife-sidebar-section';
    const sectionMarkers = new Map();
    const releaseSection = section => {
      if (section.getAttribute(sectionAttribute) === sectionMarkers.get(section)) section.removeAttribute(sectionAttribute);
      sectionMarkers.delete(section);
    };
    const sectionKind = section => {
      const label = section.getAttribute('aria-label');
      if (label === '팔로우') return null;
      if (label === '인기 카테고리') return 'popular';
      const header = section.querySelector(':scope > [class^="_header_"]');
      const title = header?.querySelector(':scope > strong[class^="_title_"]');
      const text = [...(title?.childNodes || [])].filter(child => child.nodeType === 3)
        .map(child => child.textContent).join('').trim().replace(/\s+/g, ' ');
      if (text === '팔로잉 채널') return null;
      if (text === '인기 카테고리') return 'popular';
      if (['다가오는 방송 일정', '방송일정'].includes(text)) return 'schedule';
      if (text === '파트너 스트리머') return 'partner';
      if (text === '서비스 바로가기') return 'shortcut';
      if (text) return null;
      // Compact services remove their header entirely; the direct public
      // service-link signature remains even on a cold compact render.
      const links = root => [...(root?.querySelectorAll('a[href]') || [])].flatMap(anchor => {
        try { return [new URL(anchor.getAttribute('href'), location.href)]; } catch { return []; }
      });
      if (links(header).some(url => url.origin === location.origin && url.pathname === '/partner')) return 'partner';
      const services = links(section.querySelector(':scope > ul'))
        .filter(url => url.origin === 'https://game.naver.com');
      if (services.some(url => url.pathname === '/') && services.some(url => url.pathname === '/esports')) return 'shortcut';
      return null;
    };
    const syncSections = () => {
      const sections = new Set([...node.querySelectorAll('nav[class^="_section_"]')]
        .filter(section => !section.parentElement.closest('nav')));
      for (const section of sectionMarkers.keys()) if (!sections.has(section)) releaseSection(section);
      for (const section of sections) {
        const current = section.getAttribute(sectionAttribute);
        if (sectionMarkers.has(section) && current !== sectionMarkers.get(section)) {
          sectionMarkers.delete(section); continue; // Another writer owns this value now.
        }
        if (!sectionMarkers.has(section) && current !== null) continue;
        const kind = sectionKind(section);
        if (!kind) { if (sectionMarkers.has(section)) releaseSection(section); continue; }
        if (current !== kind) section.setAttribute(sectionAttribute, kind);
        sectionMarkers.set(section, kind);
      }
    };
    scope.add(() => { for (const section of sectionMarkers.keys()) releaseSection(section); });
    const followingSection = () => [...node.querySelectorAll('nav')].find(section =>
      /^(팔로잉 채널|Following channels)$/i.test(section.querySelector('[class*="_title_"], [class^="navigation_bar_title__"]')?.textContent.trim() || ''));
    const refreshControl = () => followingSection()?.querySelector('button[aria-label="새로고침"], button[aria-label="Refresh"]');
    const stopRefresh = () => { clearInterval(record.timer); record.timer = null; };
    const refresh = () => {
      if (scope.disposed || record.suspended || document.hidden || !node.isConnected || config.updateSidebar !== true) return;
      const button = refreshControl();
      if (button && !button.disabled) button.click();
    };
    record.sync = () => {
      if (scope.disposed || !node.isConnected) { stopRefresh(); return; }
      syncSections();
      const button = refreshControl();
      if (config.updateSidebar === true && button) {
        if (record.timer == null && !record.suspended) record.timer = scope.interval(refresh, 30000);
        runtime.setStatus('sidebarRefresh', 'ready');
      } else {
        stopRefresh();
        runtime.setStatus('sidebarRefresh', config.updateSidebar ? 'limited' : 'disabled', config.updateSidebar ? 'following-control-unavailable' : '');
      }
      if (config.expandFollowings !== true) {
        record.expanded = new WeakSet(); runtime.setStatus('expandFollowings', 'disabled'); return;
      }
      const more = followingSection()?.querySelector('button[class*="_more_button_"], button[class^="navigation_bar_more_button__"]');
      if (!more || !['true', 'false'].includes(more.getAttribute('aria-expanded'))) {
        runtime.setStatus('expandFollowings', 'limited', 'following-control-unavailable'); return;
      }
      if (more.getAttribute('aria-expanded') === 'false' && !more.disabled && !record.expanded.has(more)) {
        record.expanded.add(more); more.click();
      }
      runtime.setStatus('expandFollowings', record.expanded.has(more) || more.getAttribute('aria-expanded') === 'true' ? 'ready' : 'pending');
    };
    scope.add(stopRefresh);
    scope.on(window, 'pagehide', () => { record.suspended = true; stopRefresh(); });
    scope.on(window, 'pageshow', () => { record.suspended = false; record.sync(); });
    const attach = anchor => {
      const url = liveURL(anchor.href);
      if (!url || anchors.has(anchor)) return;
      anchors.add(anchor); anchor.draggable = true;
      scope.on(anchor, 'mouseenter', () => { if (config.preview === true) runtime.preview?.show(anchor.href, anchor, true); });
      scope.on(anchor, 'mouseleave', () => runtime.preview?.hide(anchor.href));
      scope.on(anchor, 'dragstart', event => {
        if (!config.popupPlayer || !event.dataTransfer || !liveURL(anchor.href)) return;
        event.stopPropagation(); event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('knife-data', anchor.href);
      });
    };
    node.querySelectorAll('a[href]').forEach(attach);
    scope.observe(new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'href' && mutation.target.matches('a[href]')) attach(mutation.target);
        for (const added of mutation.addedNodes) {
          if (added.nodeType !== 1) continue;
          if (added.matches('a[href]')) attach(added);
          added.querySelectorAll('a[href]').forEach(attach);
        }
      }
      record.sync();
    }), node, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-expanded', 'disabled', 'aria-label', 'href', 'class'] });
    record.sync();
  };
  const channelButton = (state, scope) => {
    if (state.route.kind !== 'channel' || !state.body) return;
    const list = state.body.querySelector('[role="tablist"], [class*="channel_area__"]');
    if (!list || list.querySelector('.knife-channel-chat')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = (list.lastElementChild?.className || '') + ' knife-channel-chat knife-owned';
    button.textContent = '↗ ' + (i18n.chat || 'Chat');
    scope.on(button, 'click', () => { location.href = '/live/' + state.route.id; });
    list.append(button); scope.add(() => button.remove());
  };
  const bindStartTimes = (body, scope) => {
    const pending = new WeakMap();
    const annotations = new WeakMap();
    const liveCount = 'main [class*="_data_"] > strong[class*="_count_"]';
    const vodDate = '[class*="_area_"] > [class*="_information_"] > span[class*="_item_"]:last-child';
    scope.on(body, 'mouseover', async event => {
      const node = event.target.closest?.('[class^="video_information_count__"], span[class^="video_card_item__"], ' + liveCount + ', ' + vodDate);
      if (!node || node.contains(event.relatedTarget)) return;
      const currentLiveCount = node.matches(liveCount);
      if (currentLiveCount && runtime.state.route.kind !== 'live') return;
      const annotate = (date, id = null) => {
        if (scope.disposed || !node.isConnected || typeof date !== 'string' || !date.trim()) return;
        let record = annotations.get(node);
        if (node.dataset.knifeTooltip && node.dataset.knifeTooltip !== record?.text) return;
        const text = (i18n.liveStart || 'Live start') + ': ' + date;
        if (!record) {
          record = {}; annotations.set(node, record);
          scope.add(() => { if (node.dataset.knifeTooltip === record.text) delete node.dataset.knifeTooltip; });
        }
        record.id = id; record.text = text;
        node.dataset.knifeTooltip = text;
        runtime.setStatus('startTime', 'ready');
      };
      if (node.className.startsWith('video_information_count__') || currentLiveCount) {
        if (node.dataset.knifeTooltip) return;
        const detail = stateOf(node, value => Array.isArray(value) && typeof value[0]?.openDate === 'string');
        if (detail) annotate(detail[0].openDate);
        else runtime.setStatus('startTime', 'limited', 'start-metadata-unavailable');
        return;
      }
      if (node.nextElementSibling) return;
      const link = node.parentElement?.parentElement?.querySelector('a[href]');
      let url;
      try { url = new URL(link?.href); } catch { /* Invalid links retire only our old annotation/request. */ }
      const match = url?.origin === location.origin && url.pathname.match(/^\/video\/(\d+)\/?$/);
      const record = annotations.get(node);
      if (record && record.id !== match?.[1] && node.dataset.knifeTooltip === record.text) delete node.dataset.knifeTooltip;
      const waiting = pending.get(node);
      if (waiting && waiting.id !== match?.[1]) {
        waiting.abort(); clearTimeout(waiting.timeout); pending.delete(node);
      }
      if (!match || node.dataset.knifeTooltip || pending.has(node)) return;
      const cached = videoMetadata.get(match[1]);
      if (cached && cached.expires > Date.now()) { annotate(cached.date, match[1]); return; }
      const controller = new AbortController(); const abort = scope.add(() => controller.abort());
      const timeout = setTimeout(abort, 5000);
      const request = { id: match[1], abort, timeout }; pending.set(node, request);
      try {
        const response = await fetch('https://api.chzzk.naver.com/service/v3/videos/' + match[1], { credentials: 'include', signal: controller.signal });
        if (!response.ok) throw new Error('metadata-unavailable');
        const info = await response.json();
        if (scope.disposed || !node.isConnected || link.href !== url.href || pending.get(node) !== request) return;
        if (info.code !== 200 || typeof info.content?.liveOpenDate !== 'string') throw new Error('metadata-unavailable');
        videoMetadata.delete(match[1]); videoMetadata.set(match[1], { date: info.content.liveOpenDate, expires: Date.now() + 1800000 });
        while (videoMetadata.size > 100) videoMetadata.delete(videoMetadata.keys().next().value);
        annotate(info.content.liveOpenDate, match[1]);
      } catch { if (!scope.disposed && pending.get(node) === request) runtime.setStatus('startTime', 'limited', 'start-metadata-unavailable'); }
      finally { clearTimeout(timeout); if (pending.get(node) === request) pending.delete(node); }
    });
  };
  runtime.subscribe(state => {
    config = runtime.config; i18n = runtime.i18n;
    for (const [node, scope] of popups) if (!node.isConnected) scope.dispose();
    if (!runtime.configReady || state.route.kind === 'excluded') {
      owner?.dispose(); owner = null; sidebar = null;
      if (state.route.kind === 'excluded') for (const scope of popups.values()) scope.dispose();
      return;
    }
    if (!owner || ownerGeneration !== runtime.generation) {
      owner?.dispose(); owner = runtime.createScope(); ownerGeneration = runtime.generation;
      chats = new WeakMap(); anchors = new WeakSet(); timestampRoots = new WeakSet(); sidebar = null;
      if (state.body) {
        // CSS cannot identify a SPA route from the document URL. Mark only
        // the exact home content root; never classify the native subtree as owned.
        if (state.route.path === '/') {
          const body = state.body; body.dataset.knifeHome = '1';
          owner.add(() => { if (body.dataset.knifeHome === '1') delete body.dataset.knifeHome; });
        }
        bindStartTimes(state.body, owner);
        owner.on(state.body, 'drop', event => {
          const href = event.dataTransfer?.getData('knife-data');
          if (!config.popupPlayer || !liveURL(href)) return;
          event.preventDefault(); state.body.append(createPopupPlayer(href, event.pageX - 320, event.pageY - 12));
        });
        owner.on(state.body, 'dragover', event => { if (config.popupPlayer && event.dataTransfer?.types.includes('knife-data')) event.preventDefault(); });
      }
    }
    bindSidebar(state.sidebar, owner);
    channelButton(state, owner);
    if (['live','vod'].includes(state.route.kind) && state.body) {
      const chat = state.body.querySelector('[class^="vod_chatting_container__"]') || state.body.querySelector('aside:not([aria-label])');
      attachChat(chat, state.route.kind === 'live', owner);
    }
    const banner = state.body?.querySelector('[class^="band_banner_container__"]');
    if (banner && !banner.querySelector('button')) {
      const close = runtime.adapter.fiberOf(banner)?.return?.memoizedProps?.closeHandler;
      if (typeof close === 'function') {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'knife-owned'; button.textContent = '×';
        owner.on(button, 'click', close); banner.append(button); owner.add(() => button.remove());
      }
    }
  });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) { owner?.dispose(); for (const scope of popups.values()) scope.dispose(); }
  });
})();
