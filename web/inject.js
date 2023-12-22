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

const findReactState = async (node, criteria, tries = 0) => {
  if (node == null) {
    return;
  }
  let fiber = getReactFiber(node);
  if (fiber == null) {
    if (tries > 500) {
      return;
    }
    return new Promise((r) => setTimeout(r, 50)).then(() =>
      findReactState(node, criteria, tries + 1)
    );
  }
  fiber = fiber.return;
  while (fiber != null) {
    let state = fiber.memoizedState;
    while (state != null) {
      if (state.memoizedState != null && criteria(state.memoizedState)) {
        return state.memoizedState;
      }
      state = state.next;
    }
    fiber = fiber.return;
  }
};

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
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((n) => {
      for (const elem of waiting) {
        if (n.querySelector?.(elem.query)) {
          elem.resolve(n);
        }
      }
    });
  });
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
const enablePreview = async () => {
  const preview = document.createElement("div");
  preview.classList.add("knife-preview");
  document.body.appendChild(preview);

  const thumbnail = document.createElement("div");
  thumbnail.classList.add("knife-preview-thumbnail");
  preview.appendChild(thumbnail);

  const img = document.createElement("img");
  thumbnail.appendChild(img);

  const uptime = document.createElement("div");
  uptime.classList.add("knife-preview-uptime");
  thumbnail.appendChild(uptime);

  const viewers = document.createElement("div");
  viewers.classList.add("knife-preview-viewers");
  thumbnail.appendChild(viewers);

  const info = document.createElement("div");
  info.classList.add("knife-preview-info");
  preview.appendChild(info);

  const category = document.createElement("span");
  category.classList.add("knife-preview-category");
  info.appendChild(category);

  const title = document.createElement("span");
  info.appendChild(title);

  const sidebar = await waitFor("#navigation");
  if (sidebar == null) {
    return;
  }

  let previewTimeout;
  const liveInfo = {};
  const addPreviewListener = (item) => {
    const url = new URL(item.href);
    if (url.hostname !== "chzzk.naver.com") {
      return;
    }
    const uid = url.pathname.split("/").pop();
    item.addEventListener("mouseover", async () => {
      if (!config.preview) {
        return;
      }
      clearTimeout(previewTimeout);
      let info = liveInfo[uid];
      if (info === undefined) {
        const res = await fetch(
          `https://api.chzzk.naver.com/service/v1/channels/${uid}/data?fields=topExposedVideos`
        );
        if (!res.ok) {
          return;
        }
        const live = await res.json();
        if (live.code !== 200) {
          return;
        }
        info = live.content?.topExposedVideos?.openLive;
        liveInfo[uid] = info;
      }
      if (info == null) {
        return;
      }
      img.src = info.liveImageUrl?.replace("{type}", 480) || "";
      uptime.textContent = info.openDate
        ? formatTimestamp(Date.now() - new Date(info.openDate).getTime())
        : "";
      viewers.textContent = info.concurrentUserCount
        ? `${numberFormatter.format(info.concurrentUserCount)}명`
        : "";
      category.textContent = info.liveCategoryValue || "";
      title.textContent = info.liveTitle || "";

      const rect = item.getBoundingClientRect();
      preview.style.top = `${rect.top}px`;
      preview.style.left = `${rect.left + rect.width}px`;
      preview.style.opacity = "1";
    });
    item.addEventListener("mouseout", () => {
      clearTimeout(previewTimeout);
      previewTimeout = setTimeout(() => {
        preview.style.opacity = "0";
      }, 500);
    });
  };

  const items = sidebar.querySelectorAll("a");
  for (const item of items) {
    addPreviewListener(item);
  }

  const sidebarObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((n) => {
        if (n.querySelectorAll == null) {
          return;
        }
        const items = n.tagName === "A" ? [n] : n.querySelectorAll("a");
        for (const item of items) {
          addPreviewListener(item);
        }
      });
    });
  });
  sidebarObserver.observe(sidebar, {
    childList: true,
    subtree: true,
  });

  const updateSidebar = (
    await findReactState(
      sidebar,
      (state) => state.tag === 8 && state.destroy == null
    )
  )?.create;
  setInterval(() => {
    if (config.updateSidebar) {
      updateSidebar?.();
    }
  }, 30000);
};

