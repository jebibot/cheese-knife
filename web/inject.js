(() => {
const getReactFiber = (node) => {
  if (node == null) {
    return;
  }
  return Object.entries(node).find(([k]) => k.startsWith("__reactFiber$"))?.[1];
};

const getReactProps = (node) => {
  if (node == null) {
    return;
  }
  return Object.entries(node).find(([k]) => k.startsWith("__reactProps$"))?.[1];
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
      if (state.memoizedState != null && criteria(state.memoizedState)) {
        return raw ? state : state.memoizedState;
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

let isPopup = false;
try {
  if (
    window.top !== window &&
    window.top.location.hostname === "chzzk.naver.com"
  ) {
    isPopup = true;
  }
} catch {}

let config = {};
window.addEventListener("message", (e) => {
  switch (e.data.type) {
    case "config":
      config = e.data.config;
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
        if (n.querySelector(elem.query)) {
          elem.resolve(n);
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
      `https://api.chzzk.naver.com/service/v2/channels/${uid}/live-detail`,
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
  const width = Math.max(config.previewWidth, rect.width);

  let Player;
  try {
    Player = (await getWebpackRequire)(4772);
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
  let top;
  if (tooltip) {
    preview.style.position = "fixed";
    preview.style.marginTop = "0.25rem";
    left = rect.left;
    top = rect.bottom;
  } else {
    const height = (width * 9) / 16;
    const rootRect = root.getBoundingClientRect();
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
  preview.style.left = `${Math.round(left)}px`;
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
  const openDate = info.openDate ? new Date(info.openDate).getTime() : 0;
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
  button.title = "닫기";
  button.textContent = "X";
  button.addEventListener("click", () => {
    player.src = "about:blank";
    popup.remove();
  });
  popup.appendChild(button);

  return popup;
};

const attachLayoutObserver = async () => {
  const init = async (node) => {
    const sidebar = node.querySelector("#navigation");
    if (sidebar == null) {
      return;
    }
    try {
      initSidebarFeatures(sidebar);
    } catch (e) {}
    try {
      await refreshSidebar(sidebar);
    } catch (e) {}
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

  await init(layoutWrap);
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
      e.dataTransfer.setDragImage(item, e.clientX - rect.x, e.clientY - rect.y);
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

let refrestInterval;
const refreshSidebar = async (sidebar) => {
  clearInterval(refrestInterval);
  refrestInterval = setInterval(async () => {
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
      features.push(attachPlayerObserver(true));
      features.push(attachLiveObserver(node));
    } else if (node.className.startsWith("vod_")) {
      features.push(attachPlayerObserver(false));
    } else if (node.className.startsWith("lives_")) {
      features.push(initLivesFeatures(node));
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
    layoutBody.appendChild(createPopupPlayer(url, e.pageX - 320, e.pageY - 12));
  });
  layoutBody.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  await init(layoutBody.querySelector("section"));
};

let setFilter;
const initLivesFeatures = async (node) => {
  const list = node.querySelector('[class^="component_list__"]');
  if (list == null) {
    return;
  }

  const res = await fetch("https://api.chz.app/categories");
  if (!res.ok) {
    return;
  }
  const liveCategories = (await res.json()) || [];

  let currentCategory;
  const applyFilter = (item) => {
    if (
      currentCategory != null &&
      (item.querySelector('[class^="video_card_category__"]')?.textContent ||
        "") !== currentCategory
    ) {
      item.style.display = "none";
    } else {
      item.style.display = "";
    }
  };
  setFilter = (category) => {
    currentCategory = category;
    for (const c of liveCategories) {
      c.button?.classList.toggle("knife-category-active", c.name === category);
    }
    for (const item of list.querySelectorAll("li")) {
      applyFilter(item);
    }
  };

  const categories = document.createElement("div");
  categories.classList.add("knife-categories");
  categories.addEventListener("wheel", (e) => {
    e.preventDefault();
    categories.scrollLeft += e.deltaY;
  });
  node.prepend(categories);

  for (const c of liveCategories) {
    const button = document.createElement("button");
    c.button = button;
    button.classList.add("knife-category");
    button.title = c.name || "없음";
    button.addEventListener("click", () => {
      let category;
      const url = new URL(location.href);
      if (c.name !== currentCategory) {
        category = c.name;
        url.searchParams.set("category", category);
      } else {
        category = null;
        url.searchParams.delete("category");
      }
      history.pushState({ category }, "", url);
      setFilter(category);
    });
    categories.appendChild(button);

    if (c.logo) {
      const logo = document.createElement("img");
      logo.classList.add("knife-category-logo");
      logo.loading = "lazy";
      logo.src = c.logo;
      button.appendChild(logo);
    } else {
      button.textContent = button.title;
    }

    const count = document.createElement("span");
    count.classList.add("knife-category-count");
    count.textContent = `${numberFormatter.format(c.count)}명`;
    button.appendChild(count);
  }

  const url = new URL(location.href);
  setFilter(url.searchParams.get("category"));

  const listObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const n of mutation.addedNodes) {
        if (n.tagName === "LI") {
          applyFilter(n);
        }
      }
    }
  });
  listObserver.observe(list, { childList: true });
};

const cloneButton = (pzp, className, name, iconSvg, onClick, after = false) => {
  const button = pzp?.querySelector(`.${className}`);
  if (button == null) {
    return;
  }
  try {
    const b = button.cloneNode(true);
    b.classList.remove(className);
    b.ariaLabel = name;
    b.setAttribute("label", name);
    b.addEventListener("click", onClick);
    const tooltip = b.querySelector(".pzp-pc-ui-button__tooltip");
    if (tooltip != null) {
      tooltip.innerText = ` ${name} `;
    }
    const icon = b.querySelector(".pzp-ui-icon");
    if (icon != null) {
      icon.innerHTML = iconSvg;
    } else {
      b.innerHTML = iconSvg;
    }
    button.parentNode.insertBefore(b, after ? button.nextSibling : button);
  } catch (e) {}
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
  link.textContent = "통계";
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
      content.innerText = `해상도: ${info.resolution}
비트레이트: ${numberFormatter.format(info.bitrate)} kbps
FPS: ${info.fps}
지연 시간: ${numberFormatter.format(info.latency)} ms
코덱: ${codecs ? `${codecs.video},${codecs.audio}` : "알 수 없음"}`;
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

let pzpVue;
const attachPlayerObserver = async (isLive, tries = 0) => {
  const playerLayout = document.getElementById(
    isLive ? "live_player_layout" : "player_layout"
  );
  if (playerLayout == null) {
    if (tries > 500) {
      return;
    }
    return new Promise((r) => setTimeout(r, 50)).then(() =>
      attachPlayerObserver(isLive, tries + 1)
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

  try {
    const setLiveWide = await findReactState(
      node.parentNode.parentNode.parentNode,
      (state) =>
        state[0]?.length === 1 &&
        state[1]?.length === 2 &&
        state[1]?.[1]?.key === "isLiveWide"
    );
    if (isPopup) {
      setLiveWide?.[0](true);
    }
  } catch (e) {}

  if (isLive) {
    cloneButton(
      pzp,
      "pzp-pc-playback-switch",
      "빨리 감기",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 40"><path fill="#fff" d="M10.57 25.91c.35.17.77.11 1.07-.14L17 21.3V25a.997.997 0 0 0 1.64.77L24 21.3V25c0 .55.45 1 1 1s1-.45 1-1V15c0-.55-.45-1-1-1s-1 .45-1 1v3.7l-5.36-4.47c-.3-.25-.71-.3-1.07-.14-.35.17-.57.52-.57.91v3.7l-5.36-4.47c-.3-.25-.71-.3-1.07-.14-.35.17-.58.52-.58.91v10c0 .39.22.74.57.91Z"/></svg>',
      () => {
        const video = pzp.querySelector("video");
        video.currentTime = video.buffered.end(video.buffered.length - 1);
      },
      true
    );
  }

  if (document.pictureInPictureEnabled) {
    cloneButton(
      pzp,
      "pzp-pc-viewmode-button",
      "PIP 모드",
      '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path fill="#fff" d="M27 9c.55 0 1 .45 1 1v7h-2v-6H10v14h6v2H9c-.55 0-1-.45-1-1V10c0-.55.45-1 1-1h18Zm0 10c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1h-8c-.55 0-1-.45-1-1v-6c0-.55.45-1 1-1h8Zm-1 2h-6v4h6v-4Z"/></svg>',
      () => {
        const video = pzp.querySelector("video");
        video.disablePictureInPicture = false;
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        } else {
          video.requestPictureInPicture();
        }
      }
    );
  }

  if (isLive) {
    try {
      addStatsMenu();
    } catch (e) {}
  }

  corePlayer = await getPlayer(pzp, isLive);

  if (!isLive && corePlayer != null) {
    const getVodResumeTimes = () => {
      let result;
      try {
        result = JSON.parse(window.localStorage.getItem("vodResumeTimes"));
      } catch (e) {}
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

const getPlayer = async (pzp, isLive, tries = 0) => {
  const playerHeader = pzp.querySelector(
    isLive ? ".header_info" : ".prev_button_tooltip"
  )?.firstChild;
  const player = await findReactState(
    playerHeader,
    (state) => state._corePlayer != null
  );
  const corePlayer = player?._corePlayer;
  if (corePlayer == null) {
    if (tries > 500) {
      return;
    }
    return new Promise((r) => setTimeout(r, 50)).then(() =>
      getPlayer(pzp, isLive, tries + 1)
    );
  }
  return corePlayer;
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
  container.parentNode.querySelector(".knife-resize-handle")?.remove();
  const resizeHandle = document.createElement("div");
  resizeHandle.classList.add("knife-resize-handle");
  container.parentNode.insertBefore(resizeHandle, container);

  let x = 0;
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
      config.leftSideChat
        ? e.clientX - x - 1
        : document.documentElement.clientWidth - e.clientX - 1
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
    x = container.getBoundingClientRect().x;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
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
  } catch (e) {}

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
  chatController.messageFilter = (message) => {
    if (!originalFilter.call(chatController, message)) {
      return false;
    }
    if (config.hideDonation && message.type === 10) {
      return false;
    }
    return true;
  };
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

  await initChatFeatures(node.querySelector("aside"));
};

window.addEventListener("popstate", (e) => {
  if (location.pathname === "/lives") {
    setFilter?.(e.state.category);
  }
});

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

document.addEventListener("mouseout", (e) => {
  if (e.relatedTarget?.className?.startsWith?.("video_card_thumbnail__")) {
    if (config.livePreview) {
      showPreview(e.relatedTarget.href, e.relatedTarget);
    }
  } else if (e.target?.className?.startsWith?.("video_card_thumbnail__")) {
    hidePreview(e.target.href);
  }
});

(async () => {
  if (location.pathname.endsWith("/chat")) {
    await initChatFeatures(await waitFor("aside"));
  } else {
    await Promise.all([attachLayoutObserver(), attachBodyObserver()]);
  }
  rootObserver.disconnect();
})();
})();
