(() => {
  const getReactFiber = (node) => {
    if (node == null) {
      return;
    }
    return Object.entries(node).find(([k]) =>
      k.startsWith("__reactFiber$")
    )?.[1];
  };

  const getReactProps = (node) => {
    if (node == null) {
      return;
    }
    return Object.entries(node).find(([k]) =>
      k.startsWith("__reactProps$")
    )?.[1];
  };

  const findReactState = async (node, criteria, raw = false, tries = 0) => {
    if (node == null) {
      return;
    }
    let fiber = getReactFiber(node);
    if (fiber == null) {
      if (tries > 500) {
        return;
      }
      return new Promise((r) => setTimeout(r, 50)).then(() =>
        findReactState(node, criteria, raw, tries + 1)
      );
    }
    fiber = fiber.return;
    while (fiber != null) {
      let state = fiber.memoizedState;
      while (state != null) {
        let value = state.memoizedState;
        if (state.queue?.pending?.hasEagerState) {
          value = state.queue.pending.eagerState;
        } else if (state.baseQueue?.hasEagerState) {
          value = state.baseQueue.eagerState;
        }
        if (value != null && criteria(value)) {
          return raw ? state : value;
        }
        state = state.next;
      }
      fiber = fiber.return;
    }
  };

  const findReactContext = async (node, criteria, tries = 0) => {
    if (node == null) {
      return;
    }
    let fiber = getReactFiber(node);
    if (fiber == null) {
      if (tries > 500) {
        return;
      }
      return new Promise((r) => setTimeout(r, 50)).then(() =>
        findReactContext(node, criteria, tries + 1)
      );
    }
    fiber = fiber.return;
    while (fiber != null) {
      let context = fiber.dependencies?.firstContext;
      while (context != null) {
        if (context.memoizedValue != null && criteria(context.memoizedValue)) {
          return context.memoizedValue;
        }
        context = context.next;
      }
      fiber = fiber.return;
    }
  };

  const log = (...args) => console.info("[치즈 나이프]", ...args);

  // 치지직이 webpack 에서 Vite(rolldown, ES 모듈)로 바뀌어 webpackChunk 전역이 사라졌다.
  // 페이지가 이미 불러온 청크를 같은 주소로 import() 하면 같은 모듈 인스턴스를 받는다.
  const findChunkUrl = (name) => {
    const re = new RegExp(`/${name}-[\\w-]+\\.js(\\?.*)?$`);
    const urls = [
      ...Array.from(
        document.querySelectorAll("script[src], link[href]"),
        (e) => e.src || e.href
      ),
      ...performance.getEntriesByType("resource").map((e) => e.name),
    ];
    return urls.find((u) => re.test(u));
  };

  let playerModulePromise;
  const loadPlayerModule = async () => {
    const url = findChunkUrl("player-vendor");
    if (url == null) {
      log("player-vendor 청크를 찾지 못함");
      return;
    }
    const mod = await import(url);
    for (const value of Object.values(mod)) {
      // rolldown 의 CommonJS 지연 초기화 래퍼(() => module.exports)만 호출한다
      if (
        typeof value !== "function" ||
        value.length !== 0 ||
        !Function.prototype.toString.call(value).includes("exports")
      ) {
        continue;
      }
      try {
        const exports = value();
        const player = exports?.CorePlayer ? exports : exports?.default;
        if (player?.CorePlayer != null && player?.LiveProvider != null) {
          return player;
        }
      } catch { }
    }
    log("CorePlayer 모듈을 찾지 못함");
  };
  // 실패는 기억하지 않는다. 청크가 늦게 불러와지면 다음 호출에서 다시 찾는다.
  const getPlayerModule = () =>
    (playerModulePromise ||= loadPlayerModule()
      .catch((e) => log("플레이어 모듈 불러오기 실패", e))
      .then((player) => {
        if (player == null) {
          playerModulePromise = null;
        }
        return player;
      }));

  // React 18 운영 빌드의 엘리먼트 객체 (jsx 런타임을 찾지 않고 직접 만든다)
  const createReactElement = (type, props) => ({
    $$typeof: Symbol.for("react.element"),
    type,
    key: null,
    ref: null,
    props,
    _owner: null,
    _store: {},
  });

  // 요소가 나타날 때마다 한 번씩 콜백을 부른다. 치지직은 SPA 라 화면 이동마다 새 요소가 생긴다.
  const watchers = [];
  const scanWatchers = () => {
    for (const { selector, seen, callback } of watchers) {
      for (const node of document.querySelectorAll(selector)) {
        if (seen.has(node)) {
          continue;
        }
        seen.add(node);
        try {
          callback(node);
        } catch (e) {
          log(`${selector} 초기화 실패`, e);
        }
      }
    }
  };
  let scanQueued = false;
  new MutationObserver(() => {
    if (scanQueued) {
      return;
    }
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scanWatchers();
    });
  }).observe(document.body, { childList: true, subtree: true });
  const onElement = (selector, callback) => {
    watchers.push({ selector, seen: new WeakSet(), callback });
    scanWatchers();
  };

  const i18n = JSON.parse(
    document.getElementById("knife-i18n")?.textContent || "{}"
  );

  let isPopup = false;
  try {
    if (
      window.top !== window &&
      window.top.location.hostname === "chzzk.naver.com"
    ) {
      isPopup = true;
    }
  } catch { }

  let first = true;
  let config = {};
  const initConfig = (c) => {
    config = c;
    if (first) {
      first = false;
      expandFollowings(document.getElementById("sidebar"));
      if (c.compressorDefault) {
        compressor.setEnabled(true);
      }
    }

    compressor.setParams(c);
  };

  window.addEventListener("message", (e) => {
    switch (e.data.type) {
      case "config":
        initConfig(e.data.config);
        break;
    }
  });
  window.postMessage({ type: "getConfig" }, location.origin);

  const root = document.getElementById("root");
  const waiting = [];
  const rootObserver = new MutationObserver((mutations) => {
    if (!waiting.length) {
      return;
    }
    for (const mutation of mutations) {
      for (const n of mutation.addedNodes) {
        if (n.querySelector == null) {
          continue;
        }
        for (const elem of waiting) {
          const node =
            (n.matches(elem.query) && n) || n.querySelector(elem.query);
          if (node != null) {
            elem.resolve(node);
          }
        }
      }
    }
  });
  const waitFor = (query) => {
    const node = root.querySelector(query);
    if (node) {
      return Promise.resolve(node);
    }
    return Promise.race([
      new Promise((resolve) => {
        waiting.push({ query, resolve });
      }),
      new Promise((resolve) => {
        setTimeout(resolve, 10000);
      }),
    ]);
  };
  rootObserver.observe(root, { childList: true, subtree: true });

  const liveInfo = {};
  let pendingPreview;
  let currentPreview;
  // 사이드바 툴팁은 마우스가 항목을 벗어나는 순간 사라진다. 미리보기로 마우스를 옮기는 동안
  // 빈틈을 지나가도 닫히지 않게 잠시 기다렸다가 숨기고, 미리보기 위에 있으면 계속 띄워 둔다.
  const PREVIEW_HIDE_DELAY = 300;
  let previewHovered = false;
  let hidePreviewTimer;
  const cancelHidePreview = () => {
    clearTimeout(hidePreviewTimer);
    hidePreviewTimer = null;
  };
  const hidePreviewLater = (href) => {
    cancelHidePreview();
    hidePreviewTimer = setTimeout(() => {
      hidePreviewTimer = null;
      if (!previewHovered) {
        hidePreview(href);
      }
    }, PREVIEW_HIDE_DELAY);
  };
  let preview;
  let previewPlayer;
  let previewThumbnail;
  let previewUptime;
  let previewProgress;
  let previewInterval;
  let previewAnimation;
  const playPreview = () => {
    previewPlayer.play().catch((e) => {
      if (e.name !== "AbortError") {
        previewPlayer.muted = true;
        previewPlayer.play();
      }
    });
  };

  const showPreview = async (href, node, tooltip) => {
    const url = new URL(href);
    const parts = url.pathname.split("/");
    if (parts.length < 3 || parts[1] !== "live") {
      return;
    }
    const uid = parts[2];
    if (
      currentPreview === uid &&
      preview != null &&
      preview.style.display !== "none"
    ) {
      cancelHidePreview();
      return;
    }
    pendingPreview = uid;
    let info = liveInfo[uid];
    if (info === undefined) {
      const res = await fetch(
        `https://api.chzzk.naver.com/service/v3.3/channels/${uid}/live-detail`,
        { credentials: "include" }
      );
      if (!res.ok) {
        return;
      }
      const live = await res.json();
      if (live.code !== 200) {
        return;
      }
      info = live.content;
      try {
        info.livePlayback = JSON.parse(info.livePlaybackJson);
      } catch { }
      liveInfo[uid] = info;
    }
    if (info == null) {
      return;
    }

    const rect = node.getBoundingClientRect();
    if (!rect.width) {
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const width = Math.max(config.previewWidth, rect.width);

    const Player = await getPlayerModule();
    if (pendingPreview !== uid) {
      // 기다리는 동안 마우스가 떠났거나 다른 채널로 옮겨 갔다
      return;
    }

    hidePreview();
    currentPreview = uid;
    if (preview == null) {
      preview = document.createElement("div");
      preview.classList.add("knife-preview");
      document.body.appendChild(preview);
      preview.addEventListener("mouseenter", () => {
        previewHovered = true;
        cancelHidePreview();
      });
      preview.addEventListener("mouseleave", () => {
        previewHovered = false;
        hidePreviewLater();
      });
      // 미리보기를 누르면 그 방송으로 간다
      preview.addEventListener("click", () => {
        if (currentPreview == null) {
          return;
        }
        const href = `/live/${currentPreview}`;
        hidePreview();
        if (routeNavigator != null) {
          routeNavigator.push(href);
        } else {
          location.href = href;
        }
      });

      previewThumbnail = document.createElement("img");
      preview.appendChild(previewThumbnail);

      const playerContainer = document.createElement("div");
      playerContainer.classList.add("knife-preview-player");
      preview.appendChild(playerContainer);

      if (Player?.CorePlayer != null) {
        previewPlayer = new Player.CorePlayer();
        playerContainer.appendChild(previewPlayer.shadowRoot);
      }

      previewUptime = document.createElement("div");
      previewUptime.classList.add("knife-preview-uptime");
      preview.appendChild(previewUptime);

      previewProgress = document.createElement("div");
      previewProgress.classList.add("knife-preview-progress");
      preview.appendChild(previewProgress);
    }

    let left;
    let right;
    let top;
    preview.classList.toggle("knife-preview-interactive", !!tooltip);
    if (tooltip) {
      preview.style.position = "fixed";
      preview.style.marginTop = "0.25rem";
      if (parseInt(getComputedStyle(node).getPropertyValue("left")) < 0) {
        right = rootRect.width - rect.right + 5;
      } else {
        left = rect.left + 5;
      }
      top = rect.bottom;
    } else {
      const height = (width * 9) / 16;
      preview.style.position = "absolute";
      preview.style.marginTop = "";
      left = Math.max(
        Math.min(
          rect.left + rect.width / 2 - width / 2 - rootRect.left,
          rootRect.right - width - 16
        ),
        16
      );
      top = rect.top + rect.height / 2 - height / 2 - rootRect.top;
    }
    preview.style.display = "";
    preview.style.width = `${width}px`;
    if (right) {
      preview.style.left = "";
      preview.style.right = `${Math.round(right)}px`;
    } else {
      preview.style.left = `${Math.round(left)}px`;
      preview.style.right = "";
    }
    preview.style.top = `${Math.round(top)}px`;

    previewThumbnail.src = (
      info.liveImageUrl ||
      info.livePlayback?.thumbnail?.snapshotThumbnailTemplate ||
      (info.adult
        ? "https://ssl.pstatic.net/static/nng/glive/image/age_restriction_large_dark.png"
        : "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==")
    ).replace("{type}", 480);

    if (previewPlayer != null) {
      previewPlayer.shadowRoot.style.visibility = "hidden";
      previewPlayer.volume = config.previewVolume / 100;
    }

    const previewAvailable =
      previewPlayer != null && info.livePlayback != null && config.livePreview;
    const openDate = info.openDate
      ? new Date(`${info.openDate}+0900`).getTime()
      : 0;
    const delay = Math.floor(config.previewDelay * 10);
    let step = 0;
    previewInterval = setInterval(() => {
      if (step % 10 === 0 && openDate) {
        previewUptime.textContent = formatTimestamp(Date.now() - openDate);
      }
      if (previewAvailable) {
        if (step === Math.max(0, delay - 9)) {
          previewPlayer.srcObject = Player.LiveProvider.fromJSON(
            info.livePlayback,
            {
              devt: "HTML5_PC",
              serviceId: 2099,
              countryCode: "kr",
              p2pDisabled: true,
              maxLevel: 480,
            }
          );
        }
        if (step === delay - 1) {
          previewProgress.style.display = "none";
          previewPlayer.shadowRoot.style.visibility = "";
          if (previewPlayer.readyState) {
            playPreview();
          } else {
            previewPlayer.addEventListener("loadedmetadata", playPreview);
          }
        }
      }
      step++;
    }, 100);

    if (!previewAvailable) {
      return;
    }
    let start;
    const progress = (timestamp) => {
      if (start == null) {
        start = timestamp;
        previewProgress.style.display = "";
      }
      const p = (timestamp - start) / delay;
      previewProgress.style.width = `${p}%`;
      if (p < 100) {
        previewAnimation = requestAnimationFrame(progress);
      }
    };
    previewAnimation = requestAnimationFrame(progress);
  };

  const hidePreview = (href) => {
    if (href != null) {
      const url = new URL(href);
      const parts = url.pathname.split("/");
      if (parts.length < 3 || parts[1] !== "live") {
        return;
      }
      const uid = parts[2];
      if (pendingPreview === uid) {
        pendingPreview = null;
      }
      if (currentPreview !== uid) {
        return;
      }
    } else {
      pendingPreview = null;
    }
    if (preview == null) {
      return;
    }
    cancelHidePreview();
    previewHovered = false;
    currentPreview = null;

    clearInterval(previewInterval);
    cancelAnimationFrame(previewAnimation);
    if (previewPlayer != null) {
      previewPlayer.removeEventListener("loadedmetadata", playPreview);
      previewPlayer.src = "";
    }
    preview.style.display = "none";
    previewThumbnail.src = "";
    previewUptime.textContent = "";
    previewProgress.style.display = "none";
  };

  const toggleMute = async (e) => {
    e.preventDefault();
    const player = e.currentTarget.querySelector("video");
    if (player != null) {
      player.volume = config.previewVolume / 100;
      player.muted = !player.muted;
    }
  };
  const addUnmuteListener = (node) => {
    const url = new URL(node.href);
    const parts = url.pathname.split("/");
    if (parts.length < 3 || parts[1] !== "live") {
      return;
    }
    node.addEventListener("contextmenu", toggleMute);
    node.title = "음소거를 해제하려면 우클릭하세요.";
  };
  const removeUnmuteListener = (node) => {
    node.removeEventListener("contextmenu", toggleMute);
    node.title = "";
  };

  const numberFormatter = new Intl.NumberFormat("ko-KR");
  const padNumber = (n, len) => n.toString().padStart(len, "0");
  const hasGeneratedClass = (node, prefix) =>
    String(node?.className || "")
      .split(/\s+/)
      .some((name) => name.startsWith(`_${prefix}_`));
  const formatTimestamp = (t) => {
    t = Math.floor(t / 1000);
    const h = Math.floor(t / 3600);
    const m = Math.floor(t / 60) % 60;
    const s = t % 60;
    return h
      ? `${h}:${padNumber(m, 2)}:${padNumber(s, 2)}`
      : `${m}:${padNumber(s, 2)}`;
  };

  let zIndex = 1000;
  const createPopupPlayer = (url, left, top) => {
    const popup = document.createElement("div");
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
    dragArea.addEventListener("mousedown", (e) => {
      e.preventDefault();
      popup.style.zIndex = `${zIndex++}`;
      x = e.clientX;
      y = e.clientY;

      const onMouseMove = (e) => {
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
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    const button = document.createElement("button");
    button.classList.add("knife-popup-close-button");
    button.title = i18n.close;
    button.textContent = "X";
    button.addEventListener("click", () => {
      player.src = "about:blank";
      popup.remove();
    });
    popup.appendChild(button);

    return popup;
  };

  let routeNavigator;
  const attachLayoutObserver = async () => {
    const init = (node) => {
      const banner = node.className.startsWith("band_banner_container__")
        ? node
        : node.querySelector('[class^="band_banner_container__"]');
      if (banner && !banner.querySelector("button") && getReactFiber(banner)) {
        const button = document.createElement("button");
        button.classList.add("band_banner_button__ozNIO");
        button.innerHTML = `<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 10L20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M20.0001 10L10.0001 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg><span class="blind">닫기</span>`;
        button.addEventListener(
          "click",
          getReactFiber(banner).return.memoizedProps.closeHandler
        );
        banner.appendChild(button);
      }
    };
    const layoutWrap = await waitFor(
      '[class*="_glive_"], [class^="layout_glive__"]'
    );
    if (layoutWrap == null) {
      return;
    }

    const layoutObserver = new MutationObserver((mutations) => {
      hidePreview();
      for (const mutation of mutations) {
        for (const n of mutation.addedNodes) {
          if (n.querySelector != null) {
            init(n);
          }
        }
      }
    });
    layoutObserver.observe(layoutWrap, { childList: true });

    init(layoutWrap);

    try {
      routeNavigator = (
        await findReactContext(
          layoutWrap,
          (context) => context.navigator != null
        )
      )?.navigator;
    } catch { }

    const offset = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue("--knife-top-offset");
    if (offset) {
      try {
        const topOffset = await findReactState(
          layoutWrap,
          (state) => state.length === 3 && typeof state[0] === "number"
        );
        topOffset?.[1].set(topOffset[2], parseInt(offset));
      } catch { }
    }
  };

  const initSidebarFeatures = (sidebar) => {
    if (sidebar == null) {
      return;
    }
    const addListeners = (item) => {
      if (!item.href || typeof item.href !== "string") {
        return;
      }
      const url = new URL(item.href);
      if (url.hostname !== "chzzk.naver.com") {
        return;
      }
      item.draggable = true;
      item.addEventListener("dragstart", (e) => {
        if (!config.popupPlayer) {
          return;
        }
        e.stopPropagation();
        document.body.classList.add("knife-dragging");
        item.style.opacity = "0.8";

        const rect = item.getBoundingClientRect();
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setDragImage(
          (item.className.startsWith("navigator_item_link__") || item.className.includes("_item_link_"))
            ? item.parentElement
            : item,
          e.clientX - rect.x,
          e.clientY - rect.y
        );
        e.dataTransfer.setData("knife-data", item.href);
      });
      item.addEventListener("dragend", () => {
        item.style.opacity = "";
        document.body.classList.remove("knife-dragging");
      });

      if (item.className.startsWith("navigator_group__")) {
        item.addEventListener("mouseenter", () => {
          if (config.preview) {
            showPreview(item.href, item.parentNode.parentNode, true);
          }
        });
        item.addEventListener("mouseleave", () => {
          hidePreview(item.href);
        });
      }
    };

    const items = sidebar.querySelectorAll("a");
    for (const item of items) {
      addListeners(item);
    }

    const getHref = (el) =>
      el.tagName === "A"
        ? el.href
        : (el.querySelector('a[class^="navigator_item_link__"]') || el.querySelector('a[class*="_item_link_"]'))?.href;

    const sidebarObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const n of mutation.addedNodes) {
          if (n.querySelectorAll == null) {
            continue;
          }
          const items = n.tagName === "A" ? [n] : n.querySelectorAll("a");
          for (const item of items) {
            addListeners(item);
          }

          if (n.className.startsWith?.("navigator_tooltip__") || (n.className.includes?.("_tooltip_") && !n.className.includes?.("_tooltip_inner_"))) {
            const href = getHref(mutation.target);
            if (config.preview && href) {
              showPreview(href, n, true);
            }
          }
        }
        for (const n of mutation.removedNodes) {
          if (n.className?.startsWith?.("navigator_tooltip__") || (n.className?.includes?.("_tooltip_") && !n.className?.includes?.("_tooltip_inner_"))) {
            const href = getHref(mutation.target);
            if (href) {
              hidePreviewLater(href);
            }
          }
        }
      }
    });
    sidebarObserver.observe(sidebar, {
      childList: true,
      subtree: true,
    });
  };

  // 팔로잉 목록은 useEffect(() => { fetchFollowings() }, [atom, fetchFollowings]) 로 불러온다.
  // 첫 팔로잉 항목에서 위로 올라가며 그 effect 를 찾아 create() 를 다시 부르면 목록만 새로 받는다.
  const AsyncFunction = (async () => { }).constructor;
  const isFollowingsEffect = (state) =>
    (state.tag & 8) !== 0 &&
    state.destroy == null &&
    state.deps?.length === 2 &&
    typeof state.deps[0] !== "string" &&
    state.deps[1] instanceof AsyncFunction;

  // 팔로잉 목록 아래 "더보기" 를 한 번 누른다. 목록은 비동기로 채워지므로 잠시 기다린다.
  const expandedSidebars = new WeakSet();
  const expandFollowings = async (sidebar) => {
    if (
      !config.expandFollowings ||
      sidebar == null ||
      expandedSidebars.has(sidebar)
    ) {
      return;
    }
    expandedSidebars.add(sidebar);
    for (let i = 0; i < 50; i++) {
      let group = sidebar.querySelector('a[class*="_item_link_"]');
      while (
        group != null &&
        group !== sidebar &&
        !group.querySelector('[class*="_more_button_"]')
      ) {
        group = group.parentElement;
      }
      const buttons = group?.querySelectorAll('[class*="_more_button_"]');
      if (group !== sidebar && buttons?.length === 1) {
        if (buttons[0].ariaExpanded === "false") {
          buttons[0].click();
        }
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  let refreshInterval;
  const refreshSidebar = (sidebar) => {
    clearInterval(refreshInterval);
    refreshInterval = setInterval(async () => {
      if (!config.updateSidebar || document.visibilityState === "hidden") {
        return;
      }
      if (!sidebar.isConnected) {
        clearInterval(refreshInterval);
        return;
      }
      const item =
        sidebar.querySelector('a[class*="_item_link_"]') ||
        sidebar.querySelector('[class^="navigation_bar_header__"]')
          ?.parentNode ||
        sidebar.querySelector("nav");
      const sidebarEffect = await findReactState(item, isFollowingsEffect);
      if (sidebarEffect?.create == null) {
        log("사이드바 갱신 대상을 찾지 못함");
        return;
      }
      sidebarEffect.create();
    }, 30000);
  };

  onElement(
    '#sidebar, aside[aria-label="사이드바"], [class^="aside_content__"]',
    (sidebar) => {
      initSidebarFeatures(sidebar);
      refreshSidebar(sidebar);
      expandFollowings(sidebar);
      log("사이드바 연결");
    }
  );

  const attachBodyObserver = async () => {
    const init = async (node) => {
      if (node == null) {
        return;
      }
      hidePreview();
      const path = location.pathname;
      if (
        node.className.startsWith?.("live_") ||
        (path.startsWith("/live/") && node.querySelector("aside"))
      ) {
        return attachLiveObserver(node);
      } else if (
        node.className.startsWith?.("vod_") ||
        path.startsWith("/video/")
      ) {
        return attachVodObserver(node);
      } else if (node.className.startsWith?.("channel_") || path.split("/").length === 2) {
        return initChannelFeatures(node);
      }
    };

    const layoutBody = await waitFor("#layout-body");
    if (layoutBody == null) {
      return;
    }
    const layoutBodyObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const n of mutation.addedNodes) {
          if (n.querySelector != null) {
            init(n.tagName === "SECTION" ? n : n.querySelector("section"));
          }
        }
      }
    });
    layoutBodyObserver.observe(layoutBody, { childList: true });

    layoutBody.addEventListener("drop", (e) => {
      const url = e.dataTransfer.getData("knife-data");
      if (!url || !config.popupPlayer) {
        return;
      }
      e.preventDefault();
      layoutBody.appendChild(
        createPopupPlayer(url, e.pageX - 320, e.pageY - 12)
      );
    });
    layoutBody.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    await init(layoutBody.querySelector("section"));
  };

  const initChannelFeatures = async (node) => {
    const list = node.querySelector('[class*="channel_area__"]') || node.querySelector('[role="tablist"]');
    if (list == null) {
      return;
    }

    const live = document.createElement("button");
    live.type = "button";
    live.className = list.lastElementChild.className;
    live.textContent = `↗ ${i18n.chat}`;
    live.addEventListener("click", () => {
      const href = `/live/${location.pathname.split("/")[1]}`;
      if (routeNavigator != null) {
        routeNavigator.push(href);
      } else {
        location.href = href;
      }
    });
    list.appendChild(live);
  };

  const getCorePlayer = async () => {
    const node =
      document.getElementById("live_player_layout") ||
      document.getElementById("player_layout");
    const player = await findReactState(node, (s) => s._corePlayer != null);
    return player?._corePlayer;
  };

  let seeking = false;
  const addStatsMenu = () => {
    const license = document.getElementById("license");
    if (license == null) {
      return;
    }
    const stats = license.cloneNode(true);
    stats.id = "knife-stats";

    const link = stats.firstChild;
    if (link == null) {
      return;
    }
    link.href = "#";
    link.textContent = i18n.stats;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const overlay = document.createElement("div");
      overlay.classList.add("knife-stats-overlay");
      document.getElementById("live_player_layout").appendChild(overlay);

      const content = document.createElement("div");
      const update = async () => {
        const corePlayer = await getCorePlayer();
        let info;
        try {
          info = window.__getLiveInfo?.();
        } catch { }
        try {
          const selected = Array.from(corePlayer.videoTracks).find(
            (t) => t.selected
          );
          const tracks = corePlayer.srcObject.data?.media?.find(
            (m) => m.mediaId === "LLHLS"
          )?.encodingTrack;
          const track = tracks?.find(
            (t) => t.encodingTrackId === selected.label
          );
          if (info == null) {
            info = {
              resolution: selected.label,
              bitrate: selected.videoBitrate,
              fps: selected.videoFrameRate,
              latency: Math.floor(corePlayer.srcObject._getLiveLatency()),
            };
          }
          if (track?.avoidReencoding) {
            info.resolution += " (원본)";
          }
        } catch { }
        if (info == null) {
          return;
        }
        const codecs = corePlayer?._currentCodecs;
        content.innerText = `${i18n.resolution}: ${info.resolution}
${i18n.bitrate}: ${numberFormatter.format(info.bitrate)} kbps
${i18n.fps}: ${info.fps}
${i18n.latency}: ${numberFormatter.format(info.latency)} ms
${i18n.codec}: ${codecs ? `${codecs.video},${codecs.audio}` : i18n.unknown}`;
      };
      update();
      const updateInterval = setInterval(update, 1000);
      overlay.appendChild(content);

      const closeButton = document.createElement("button");
      closeButton.innerText = "X";
      closeButton.addEventListener("click", () => {
        clearInterval(updateInterval);
        overlay.remove();
      });
      overlay.appendChild(closeButton);
    });
    license.before(stats);
  };

  const attachPlayerObserver = async (node, isLive, tries = 0) => {
    if (node == null) {
      return;
    }
    const playerLayout = node.querySelector(
      isLive ? "#live_player_layout" : "#player_layout"
    );
    if (playerLayout == null) {
      if (tries > 500) {
        return;
      }
      return new Promise((r) => setTimeout(r, 50)).then(() =>
        attachPlayerObserver(node, isLive, tries + 1)
      );
    }
    const playerObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const n of mutation.addedNodes) {
          if (n.querySelector != null) {
            initPlayerFeatures(n, isLive);
          }
        }
      }
    });
    playerObserver.observe(playerLayout.parentNode, { childList: true });

    await initPlayerFeatures(playerLayout, isLive);
  };

  // 페이지 전체가 AudioContext 하나를 함께 쓴다. MediaElementSource 는 만든 컨텍스트에 묶이기 때문이다.
  let audioCtx;
  const getAudioContext = () => (audioCtx ||= new AudioContext());
  const mediaSources = new WeakMap();
  const resumeAudioOnGesture = () => {
    const ctx = getAudioContext();
    const resume = () => {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === "running") {
            document.removeEventListener("pointerdown", resume, true);
            document.removeEventListener("keydown", resume, true);
          }
        })
        .catch(() => { });
    };
    document.addEventListener("pointerdown", resume, true);
    document.addEventListener("keydown", resume, true);
    resume();
  };
  // 교차 출처 영상을 Web Audio 에 넣으면 무음이 된다. 같은 출처(MSE blob 포함)만 처리한다.
  const canProcessAudio = (video) => {
    const src = video.currentSrc || video.src;
    if (!src) {
      return false;
    }
    if (src.startsWith("blob:") || video.crossOrigin != null) {
      return true;
    }
    try {
      return new URL(src, location.href).origin === location.origin;
    } catch {
      return false;
    }
  };
  const getMainVideo = (pzp) => {
    const videos = Array.from(pzp.querySelectorAll("video"));
    return (
      videos.find((v) => (v.currentSrc || v.src).startsWith("blob:")) ||
      videos.find(canProcessAudio)
    );
  };

  // 치지직 플레이어(pzp)는 화면을 갱신할 때마다 요소의 __vue__ 를 지운다.
  // 그래서 내부 Vue 에 기대지 않고, 플레이어와 같은 클래스를 쓴 일반 DOM 버튼을 만든다.
  const createPlayerButton = (className, svg, onClick) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pzp-button pzp-pc-ui-button knife-button ${className}`;
    const tooltip = document.createElement("span");
    tooltip.className = "pzp-button__tooltip pzp-button__tooltip--top";
    const icon = document.createElement("span");
    icon.className = "pzp-ui-icon";
    button.append(tooltip, icon);
    const control = {
      button,
      setLabel(text) {
        tooltip.textContent = text;
        button.setAttribute("aria-label", text);
      },
      setIcon(markup) {
        icon.innerHTML = markup;
      },
    };
    control.setIcon(svg);
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    // 빠르게 두 번 눌러도 플레이어가 전체 화면으로 바꾸지 않게 한다
    button.addEventListener("dblclick", (e) => e.stopPropagation());
    return control;
  };

  const COMP_ICON_ON = `<svg class="pzp-ui-icon__svg" xmlns="http://www.w3.org/2000/svg" viewBox="-300 -300 1600 1600"><path fill="currentColor" d="M850 200C877.7 200 900 222.3 900 250V750C900 777.7 877.7 800 850 800S800 777.7 800 750V250C800 222.3 822.3 200 850 200ZM570 250C597.7 250 620 272.3 620 300V700C620 727.7 597.7 750 570 750S520 727.7 520 700V300C520 272.3 542.3 250 570 250ZM710 225C737.7 225 760 247.3 760 275V725C760 752.7 737.7 775 710 775S660 752.7 660 725V275C660 247.3 682.3 225 710 225ZM430 250C457.7 250 480 272.3 480 300V700C480 727.7 457.7 750 430 750S380 727.7 380 700V300C380 272.3 402.3 250 430 250ZM290 225C317.7 225 340 247.3 340 275V725C340 752.7 317.7 775 290 775S240 752.7 240 725V275C240 247.3 262.3 225 290 225ZM150 200C177.7 200 200 222.3 200 250V750C200 777.7 177.7 800 150 800S100 777.7 100 750V250C100 222.3 122.3 200 150 200Z"/><circle r="160" cx="900" cy="800" fill="#00ffa3"/></svg>`;
  const COMP_ICON_OFF = `<svg class="pzp-ui-icon__svg" xmlns="http://www.w3.org/2000/svg" viewBox="-300 -300 1600 1600"><path fill="currentColor" d="M850 202.3C877.7 202.3 900 224.6 900 252.3V745.5C900 773.2 877.7 795.5 850 795.5S800 773.2 800 745.5V252.3C800 224.6 822.3 202.3 850 202.3ZM570 167.8C597.7 167.8 620 190.1 620 217.8V780C620 807.7 597.7 830 570 830S520 807.7 520 780V217.8C520 190.1 542.3 167.8 570 167.8ZM710 264.4C737.7 264.4 760 286.7 760 314.4V683.3C760 711 737.7 733.3 710 733.3S660 711 660 683.3V314.4C660 286.7 682.3 264.4 710 264.4ZM430 98.1C457.7 98.1 480 120.4 480 148.1V849.6C480 877.3 457.7 899.6 430 899.6S380 877.3 380 849.6V148.1C380 120.4 402.3 98.1 430 98.1ZM290 217.2C317.7 217.2 340 239.5 340 267.2V730.5C340 758.2 317.7 780.5 290 780.5S240 758.2 240 730.5V267.2C240 239.5 262.3 217.2 290 217.2ZM150 299.6C177.7 299.6 200 321.9 200 349.6V648.1C200 675.8 177.7 698.1 150 698.1S100 675.8 100 648.1V349.6C100 321.9 122.3 299.6 150 299.6Z"/><circle r="160" cx="900" cy="800" fill="#838285"/></svg>`;
  const FF_ICON = `<svg class="pzp-ui-icon__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><path fill="currentColor" d="M11 10.5v15a.8.8 0 0 0 1.25.66l11-7.5a.8.8 0 0 0 0-1.32l-11-7.5A.8.8 0 0 0 11 10.5ZM24.5 10h1.5a.75.75 0 0 1 .75.75v14.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75v-14.5a.75.75 0 0 1 .75-.75Z"/></svg>`;

  // 오디오 컴프레서. 상태는 페이지에 하나이고, 버튼은 플레이어가 새로 그려질 때마다 다시 붙는다.
  const storedGain = Number(window.localStorage.getItem("knifeGain") ?? 1);
  const compressor = {
    enabled: false,
    wanted: false,
    waitingResume: false,
    threshold: -50,
    knee: 40,
    ratio: 12,
    attack: 0,
    release: 0.25,
    gain: storedGain >= 0 && storedGain <= 2 ? storedGain : 1,
    pzp: null,
    source: null,
    comp: null,
    gainNode: null,
    views: new Set(),
    render() {
      for (const view of this.views) {
        if (view.container.isConnected) {
          view.update();
        } else {
          this.views.delete(view);
        }
      }
    },
    apply() {
      if (this.comp != null) {
        this.comp.threshold.value = this.threshold;
        this.comp.knee.value = this.knee;
        this.comp.ratio.value = this.ratio;
        this.comp.attack.value = this.attack;
        this.comp.release.value = this.release;
        this.gainNode.gain.value = this.gain;
      }
    },
    setParams(c) {
      this.threshold = c.compressorThreshold ?? this.threshold;
      this.knee = c.compressorKnee ?? this.knee;
      this.ratio = c.compressorRatio ?? this.ratio;
      this.attack = c.compressorAttack ?? this.attack;
      this.release = c.compressorRelease ?? this.release;
      this.apply();
    },
    setGain(gain) {
      this.gain = gain;
      window.localStorage.setItem("knifeGain", gain);
      this.apply();
      this.render();
    },
    attach(video) {
      if (video == null || !canProcessAudio(video)) {
        log("컴프레서: 처리할 수 있는 영상이 없음", video?.currentSrc);
        return false;
      }
      const ctx = getAudioContext();
      if (this.comp == null) {
        this.comp = ctx.createDynamicsCompressor();
        this.gainNode = ctx.createGain();
        this.apply();
        this.comp.connect(this.gainNode);
        this.gainNode.connect(ctx.destination);
      }
      // 한 video 에는 MediaElementSource 를 한 번만 만들 수 있다
      let source = mediaSources.get(video);
      if (source == null) {
        source = ctx.createMediaElementSource(video);
        mediaSources.set(video, source);
      }
      if (this.source != null && this.source !== source) {
        this.source.disconnect();
        this.source.connect(ctx.destination);
      }
      source.disconnect();
      source.connect(this.comp);
      this.source = source;
      return true;
    },
    detach() {
      if (this.source != null) {
        this.source.disconnect();
        this.source.connect(getAudioContext().destination);
        this.source = null;
      }
    },
    // 지금 재생 중인 video 에 붙인다. 아직 video 가 없으면 켜진 상태로 두고 재생이 시작될 때 붙인다.
    sync() {
      if (!this.enabled || this.pzp == null) {
        return;
      }
      const video = getMainVideo(this.pzp);
      if (video == null || mediaSources.get(video) === this.source) {
        return;
      }
      if (!this.attach(video)) {
        this.setEnabled(false);
      }
    },
    setEnabled(enabled) {
      this.wanted = enabled;
      if (!enabled) {
        this.enabled = false;
        this.detach();
        this.render();
        return;
      }
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        // 자동 재생 정책: 사용자가 페이지를 한 번 누를 때까지 기다렸다가 켠다
        if (!this.waitingResume) {
          this.waitingResume = true;
          const onRunning = () => {
            if (ctx.state !== "running") {
              return;
            }
            ctx.removeEventListener("statechange", onRunning);
            this.waitingResume = false;
            if (this.wanted) {
              this.setEnabled(true);
            }
          };
          ctx.addEventListener("statechange", onRunning);
          resumeAudioOnGesture();
        }
        return;
      }
      this.enabled = true;
      this.sync();
      this.render();
    },
  };

  const compressorPlayers = new WeakSet();
  const attachCompressorButton = (volumeControl) => {
    const pzp = volumeControl.closest(".pzp-pc");
    if (pzp == null) {
      return;
    }
    compressor.pzp = pzp;

    const container = document.createElement("div");
    container.className = "pzp-pc__volume-control knife-comp";
    const control = createPlayerButton(
      "pzp-pc__volume-button",
      COMP_ICON_OFF,
      () => compressor.setEnabled(!compressor.enabled)
    );
    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "knife-gain";
    slider.min = "0";
    slider.max = "2";
    slider.step = "0.01";
    slider.setAttribute("aria-label", "Gain");
    slider.addEventListener("input", () => {
      compressor.setGain(Number(slider.value));
    });
    // 슬라이더 조작이 플레이어 단축키(방향키 음량·탐색)나 클릭 동작으로 번지지 않게 한다
    for (const type of ["keydown", "keyup", "click", "dblclick", "mousedown"]) {
      slider.addEventListener(type, (e) => e.stopPropagation());
    }
    container.append(control.button, slider);

    compressor.views.add({
      container,
      update() {
        control.setIcon(compressor.enabled ? COMP_ICON_ON : COMP_ICON_OFF);
        control.setLabel(
          compressor.enabled ? i18n.disableCompressor : i18n.enableCompressor
        );
        slider.hidden = !compressor.enabled;
        slider.value = `${compressor.gain}`;
        slider.title = `${Math.round(compressor.gain * 100)}%`;
      },
    });
    volumeControl.insertAdjacentElement("afterend", container);
    compressor.render();

    if (!compressorPlayers.has(pzp)) {
      compressorPlayers.add(pzp);
      // 광고 → 본방처럼 재생하는 video 가 바뀌면 새 video 로 옮겨 붙인다
      pzp.addEventListener("playing", () => compressor.sync(), true);
    }
    if (config.compressorDefault && !compressor.wanted) {
      compressor.setEnabled(true);
    } else {
      compressor.sync();
    }
    log("컴프레서 버튼 추가");
  };

  // 라이브: 버퍼 끝(실시간)으로 건너뛰는 버튼
  const attachFastForwardButton = (playButton) => {
    const pzp = playButton.closest(".pzp-pc");
    if (pzp == null) {
      return;
    }
    const control = createPlayerButton(
      "pzp-pc__playback-switch knife-ff",
      FF_ICON,
      () => {
        const video = getMainVideo(pzp) || pzp.querySelector("video");
        if (!video?.buffered.length) {
          return;
        }
        video.currentTime = video.buffered.end(video.buffered.length - 1);
        setSeeking(false);
      }
    );
    control.setLabel(i18n.fastForward);
    playButton.insertAdjacentElement("afterend", control.button);
  };

  const initializedPlayers = new WeakSet();
  const initPlayerFeatures = async (node, isLive, tries = 0) => {
    if (node == null) {
      return;
    }
    const pzp = node.matches?.(".pzp-pc") ? node : node.querySelector(".pzp-pc");
    if (pzp == null) {
      if (tries > 500) {
        return;
      }
      return new Promise((r) => setTimeout(r, 50)).then(() =>
        initPlayerFeatures(node, isLive, tries + 1)
      );
    }
    if (initializedPlayers.has(pzp)) {
      return;
    }
    initializedPlayers.add(pzp);

    if (isLive) {
      if (isPopup) {
        // 팝업 플레이어 안에서는 넓은 화면으로 바꿔 영상만 보이게 한다 (is_large = 넓은 화면·극장 모드)
        setTimeout(() => {
          const layout = document.getElementById("live_player_layout");
          if (layout != null && !layout.classList.contains("is_large")) {
            pzp.querySelector(".pzp-pc__viewmode-button")?.click();
          }
        }, 500);
      }

      try {
        addStatsMenu();
      } catch { }
    }

    if (!isLive) {
      const indicator = document.createElement("div");
      indicator.classList.add("knife-ff-indicator");
      indicator.style.display = "none";
      indicator.textContent = i18n.speed2x;
      pzp.appendChild(indicator);

      const videoContainer = pzp.querySelector(".pzp-pc__video");
      videoContainer?.addEventListener("mousedown", async (e) => {
        if (e.button !== 0 || !config.pressToFastForward) {
          return;
        }
        e.preventDefault();

        const corePlayer = await getCorePlayer();
        if (corePlayer == null) {
          return;
        }
        const x = e.clientX;
        const y = e.clientY;
        let originalRate = 1;
        let originalPaused = false;
        const fastForwardTimeout = setTimeout(() => {
          videoContainer.style.pointerEvents = "none";
          indicator.style.display = "";

          originalRate = corePlayer.playbackRate;
          corePlayer.playbackRate = 2;
          if (corePlayer.paused) {
            originalPaused = true;
            corePlayer.play();
          }
        }, 500);

        const onMouseMove = (e) => {
          e.preventDefault();
          if (Math.abs(e.clientX - x) > 10 || Math.abs(e.clientY - y) > 10) {
            document.removeEventListener("mousemove", onMouseMove);
            clearTimeout(fastForwardTimeout);
          }
        };
        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
          clearTimeout(fastForwardTimeout);
          corePlayer.playbackRate = originalRate;
          if (originalPaused) {
            corePlayer.pause();
          }
          indicator.style.display = "none";
          videoContainer.style.pointerEvents = "";
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    }
  };

  const patchHls = (hls) => {
    if (hls.knifePatched) {
      return;
    }
    hls.knifePatched = true;
    hls.streamController.synchronizeToLiveEdge = function (levelDetails) {
      const { config, media } = this;
      if (!media) {
        return;
      }
      const liveSyncPosition = this.hls.liveSyncPosition;
      const currentTime = seeking ? levelDetails.edge : media.currentTime;
      const start = levelDetails.fragments[0].start;
      const end = levelDetails.edge;
      const withinSlidingWindow =
        currentTime >= start - config.maxFragLookUpTolerance &&
        currentTime <= end;
      if (
        liveSyncPosition !== null &&
        media.duration > liveSyncPosition &&
        (currentTime < liveSyncPosition || !withinSlidingWindow)
      ) {
        const maxLatency =
          config.liveMaxLatencyDuration !== undefined
            ? config.liveMaxLatencyDuration
            : config.liveMaxLatencyDurationCount * levelDetails.targetduration;
        if (
          (!withinSlidingWindow && media.readyState < 4) ||
          currentTime < end - maxLatency
        ) {
          if (!this.loadedmetadata) {
            this.nextLoadPosition = liveSyncPosition;
          }
          if (media.readyState && !seeking) {
            media.currentTime = liveSyncPosition;
          }
        }
      }
    };
  };

  let oldBackBufferLength;
  let oldMaxBufferSize;
  let oldMaxBufferLength;
  let oldMaxMaxBufferLength;
  const setSeeking = async (value) => {
    const corePlayer = await getCorePlayer();
    const hls = corePlayer?.player?._mediaController?._hls;
    if (hls?.config != null && seeking !== value) {
      seeking = value;
      patchHls(hls);
      if (value) {
        oldBackBufferLength = hls.config.backBufferLength;
        oldMaxBufferSize = hls.config.maxBufferSize;
        oldMaxBufferLength = hls.config.maxBufferLength;
        oldMaxMaxBufferLength = hls.config.maxMaxBufferLength;
        hls.config.backBufferLength = Infinity;
        hls.config.maxBufferSize *= 1000;
        hls.config.maxBufferLength *= 1000;
        hls.config.maxMaxBufferLength *= 1000;
      } else {
        hls.config.backBufferLength = oldBackBufferLength;
        hls.config.maxBufferSize = oldMaxBufferSize;
        hls.config.maxBufferLength = oldMaxBufferLength;
        hls.config.maxMaxBufferLength = oldMaxMaxBufferLength;
      }
    }
  };

  const seek = (backward) => {
    if (!config.arrowSeek) {
      return;
    }

    const video = document.querySelector("video");
    if (
      video == null ||
      video.duration !== Infinity ||
      video.buffered.length === 0 ||
      document
        .getElementById("live_player_layout")
        ?.classList.contains("timemachine_mode")
    ) {
      return;
    }

    if (backward) {
      if (video.currentTime - 5 < video.buffered.start(0)) {
        video.currentTime = video.buffered.start(0) + 1;
      } else {
        video.currentTime -= 5;
      }
      setSeeking(true);
    } else {
      if (
        video.currentTime + 5 >=
        video.buffered.end(video.buffered.length - 1)
      ) {
        video.currentTime = video.buffered.end(video.buffered.length - 1) - 1;
        setSeeking(false);
      } else {
        video.currentTime += 5;
        setSeeking(true);
      }
    }
  };

  const addResizeHandle = (container) => {
    if (
      !window
        .getComputedStyle(document.documentElement)
        .getPropertyValue("--knife-chat-resize")
    ) {
      return;
    }

    container.parentNode.querySelector(".knife-resize-handle")?.remove();
    const resizeHandle = document.createElement("div");
    resizeHandle.classList.add("knife-resize-handle");
    container.before(resizeHandle);

    let left = 0;
    let right = 0;
    let reverse = false;
    let chatWidth = Number(window.localStorage.getItem("chatWidth"));
    if (chatWidth > 0) {
      document.documentElement.style.setProperty(
        "--knife-chat-width",
        `${chatWidth}px`
      );
    }
    const onMouseMove = (e) => {
      chatWidth = Math.max(
        24,
        reverse ? e.clientX - left - 1 : right - e.clientX - 1
      );
      container.style.width = `${chatWidth}px`;
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      container.style.width = "";
      if (chatWidth > 0) {
        document.documentElement.style.setProperty(
          "--knife-chat-width",
          `${chatWidth}px`
        );
        window.localStorage.setItem("chatWidth", chatWidth);
      }
    };
    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      left = rect.left;
      right = rect.right;
      reverse = getComputedStyle(
        container.parentElement
      ).flexDirection.endsWith("reverse");
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  };

  const attachChatObserver = async (chattingContainer, isLive) => {
    const wrapper = chattingContainer?.querySelector?.(
      isLive
        ? '[role="log"] [class^="_wrapper_"], [class^="live_chatting_list_wrapper__"]'
        : ':scope > [class^="_list_"], [class^="vod_chatting_list__"]'
    );
    if (wrapper == null) {
      return;
    }

    if (
      !window
        .getComputedStyle(document.documentElement)
        .getPropertyValue("--knife-chat-timestamp")
    ) {
      return;
    }

    const chatObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const n of mutation.addedNodes) {
          if (
            hasGeneratedClass(n, "item") ||
            n.className?.startsWith?.("vod_chatting_item__")
          ) {
            const props = getReactProps(n);
            const message = props?.children?.props?.chatMessage;
            if (message == null) {
              continue;
            }
            const wrapper = n.querySelector(
              '[class^="_chatting_message_"], [class^="live_chatting_message_chatting_message__"]'
            );
            if (wrapper == null || wrapper.dataset.timestamp) {
              continue;
            }
            if (isLive) {
              const time = new Date(message.time);
              wrapper.dataset.timestamp = `${padNumber(
                time.getHours(),
                2
              )}:${padNumber(time.getMinutes(), 2)}`;
            } else {
              wrapper.dataset.timestamp = formatTimestamp(
                message.playerMessageTime
              );
            }
            props.children.props.messageChangeHandler?.();
          }
        }
      }
    });
    chatObserver.observe(wrapper, { childList: true });
  };

  const initializedChats = new WeakSet();
  const initChatFeatures = async (chattingContainer, isLive, tries = 0) => {
    if (chattingContainer == null) {
      return;
    }
    if (tries === 0) {
      if (initializedChats.has(chattingContainer)) {
        return;
      }
      initializedChats.add(chattingContainer);
    }
    const chatController = await findReactState(
      chattingContainer,
      (state) => state.messageFilter != null
    );
    if (chatController == null) {
      if (tries > 500) {
        return;
      }
      return new Promise((r) => setTimeout(r, 50)).then(() =>
        initChatFeatures(chattingContainer, isLive, tries + 1)
      );
    }

    try {
      addResizeHandle(
        isLive
          ? chattingContainer
          : chattingContainer.closest("#vod-aside") ||
              chattingContainer.parentNode
      );
    } catch { }

    if (isLive && isPopup) {
      const foldChat = () => {
        chattingContainer
          .querySelector(
            '[class*="_fold_"] > [class^="_button_"], [class*="live_chatting_header_fold__"] > [class^="live_chatting_header_button__"]'
          )
          ?.click();
      };
      setTimeout(foldChat, 300);
      setTimeout(foldChat, 2000);
    }

    if (chatController.knifePatched) {
      return;
    }
    chatController.knifePatched = true;

    const originalFilter = chatController.messageFilter;
    chatController.messageFilter = function (message) {
      if (!originalFilter.call(this, message)) {
        return false;
      }
      if (config.hideDonation && message.type === 10) {
        return false;
      }
      return true;
    };

    if (isLive) {
      const originalBlindListener = chatController.notiBlindListener;
      chatController.notiBlindListener = function (message) {
        if (!config.showDeleted || message.blindType === "CANCEL") {
          originalBlindListener.call(this, message);
          return;
        }
        const n = chatController.messageList.findIndex(
          (t) => t.time === message.messageTime && t.user === message.userId
        );
        if (n === -1) {
          return;
        }
        const originalMessage = chatController.messageList[n];
        chatController.messageList[n] = {
          ...originalMessage,
          content: createReactElement("span", {
            className: "knife-deleted",
            children: originalMessage.content,
          }),
        };
        chatController.notiUpdateMessageList();
      };
    }

    await attachChatObserver(chattingContainer, isLive);
    const containerObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const n of mutation.addedNodes) {
          attachChatObserver(n, isLive);
        }
      }
    });
    containerObserver.observe(chattingContainer, { childList: true });
  };

  const attachLiveObserver = async (node) => {
    if (node == null) {
      return;
    }

    const wrapper =
      node.querySelector("main") ||
      node.querySelector('[class^="live_wrapper__"]');
    if (wrapper != null) {
      const liveObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const n of mutation.addedNodes) {
            if (n.tagName === "ASIDE") {
              initChatFeatures(n, true);
            }
          }
        }
      });
      liveObserver.observe(wrapper, { childList: true });
    }

    const player =
      node.querySelector('[class^="_player_"]') ||
      node.querySelector('[class^="live_information_player__"]');
    if (player != null) {
      const playerObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const n of mutation.addedNodes) {
            if (
              hasGeneratedClass(n, "player") ||
              n.className?.startsWith?.("live_information_video_container__")
            ) {
              attachPlayerObserver(n, true);
            }
          }
        }
      });
      playerObserver.observe(player, { childList: true });
    }

    return Promise.all([
      attachPlayerObserver(
        node.querySelector(
          '[class^="_player_"], [class^="live_information_video_container__"]'
        ),
        true
      ),
      initChatFeatures(node.querySelector("aside"), true),
    ]);
  };

  const attachVodObserver = async (node) => {
    if (node == null) {
      return;
    }

    const player = node.querySelector('[class^="vod_player__"]');
    if (player != null) {
      const vodObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const n of mutation.addedNodes) {
            if (n.tagName === "ASIDE") {
              initChatFeatures(
                n.querySelector('[class^="vod_chatting_container__"]'),
                false
              );
            }
          }
        }
      });
      vodObserver.observe(player, { childList: true });
    }

    return Promise.all([
      attachPlayerObserver(node, false),
      initChatFeatures(
        node.querySelector('[class^="vod_chatting_container__"]'),
        false
      ),
    ]);
  };

  document.body.addEventListener("keydown", (e) => {
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.contentEditable === "true" ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey
    ) {
      return;
    }
    switch (e.key) {
      case "ArrowLeft":
        seek(true);
        break;
      case "ArrowRight":
        seek(false);
        break;
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hidePreview();
    }
  });

  // 라이브·영상 카드의 썸네일 링크 (CSS Modules 이름: _thumbnail_해시_줄)
  const isCardThumbnail = (node) =>
    node?.tagName === "A" &&
    (node.className.startsWith?.("video_card_thumbnail__") ||
      hasGeneratedClass(node, "thumbnail")) &&
    /^\/(live|video)\//.test(node.pathname);

  const getCardThumbnail = (node) => {
    const link = node?.closest?.("a");
    return isCardThumbnail(link) ? link : null;
  };

  const videoInfo = {};
  document.addEventListener("mouseout", async (e) => {
    // 썸네일 안의 이미지·영상 사이를 오갈 때는 무시하고, 카드 경계를 넘을 때만 처리한다
    const from = getCardThumbnail(e.target);
    const to = getCardThumbnail(e.relatedTarget);
    if (from !== to) {
      if (from != null) {
        removeUnmuteListener(from);
        hidePreview(from.href);
      }
      if (to != null) {
        if (config.customPreview) {
          showPreview(to.href, to);
        } else if (config.rightClickToUnmute) {
          addUnmuteListener(to);
        }
      }
    }

    if (e.relatedTarget?.className.startsWith?.("video_information_count__")) {
      if (
        e.relatedTarget.textContent.endsWith(" 스트리밍 중") &&
        !e.relatedTarget.dataset.knifeTooltip
      ) {
        const liveDetail = await findReactState(
          e.relatedTarget,
          (state) => state[0]?.openDate != null
        );
        if (liveDetail?.[0].openDate) {
          e.relatedTarget.dataset.knifeTooltip = `${i18n.liveStart}: ${liveDetail[0].openDate}`;
        }
      }
    } else if (
      e.relatedTarget?.tagName === "SPAN" &&
      e.relatedTarget.className.startsWith("video_card_item__") &&
      e.relatedTarget.nextElementSibling == null
    ) {
      const link = e.relatedTarget.parentNode.parentNode.querySelector("a");
      if (link == null) {
        return;
      }
      const url = new URL(link.href);
      const parts = url.pathname.split("/");
      if (parts.length < 3 || parts[1] !== "video") {
        return;
      }
      const videoId = parts[2];
      let info = videoInfo[videoId];
      if (info === undefined) {
        const res = await fetch(
          `https://api.chzzk.naver.com/service/v3/videos/${videoId}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          return;
        }
        const video = await res.json();
        if (video.code !== 200) {
          return;
        }
        info = video.content;
        videoInfo[videoId] = info;
      }
      if (info?.liveOpenDate) {
        e.relatedTarget.dataset.knifeTooltip = `${i18n.liveStart}: ${info.liveOpenDate}`;
      }
    }
  });

  // 옛 클래스명 연쇄로 못 찾는 경우를 대비해 플레이어·채팅을 직접 찾는다 (중복 초기화는 WeakSet 으로 막음)
  onElement("#live_player_layout .pzp-pc, #player_layout .pzp-pc", (pzp) => {
    initPlayerFeatures(pzp, pzp.closest("#live_player_layout") != null);
  });
  // .pzp-pc 안쪽(플레이어가 실제로 그린 뒤)의 요소에만 붙인다
  onElement(
    "#live_player_layout .pzp-pc .pzp-pc__volume-control:not(.knife-comp), #player_layout .pzp-pc .pzp-pc__volume-control:not(.knife-comp)",
    attachCompressorButton
  );
  onElement(
    "#live_player_layout .pzp-pc .pzp-pc__playback-switch:not(.knife-ff)",
    attachFastForwardButton
  );
  onElement("#aside-chatting", (aside) => {
    initChatFeatures(aside, true);
  });
  // 다시보기 채팅: 컨트롤러가 채팅 컴포넌트 안에 있어 목록(role=log)에서 위로 찾아야 한다
  onElement('#vod-aside [role="log"]', (chatLog) => {
    initChatFeatures(chatLog, false);
  });

  getPlayerModule().then((player) =>
    log(`시작, 미리보기 플레이어 ${player ? "준비됨" : "없음"}`)
  );

  (async () => {
    try {
      if (location.pathname.endsWith("/chat")) {
        await initChatFeatures(await waitFor("aside"), true);
      } else {
        await Promise.all([attachLayoutObserver(), attachBodyObserver()]);
      }
    } catch { }
    rootObserver.disconnect();
  })();
})();