let pipWindow;
const closePip = () => {
  if (pipWindow != null) {
    pipWindow.close();
    pipWindow = null;
  }
};

const attachBodyObserver = async () => {
  const enableFeatures = async (node) =>
    Promise.all([
      await enablePlayerFeatures(node),
      await addChatProcessor(node),
    ]);
  const layoutBody = await waitFor("#layout-body");
  if (layoutBody == null) {
    return;
  }
  const layoutBodyObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((n) => {
        closePip();
        if (n.tagName === "SECTION") {
          enableFeatures(n);
        }
      });
    });
  });
  layoutBodyObserver.observe(layoutBody, { childList: true });
  await enableFeatures(layoutBody.querySelector("section"));
};

const cloneButton = (button, name, iconSvg, onClick, after = false) => {
  if (button == null) {
    return;
  }
  const b = button.cloneNode(true);
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
let viewModeButton;
const enablePlayerFeatures = async (node, tries = 0) => {
  if (node == null) {
    return;
  }
  const isLive = !node.className.includes("vod_");
  const pzp = node.querySelector(".pzp-pc");
  pzpVue = pzp?.__vue__;
  if (pzpVue == null) {
    if (tries > 500) {
      return;
    }
    return new Promise((r) => setTimeout(r, 50)).then(() =>
      enablePlayerFeatures(node, tries + 1)
    );
  }

  const container = node.querySelector(
    '[class^="live_information_video_container__"]'
  );
  const setLiveWide = await findReactState(
    container,
    (state) =>
      state[0]?.length === 1 &&
      state[1]?.length === 2 &&
      state[1]?.[1]?.key === "isLiveWide"
  );
  if (window.top !== window) {
    setLiveWide?.[0](true);
  }

  if (isLive) {
    cloneButton(
      pzp.querySelector(".pzp-pc-playback-switch"),
      "빨리 감기",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 40"><path fill="#fff" d="M10.57 25.91c.35.17.77.11 1.07-.14L17 21.3V25a.997.997 0 0 0 1.64.77L24 21.3V25c0 .55.45 1 1 1s1-.45 1-1V15c0-.55-.45-1-1-1s-1 .45-1 1v3.7l-5.36-4.47c-.3-.25-.71-.3-1.07-.14-.35.17-.57.52-.57.91v3.7l-5.36-4.47c-.3-.25-.71-.3-1.07-.14-.35.17-.58.52-.58.91v10c0 .39.22.74.57.91Z"/></svg>',
      () => {
        const video = pzp.querySelector("video");
        video.currentTime = video.buffered.end(video.buffered.length - 1);
      },
      true
    );
  }

  cloneButton(
    viewModeButton,
    "PIP 모드",
    '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path fill="#fff" d="M27 9c.55 0 1 .45 1 1v7h-2v-6H10v14h6v2H9c-.55 0-1-.45-1-1V10c0-.55.45-1 1-1h18Zm0 10c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1h-8c-.55 0-1-.45-1-1v-6c0-.55.45-1 1-1h8Zm-1 2h-6v4h6v-4Z"/></svg>',
    () => {
      const video = pzp.querySelector("video");
      video.disablePictureInPicture = false;
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        video.requestPictureInPicture();
      }
    }
  );

  addStatsMenu();

  corePlayer = isLive ? await getPlayer(pzp) : null;
};

