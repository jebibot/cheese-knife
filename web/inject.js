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

  const getWebpackRequire = new Promise((resolve) => {
    const id = "knife";
    window.webpackChunkglive_fe_pc.push([
      [id],
      {
        [id]: (module, exports, __webpack_require__) => {
          resolve(__webpack_require__);
        },
      },
      (req) => req(id),
    ]);
  });

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
  } catch {}

  let first = true;
  let config = {};
  const initConfig = (c) => {
    config = c;
    if (first) {
      first = false;
      if (c.expandFollowings) {
        setTimeout(() => {
          document.querySelector('[class^="navigator_button_more__"]')?.click();
        }, 300);
      }
      if (c.compressorDefault && compressor != null) {
        compressor.enabled = true;
      }
    }

    if (compressor != null) {
      compressor.threshold = c.compressorThreshold;
      compressor.knee = c.compressorKnee;
      compressor.ratio = c.compressorRatio;
      compressor.attack = c.compressorAttack;
      compressor.release = c.compressorRelease;
    }
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
          const node = n.querySelector(elem.query);
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
  let currentPreview;
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
    let info = liveInfo[uid];
    if (info === undefined) {
      const res = await fetch(
        `https://api.chzzk.naver.com/service/v3/channels/${uid}/live-detail`,
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
      } catch {}
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

    let Player;
    try {
      Player = (await getWebpackRequire)(64772);
    } catch {}

    hidePreview();
    currentPreview = uid;
    if (preview == null) {
      preview = document.createElement("div");
      preview.classList.add("knife-preview");
      document.body.appendChild(preview);

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
    if (tooltip) {
      preview.style.position = "fixed";
      preview.style.marginTop = "0.25rem";
      if (parseInt(getComputedStyle(node).getPropertyValue("left")) < 0) {
        right = rootRect.width - rect.right;
      } else {
        left = rect.left;
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
        ? "https://ssl.pstatic.net/static/nng/glive/resource/p/static/media/image_age_restriction.c04b98f818ed01f04be9.png"
        : "https://ssl.pstatic.net/static/nng/glive/resource/p/static/media/bg-video-placeholder.938697e8023d630ed7a8.png")
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
    if (preview == null) {
      return;
    }
    if (href != null) {
      const url = new URL(href);
      const parts = url.pathname.split("/");
      if (parts.length < 3 || parts[1] !== "live") {
        return;
      }
      const uid = parts[2];
      if (currentPreview !== uid) {
        return;
      }
    }
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

  const numberFormatter = new Intl.NumberFormat("ko-KR");
  const padNumber = (n, len) => n.toString().padStart(len, "0");
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
      const sidebar = node.querySelector("#navigation");
      if (sidebar == null) {
        return;
      }
      try {
        initSidebarFeatures(sidebar);
      } catch {}
      try {
        refreshSidebar(sidebar);
      } catch {}
    };
    const layoutWrap = await waitFor('[class^="layout_glive__"]');
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
    } catch {}
  };

  const initSidebarFeatures = (sidebar) => {
    if (sidebar == null) {
      return;
    }
    const addListeners = (item) => {
      const url = new URL(item.href);
      if (url.hostname !== "chzzk.naver.com") {
        return;
      }
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
          item,
          e.clientX - rect.x,
          e.clientY - rect.y
        );
        e.dataTransfer.setData("knife-data", item.href);
      });
      item.addEventListener("dragend", () => {
        item.style.opacity = "";
        document.body.classList.remove("knife-dragging");
      });
    };

    const items = sidebar.querySelectorAll("a");
    for (const item of items) {
      addListeners(item);
    }

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

          if (n.className?.startsWith?.("navigator_tooltip__")) {
            if (config.preview) {
              showPreview(mutation.target.href, n, true);
            }
          }
        }
        for (const n of mutation.removedNodes) {
          if (n.className?.startsWith?.("navigator_tooltip__")) {
            hidePreview(mutation.target.href);
          }
        }
      }
    });
    sidebarObserver.observe(sidebar, {
      childList: true,
      subtree: true,
    });
  };

  let refreshInterval;
  const refreshSidebar = (sidebar) => {
    clearInterval(refreshInterval);
    refreshInterval = setInterval(async () => {
      if (config.updateSidebar) {
        const sidebarEffect = await findReactState(
          sidebar,
          (state) =>
            state.tag === 8 && state.destroy == null && state.deps?.length > 2
        );
        sidebarEffect?.create?.();
      }
    }, 30000);
  };

  const attachBodyObserver = async () => {
    const init = async (node) => {
      if (node == null) {
        return;
      }
      hidePreview();
      const features = [];
      if (node.className.startsWith("live_")) {
        features.push(attachLiveObserver(node));
      } else if (node.className.startsWith("vod_")) {
        features.push(attachPlayerObserver(node, false));
      } else if (node.className.startsWith("channel_")) {
        features.push(initChannelFeatures(node));
      }
      return Promise.all(features);
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
    const list = node.querySelector('[class*="channel_area__"]');
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

  let corePlayer;
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
      const update = () => {
        const info = window.__getLiveInfo?.();
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
    license.parentNode.insertBefore(stats, license);
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

  let pzpVue;
  let compressor;
  const initPlayerFeatures = async (node, isLive, tries = 0) => {
    if (node == null) {
      return;
    }
    const pzp = node.querySelector(".pzp-pc");
    pzpVue = pzp?.__vue__;
    if (pzpVue == null) {
      if (tries > 500) {
        return;
      }
      return new Promise((r) => setTimeout(r, 50)).then(() =>
        initPlayerFeatures(node, isLive, tries + 1)
      );
    }

    let Vue = pzpVue;
    while (Vue != null && !Object.hasOwn(Vue, "$mount")) {
      Vue = Object.getPrototypeOf(Vue);
    }
    Vue = Vue?.constructor;

    if (isLive) {
      if (isPopup) {
        try {
          const setLiveWide = await findReactState(
            node,
            (state) =>
              state[0]?.length === 1 &&
              state[1]?.length === 2 &&
              state[1]?.[1]?.key === "isLiveWide"
          );
          setLiveWide?.[0](true);
        } catch {}
      }

      const playButton = pzp.querySelector(".pzp-pc-playback-switch");
      if (playButton != null) {
        try {
          const ffButton = new Vue({
            template: `
              <pzp-pc-ui-button class="pzp-pc__playback-switch knife-ff" label="${i18n.fastForward}" aria-label="${i18n.fastForward}" tooltip="${i18n.fastForward}" @click="fastForward">
                <ui-next-media-icon></ui-next-media-icon>
              </pzp-pc-ui-button>`,
            methods: {
              fastForward() {
                const video = pzp.querySelector("video");
                video.currentTime = video.buffered.end(
                  video.buffered.length - 1
                );
                setSeeking(false);
              },
            },
          });
          ffButton.$mount();
          playButton.insertAdjacentElement("afterend", ffButton.$el);
        } catch {}
      }

      try {
        addStatsMenu();
      } catch {}
    }

    const volumeControl = pzp.querySelector(".pzp-pc__volume-control");
    if (volumeControl != null) {
      try {
        compressor = new Vue({
          template: `
            <div class="pzp-pc__volume-control knife-comp">
              <pzp-pc-ui-button class="pzp-pc__volume-button" :label="label" :aria-label="label" :tooltip="label" @click="toggle">
                <ui-icon>
                  <svg v-if="enabled" xmlns="http://www.w3.org/2000/svg" viewBox="-300 -300 1600 1600"><path fill="currentColor" d="M850 200C877.7 200 900 222.3 900 250V750C900 777.7 877.7 800 850 800S800 777.7 800 750V250C800 222.3 822.3 200 850 200ZM570 250C597.7 250 620 272.3 620 300V700C620 727.7 597.7 750 570 750S520 727.7 520 700V300C520 272.3 542.3 250 570 250ZM710 225C737.7 225 760 247.3 760 275V725C760 752.7 737.7 775 710 775S660 752.7 660 725V275C660 247.3 682.3 225 710 225ZM430 250C457.7 250 480 272.3 480 300V700C480 727.7 457.7 750 430 750S380 727.7 380 700V300C380 272.3 402.3 250 430 250ZM290 225C317.7 225 340 247.3 340 275V725C340 752.7 317.7 775 290 775S240 752.7 240 725V275C240 247.3 262.3 225 290 225ZM150 200C177.7 200 200 222.3 200 250V750C200 777.7 177.7 800 150 800S100 777.7 100 750V250C100 222.3 122.3 200 150 200Z"/><circle r="160" cx="900" cy="800" fill="#00ffa3"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="-300 -300 1600 1600"><path fill="currentColor" d="M850 202.3C877.7 202.3 900 224.6 900 252.3V745.5C900 773.2 877.7 795.5 850 795.5S800 773.2 800 745.5V252.3C800 224.6 822.3 202.3 850 202.3ZM570 167.8C597.7 167.8 620 190.1 620 217.8V780C620 807.7 597.7 830 570 830S520 807.7 520 780V217.8C520 190.1 542.3 167.8 570 167.8ZM710 264.4C737.7 264.4 760 286.7 760 314.4V683.3C760 711 737.7 733.3 710 733.3S660 711 660 683.3V314.4C660 286.7 682.3 264.4 710 264.4ZM430 98.1C457.7 98.1 480 120.4 480 148.1V849.6C480 877.3 457.7 899.6 430 899.6S380 877.3 380 849.6V148.1C380 120.4 402.3 98.1 430 98.1ZM290 217.2C317.7 217.2 340 239.5 340 267.2V730.5C340 758.2 317.7 780.5 290 780.5S240 758.2 240 730.5V267.2C240 239.5 262.3 217.2 290 217.2ZM150 299.6C177.7 299.6 200 321.9 200 349.6V648.1C200 675.8 177.7 698.1 150 698.1S100 675.8 100 648.1V349.6C100 321.9 122.3 299.6 150 299.6Z"/><circle r="160" cx="900" cy="800" fill="#838285"/></svg>
                </ui-icon>
              </pzp-pc-ui-button>
              <ui-slider v-show="enabled" ref="slider" class="pzp-pc__volume-slider pzp-pc-volume-slider pzp-ui-slider--volume knife-gain-slider" :min="0" :max="2" :value="gain" role="slider" aria-label="Gain" aria-live="polite" aria-valuemin="0" :aria-valuenow="ariaValuenow" aria-valuemax="200" :aria-valuetext="ariaValuetext" @change="setGain" @dragstart="setGain">
                <ui-progress class="pzp-ui-progress pzp-ui-progress__volume" :max="2" :value="gain"></ui-progress>
              </ui-slider>
            </div>`,
          data: {
            enabled: false,
            threshold: config.compressorThreshold ?? -50,
            knee: config.compressorKnee ?? 40,
            ratio: config.compressorRatio ?? 12,
            attack: config.compressorAttack ?? 0,
            release: config.compressorRelease ?? 0.25,
            gain: Number(window.localStorage.getItem("knifeGain") ?? 1),
          },
          methods: {
            toggle() {
              this.enabled = !this.enabled;
            },
            updateCompressor() {
              if (this.comp != null) {
                this.comp.threshold.value = this.threshold;
                this.comp.knee.value = this.knee;
                this.comp.ratio.value = this.ratio;
                this.comp.attack.value = this.attack;
                this.comp.release.value = this.release;
                this.gainNode.gain.value = this.gain;
              }
              window.localStorage.setItem("knifeGain", this.gain);
            },
            setGain() {
              this.gain = this.$refs.slider?.track.value ?? 1;
            },
          },
          computed: {
            label() {
              return this.enabled
                ? i18n.disableCompressor
                : i18n.enableCompressor;
            },
            ariaValuenow() {
              return Math.round(this.gain * 100);
            },
            ariaValuetext() {
              return `${this.ariaValuenow}%`;
            },
          },
          watch: {
            enabled(enabled) {
              if (enabled) {
                const video = pzp.querySelector("video");
                if (video == null) {
                  this.enabled = false;
                  return;
                }
                if (this.source == null) {
                  this.ctx = new AudioContext();
                  this.source = this.ctx.createMediaElementSource(video);
                  this.comp = this.ctx.createDynamicsCompressor();
                  this.gainNode = this.ctx.createGain();
                  this.updateCompressor();
                  this.comp.connect(this.gainNode);
                } else {
                  this.source.disconnect();
                }
                this.source.connect(this.comp);
                this.gainNode.connect(this.ctx.destination);
              } else if (this.source != null) {
                this.gainNode.disconnect();
                this.source.disconnect();
                this.source.connect(this.ctx.destination);
              }
            },
            threshold: "updateCompressor",
            knee: "updateCompressor",
            ratio: "updateCompressor",
            attack: "updateCompressor",
            release: "updateCompressor",
            gain: "updateCompressor",
          },
        });
        if (config.compressorDefault) {
          compressor.enabled = true;
        }
        compressor.$mount();
        volumeControl.insertAdjacentElement("afterend", compressor.$el);
      } catch {}
    }

    const player = await findReactState(node, (s) => s._corePlayer != null);
    corePlayer = player?._corePlayer;
    if (!isLive && corePlayer != null) {
      const getVodResumeTimes = () => {
        let result;
        try {
          result = JSON.parse(window.localStorage.getItem("vodResumeTimes"));
        } catch {}
        if (result == null || typeof result !== "object") {
          result = {};
        }
        return result;
      };

      const url = new URL(location.href);
      const id = url.pathname.split("/").pop();
      const time = Number(url.searchParams.get("t") || getVodResumeTimes()[id]);
      if (time > 0) {
        corePlayer.currentTime = time;
        setTimeout(() => {
          corePlayer.pause();
          corePlayer.play();
        }, 300);
      }
      let throttled = false;
      corePlayer.addEventListener("timeupdate", () => {
        if (throttled || !config.rememberTime) {
          return;
        }
        throttled = true;
        const vodResumeTimes = getVodResumeTimes();
        vodResumeTimes[id] =
          corePlayer.duration - corePlayer.currentTime > 120
            ? Math.floor(corePlayer.currentTime)
            : 0;
        window.localStorage.setItem(
          "vodResumeTimes",
          JSON.stringify(vodResumeTimes)
        );
        setTimeout(() => {
          throttled = false;
        }, 5000);
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
  const setSeeking = (value) => {
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
      video.buffered.length === 0
    ) {
      return;
    }

    if (backward) {
      if (video.currentTime - 5 < video.buffered.start(0)) {
        video.currentTime = video.buffered.start(0) + 1;
      } else {
        if (pzpVue != null) {
          pzpVue.$store.dispatch("seekBackward");
        } else {
          video.currentTime -= 5;
        }
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
        if (pzpVue != null) {
          pzpVue.$store.dispatch("seekForward");
        } else {
          video.currentTime += 5;
        }
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
    container.parentNode.insertBefore(resizeHandle, container);

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

  const attachChatObserver = (chattingContainer) => {
    const wrapper = chattingContainer?.querySelector?.(
      '[class^="live_chatting_list_wrapper__"'
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
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((n) => {
          if (n.className?.startsWith("live_chatting_list_item__")) {
            const props = getReactProps(n);
            const t = props?.children?.props?.chatMessage?.time;
            if (t == null) {
              return;
            }
            const wrapper = n.querySelector(
              '[class^="live_chatting_message_wrapper__"]'
            );
            if (wrapper == null || wrapper.dataset.timestamp) {
              return;
            }
            const time = new Date(t);
            wrapper.dataset.timestamp = `${time
              .getHours()
              .toString()
              .padStart(2, "0")}:${time
              .getMinutes()
              .toString()
              .padStart(2, "0")}`;
          }
        });
      });
    });
    chatObserver.observe(wrapper, { childList: true });
  };

  const initChatFeatures = async (chattingContainer, tries = 0) => {
    if (chattingContainer == null) {
      return;
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
        initChatFeatures(chattingContainer, tries + 1)
      );
    }

    try {
      addResizeHandle(chattingContainer);
    } catch {}

    if (isPopup) {
      setTimeout(() => {
        chattingContainer
          .querySelector(
            '[class*="live_chatting_header_fold__"] > [class^="live_chatting_header_button__"]'
          )
          ?.click();
      }, 300);
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
      if (config.optimizeEmotes && message.type === 1) {
        if (Array.isArray(message.content)) {
          for (const n of message.content) {
            if (n.type === "img") {
              const src = n.props.src || "";
              if (src.startsWith("https://nng-phinf.pstatic.net/")) {
                if (src.endsWith(".gif")) {
                  n.props.src = `${src}?type=f24_24`;
                } else if (src.endsWith(".gif?type=f60_60")) {
                  n.props.src = src.replace("?type=f60_60", "?type=f24_24");
                }
              } else if (
                src.startsWith(
                  "https://ssl.pstatic.net/static/nng/glive/icon/"
                ) &&
                src.includes(".gif")
              ) {
                n.props.src = src.replace(
                  "https://ssl.pstatic.net/static/nng/glive/icon/",
                  "https://chz-emote.cdn.ntruss.com/"
                );
              }
            }
          }
        }
      }
      return true;
    };

    let jsx;
    try {
      jsx = (await getWebpackRequire)(46417).jsx;
    } catch {}
    if (jsx != null) {
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
          content: jsx("span", {
            className: "knife-deleted",
            children: originalMessage.content,
          }),
        };
        chatController.notiUpdateMessageList();
      };
    }

    attachChatObserver(chattingContainer);
    const containerObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((n) => {
          attachChatObserver(n);
        });
      });
    });
    containerObserver.observe(chattingContainer, { childList: true });
  };

  const attachLiveObserver = async (node) => {
    if (node == null) {
      return;
    }
    const liveObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const n of mutation.addedNodes) {
          if (n.querySelector != null) {
            initChatFeatures(
              n.tagName === "ASIDE" ? n : n.querySelector("aside")
            );
          }
        }
      }
    });
    liveObserver.observe(node, { childList: true });

    const player = node.querySelector('[class^="live_information_player__"]');
    if (player != null) {
      const playerObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const n of mutation.addedNodes) {
            if (
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
        node.querySelector('[class^="live_information_video_container__"]'),
        true
      ),
      initChatFeatures(node.querySelector("aside")),
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

  const videoInfo = {};
  document.addEventListener("mouseout", async (e) => {
    if (e.relatedTarget?.className?.startsWith?.("video_card_thumbnail__")) {
      if (config.livePreview) {
        showPreview(e.relatedTarget.href, e.relatedTarget);
      }
    } else if (e.target?.className?.startsWith?.("video_card_thumbnail__")) {
      hidePreview(e.target.href);
    }

    if (e.relatedTarget?.className?.startsWith?.("video_information_count__")) {
      if (
        e.relatedTarget.textContent.endsWith(" 스트리밍 중") &&
        !e.relatedTarget.dataset.knifeTooltip
      ) {
        const state = await findReactState(
          e.relatedTarget,
          (state) => state.key === "liveDetail" && state.loadable != null
        );
        const liveDetail = await state.loadable.toPromise();
        if (liveDetail?.openDate) {
          e.relatedTarget.dataset.knifeTooltip = `${i18n.liveStart}: ${liveDetail.openDate}`;
        }
      }
    } else if (e.relatedTarget?.className?.startsWith?.("video_card_item__")) {
      if (
        e.relatedTarget.previousElementSibling?.className?.startsWith?.(
          "video_card_item__"
        )
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
    }
  });

  (async () => {
    try {
      if (location.pathname.endsWith("/chat")) {
        await initChatFeatures(await waitFor("aside"));
      } else {
        await Promise.all([attachLayoutObserver(), attachBodyObserver()]);
      }
    } catch {}
    rootObserver.disconnect();
  })();
})();