const getPlayer = async (pzp, tries = 0) => {
  const playerHeader = pzp.querySelector(".header_info")?.firstChild;
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
      getPlayer(pzp, tries + 1)
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
  if (video == null || video.buffered.length === 0) {
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

document.body.addEventListener("keydown", (e) => {
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target?.contentEditable === "true"
  ) {
    return;
  }
  switch (e.key) {
    case "f":
      if (pzpVue != null) {
        if (pzpVue.fullscreen) {
          pzpVue.$store.dispatch("exitFullscreen");
        } else {
          pzpVue.$store.dispatch("requestFullscreen");
        }
      }
      break;
    case "m":
      if (pzpVue != null) {
        pzpVue.muted = !pzpVue.muted;
      }
      break;
    case "t":
      viewModeButton?.click();
      break;
    case "ArrowLeft":
      seek(true);
      break;
    case "ArrowRight":
      seek(false);
      break;
  }
});

function functionThatReturnsTrue() {
  return true;
}

function functionThatReturnsFalse() {
  return false;
}

function createSyntheticEvent(Interface) {
  function SyntheticBaseEvent(
    reactName,
    reactEventType,
    targetInst,
    nativeEvent
  ) {
    this._reactName = reactName;
    this._targetInst = targetInst;
    this.type = reactEventType;
    this.nativeEvent = nativeEvent;
    this.target = nativeEvent.target;
    this.currentTarget = null;

    for (const propName of Interface) {
      this[propName] = nativeEvent[propName];
    }

    if (nativeEvent.defaultPrevented) {
      this.isDefaultPrevented = functionThatReturnsTrue;
    } else {
      this.isDefaultPrevented = functionThatReturnsFalse;
    }
    this.isPropagationStopped = functionThatReturnsFalse;
    return this;
  }

  Object.assign(SyntheticBaseEvent.prototype, {
    preventDefault: function () {
      this.defaultPrevented = true;
      const event = this.nativeEvent;
      if (!event) {
        return;
      }
      event.preventDefault();
      this.isDefaultPrevented = functionThatReturnsTrue;
    },
    stopPropagation: function () {
      const event = this.nativeEvent;
      if (!event) {
        return;
      }
      event.stopPropagation();
      this.isPropagationStopped = functionThatReturnsTrue;
    },
    persist: function () {},
    isPersistent: functionThatReturnsTrue,
  });
  return SyntheticBaseEvent;
}

const EventInterface = [
  "eventPhase",
  "bubbles",
  "cancelable",
  "timeStamp",
  "defaultPrevented",
  "isTrusted",
];
const SyntheticEvent = createSyntheticEvent(EventInterface);

const UIEventInterface = [...EventInterface, "view", "detail"];
const SyntheticUIEvent = createSyntheticEvent(UIEventInterface);

const MouseEventInterface = [
  ...UIEventInterface,
  "screenX",
  "screenY",
  "clientX",
  "clientY",
  "pageX",
  "pageY",
  "ctrlKey",
  "shiftKey",
  "altKey",
  "metaKey",
  "getModifierState",
  "button",
  "buttons",
  "relatedTarget",
  "movementX",
  "movementY",
];
const SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface);

const FocusEventInterface = [...UIEventInterface, "relatedTarget"];
const SyntheticFocusEvent = createSyntheticEvent(FocusEventInterface);

const KeyboardEventInterface = [
  "key",
  "code",
  "location",
  "ctrlKey",
  "shiftKey",
  "altKey",
  "metaKey",
  "repeat",
  "locale",
  "getModifierState",
  "charCode",
  "keyCode",
  "which",
];
const SyntheticKeyboardEvent = createSyntheticEvent(KeyboardEventInterface);

const handlePipEvent = (e) => {
  let reactEventType = e.type;
  let reactName;
  let SyntheticEventCtor = SyntheticEvent;
  switch (e.type) {
    case "keypress":
      reactName = "onKeyPress";
      SyntheticEventCtor = SyntheticKeyboardEvent;
      break;
    case "keydown":
      reactName = "onKeyDown";
      SyntheticEventCtor = SyntheticKeyboardEvent;
      break;
    case "keyup":
      reactName = "onKeyUp";
      SyntheticEventCtor = SyntheticKeyboardEvent;
      break;
    case "input":
      reactName = "onInput";
      break;
    case "click":
      reactName = "onClick";
      SyntheticEventCtor = SyntheticMouseEvent;
      break;
    case "focusin":
      reactName = "onFocus";
      reactEventType = "focus";
      SyntheticEventCtor = SyntheticFocusEvent;
      break;
    case "focusout":
      reactName = "onBlur";
      reactEventType = "blur";
      SyntheticEventCtor = SyntheticFocusEvent;
      break;
    default:
      return;
  }

  let target = e.target;
  let instance;
  let event;
  while (target != null) {
    instance = getReactFiber(target);
    if (instance != null) {
      break;
    }
    target = target.parentNode;
  }
  while (instance != null) {
    const props = getReactProps(instance.stateNode);
    const listener = props?.[reactName];
    if (listener != null && (reactName !== "onClick" || !props.disabled)) {
      if (event == null) {
        event = new SyntheticEventCtor(reactName, reactEventType, instance, e);
      }
      event.currentTarget = instance.stateNode;
      listener.call(undefined, event);
    }
    instance = instance.return;
  }
};

const enterChatPip = async (container) => {
  const parent = container.parentNode;
  pipWindow = await window.documentPictureInPicture.requestWindow({
    width: container.clientWidth,
    height: container.clientHeight,
  });
  [...document.styleSheets].forEach((styleSheet) => {
    try {
      const cssRules = [...styleSheet.cssRules]
        .map((rule) => rule.cssText)
        .join("");
      const style = document.createElement("style");
      style.textContent = cssRules;
      pipWindow.document.head.appendChild(style);
    } catch (e) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = styleSheet.type;
      link.media = styleSheet.media;
      link.href = styleSheet.href;
      pipWindow.document.head.appendChild(link);
    }
  });
  container.style.height = "100vh";
  container.style.width = "100%";
  pipWindow.document.body.append(container);
  pipWindow.addEventListener(
    "unload",
    () => {
      container.style.height = "";
      container.style.width = "";
      parent.append(container);
      closePip();
    },
    { once: true }
  );
  pipWindow.document.body.addEventListener("keypress", handlePipEvent);
  pipWindow.document.body.addEventListener("keydown", handlePipEvent);
  pipWindow.document.body.addEventListener("keyup", handlePipEvent);
  pipWindow.document.body.addEventListener("input", handlePipEvent);
  pipWindow.document.body.addEventListener("click", handlePipEvent);
  pipWindow.document.body.addEventListener("focusin", handlePipEvent);
  pipWindow.document.body.addEventListener("focusout", handlePipEvent);
};

const addChatProcessor = async (node, tries = 0) => {
  if (node == null || node.className.includes("vod_")) {
    return;
  }
  const chattingContainer = node.querySelector("aside");
  const chatController = await findReactState(
    chattingContainer,
    (state) => state.messageFilter != null
  );
  if (chatController == null) {
    if (tries > 500) {
      return;
    }
    return new Promise((r) => setTimeout(r, 50)).then(() =>
      addChatProcessor(node, tries + 1)
    );
  }

  const foldButton = chattingContainer.querySelector(
    '[class*="live_chatting_header_fold__"] > [class^="live_chatting_header_button__"]'
  );
  if (window.top !== window) {
    foldButton?.click();
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

  const originalSetVisibility = chatController.setVisibility;
  chatController.setVisibility = (visible) => {
    if (!visible && pipWindow != null) {
      return;
    }
    originalSetVisibility.call(chatController, visible);
  };

  if ("documentPictureInPicture" in window) {
    foldButton?.addEventListener("click", closePip);
    cloneButton(
      chattingContainer.querySelector(
        '[class*="live_chatting_header_menu__"] > [class^="live_chatting_header_button__"]'
      ),
      "채팅창 팝업",
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 32 32"><path fill="currentColor" d="M18 8c-.55 0-1 .45-1 1s.45 1 1 1h2.58l-6.29 6.29c-.39.39-.39 1.02 0 1.42s1.03.39 1.42 0L22 11.42V14c0 .55.45 1 1 1s1-.45 1-1V9c0-.55-.45-1-1-1h-5Zm-7.5 1A2.5 2.5 0 0 0 8 11.5v10a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5V18c0-.55-.45-1-1-1s-1 .45-1 1v3.5c0 .27-.23.5-.5.5h-10c-.28 0-.5-.23-.5-.5v-10c0-.28.22-.5.5-.5H14c.55 0 1-.45 1-1s-.45-1-1-1h-3.5Z"/></svg>',
      () => {
        if (pipWindow != null) {
          closePip();
        } else {
          enterChatPip(chattingContainer);
        }
      }
    );
  }
};

(async () => {
  await Promise.all([enablePreview(), attachBodyObserver()]);
  rootObserver.disconnect();
})();
