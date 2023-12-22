/**
 * Copyright 2016 Dan Salvato LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function bit2linear(channel) {
  // http://www.brucelindbloom.com/Eqn_RGB_to_XYZ.html
  // This converts rgb 8bit to rgb linear, lazy because the other algorithm is really really dumb
  //return Math.pow(channel, 2.2);

  // CSS Colors Level 4 says 0.03928, Bruce Lindbloom who cared to write all algos says 0.04045, used bruce because whynawt
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

const Color = {};

Color._canvas = null;
Color._context = null;

const RGBAColor = (Color.RGBA = function (r, g, b, a) {
  this.r = r || 0;
  this.g = g || 0;
  this.b = b || 0;
  this.a = a || 0;
});

const HSLAColor = (Color.HSLA = function (h, s, l, a) {
  this.h = h || 0;
  this.s = s || 0;
  this.l = l || 0;
  this.a = a || 0;
});

const XYZAColor = (Color.XYZA = function (x, y, z, a) {
  this.x = x || 0;
  this.y = y || 0;
  this.z = z || 0;
  this.a = a || 0;
});

const LUVAColor = (Color.LUVA = function (l, u, v, a) {
  this.l = l || 0;
  this.u = u || 0;
  this.v = v || 0;
  this.a = a || 0;
});

// RGBA Colors

RGBAColor.fromName = function (name) {
  let context = Color._context;
  if (!context) {
    const canvas = (Color._canvas = document.createElement("canvas"));
    context = Color._context = canvas.getContext("2d");
  }

  context.clearRect(0, 0, 1, 1);
  context.fillStyle = name;
  context.fillRect(0, 0, 1, 1);
  const data = context.getImageData(0, 0, 1, 1);

  if (!data || !data.data || data.data.length !== 4) return null;

  return new RGBAColor(
    data.data[0],
    data.data[1],
    data.data[2],
    data.data[3] / 255
  );
};

RGBAColor.fromCSS = function (rgb) {
  if (!rgb) return null;

  rgb = rgb.trim();

  if (rgb.charAt(0) === "#") return RGBAColor.fromHex(rgb);

  const match =
    /rgba?\( *(\d+%?) *, *(\d+%?) *, *(\d+%?) *(?:, *([\d.]+))?\)/i.exec(rgb);
  if (match) {
    let r = match[1],
      g = match[2],
      b = match[3],
      a = match[4];

    if (r.charAt(r.length - 1) === "%") r = 255 * (parseInt(r, 10) / 100);
    else r = parseInt(r, 10);

    if (g.charAt(g.length - 1) === "%") g = 255 * (parseInt(g, 10) / 100);
    else g = parseInt(g, 10);

    if (b.charAt(b.length - 1) === "%") b = 255 * (parseInt(b, 10) / 100);
    else b = parseInt(b, 10);

    if (a)
      if (a.charAt(a.length - 1) === "%") a = parseInt(a, 10) / 100;
      else a = parseFloat(a);
    else a = 1;

    return new RGBAColor(
      Math.min(Math.max(0, r), 255),
      Math.min(Math.max(0, g), 255),
      Math.min(Math.max(0, b), 255),
      Math.min(Math.max(0, a), 1)
    );
  }

  return RGBAColor.fromName(rgb);
};

RGBAColor.fromHex = function (code, alpha = 1) {
  if (code.charAt(0) === "#") code = code.slice(1);

  if (code.length === 3)
    code = `${code[0]}${code[0]}${code[1]}${code[1]}${code[2]}${code[2]}`;
  else if (code.length === 4)
    code = `${code[0]}${code[0]}${code[1]}${code[1]}${code[2]}${code[2]}${code[3]}${code[3]}`;

  if (code.length === 8) {
    alpha = parseInt(code.slice(6), 16) / 255;
    code = code.slice(0, 6);
  } else if (code.length !== 6) throw new Error("invalid hex code");

  const raw = parseInt(code, 16);
  return new RGBAColor(
    raw >> 16, // Red
    (raw >> 8) & 0x00ff, // Green
    raw & 0x0000ff, // Blue,
    alpha // Alpha
  );
};

RGBAColor.fromHSLA = function (h, s, l, a) {
  if (s === 0) {
    const v = Math.round(Math.min(Math.max(0, 255 * l), 255));
    return new RGBAColor(v, v, v, a === undefined ? 1 : a);
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
    p = 2 * l - q;

  return new RGBAColor(
    Math.round(Math.min(Math.max(0, 255 * hue2rgb(p, q, h + 1 / 3)), 255)),
    Math.round(Math.min(Math.max(0, 255 * hue2rgb(p, q, h)), 255)),
    Math.round(Math.min(Math.max(0, 255 * hue2rgb(p, q, h - 1 / 3)), 255)),
    a === undefined ? 1 : a
  );
};

RGBAColor.prototype.toHSLA = function () {
  return HSLAColor.fromRGBA(this.r, this.g, this.b, this.a);
};
RGBAColor.prototype.toCSS = function () {
  return `rgb${this.a !== 1 ? "a" : ""}(${Math.round(this.r)},${Math.round(
    this.g
  )},${Math.round(this.b)}${this.a !== 1 ? `,${this.a}` : ""})`;
};
RGBAColor.prototype.toXYZA = function () {
  return XYZAColor.fromRGBA(this.r, this.g, this.b, this.a);
};

RGBAColor.prototype.luminance = function () {
  const r = bit2linear(this.r / 255),
    g = bit2linear(this.g / 255),
    b = bit2linear(this.b / 255);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// HSL Colors

HSLAColor.fromRGBA = function (r, g, b, a) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = Math.min(Math.max(0, (max + min) / 2), 1),
    d = Math.min(Math.max(0, max - min), 1);

  let h, s;

  if (d === 0) h = s = 0;
  else {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return new HSLAColor(h, s, l, a === undefined ? 1 : a);
};

HSLAColor.prototype.targetLuminance = function (target) {
  let s = this.s,
    min = 0,
    max = 1;

  s *= Math.pow(this.l > 0.5 ? -this.l : this.l - 1, 7) + 1;

  let d = (max - min) / 2,
    mid = min + d;

  for (; d > 1 / 65536; d /= 2, mid = min + d) {
    const luminance = RGBAColor.fromHSLA(this.h, s, mid, 1).luminance();
    if (luminance > target) {
      max = mid;
    } else {
      min = mid;
    }
  }

  return new HSLAColor(this.h, s, mid, this.a);
};

HSLAColor.prototype.toRGBA = function () {
  return RGBAColor.fromHSLA(this.h, this.s, this.l, this.a);
};

// XYZ Colors

XYZAColor.fromRGBA = function (r, g, b, a) {
  const R = bit2linear(r / 255),
    G = bit2linear(g / 255),
    B = bit2linear(b / 255);

  return new XYZAColor(
    0.412453 * R + 0.35758 * G + 0.180423 * B,
    0.212671 * R + 0.71516 * G + 0.072169 * B,
    0.019334 * R + 0.119193 * G + 0.950227 * B,
    a === undefined ? 1 : a
  );
};

XYZAColor.prototype.toLUVA = function () {
  return LUVAColor.fromXYZA(this.x, this.y, this.z, this.a);
};

// LUV Colors

XYZAColor.EPSILON = Math.pow(6 / 29, 3);
XYZAColor.KAPPA = Math.pow(29 / 3, 3);
XYZAColor.WHITE = new RGBAColor(255, 255, 255, 1).toXYZA();

LUVAColor.fromXYZA = function (X, Y, Z, a) {
  const deltaGammaFactor =
      1 / (XYZAColor.WHITE.x + 15 * XYZAColor.WHITE.y + 3 * XYZAColor.WHITE.z),
    uDeltaGamma = 4 * XYZAColor.WHITE.x * deltaGammaFactor,
    vDeltagamma = 9 * XYZAColor.WHITE.y * deltaGammaFactor,
    yGamma = Y / XYZAColor.WHITE.y;

  let deltaDivider = X + 15 * Y + 3 * Z;
  if (deltaDivider === 0) {
    deltaDivider = 1;
  }

  const deltaFactor = 1 / deltaDivider,
    uDelta = 4 * X * deltaFactor,
    vDelta = 9 * Y * deltaFactor,
    L =
      yGamma > XYZAColor.EPSILON
        ? 116 * Math.pow(yGamma, 1 / 3) - 16
        : XYZAColor.KAPPA * yGamma,
    u = 13 * L * (uDelta - uDeltaGamma),
    v = 13 * L * (vDelta - vDeltagamma);

  return new LUVAColor(L, u, v, a === undefined ? 1 : a);
};

class ColorAdjuster {
  constructor(base = "#232323", contrast = 4.5) {
    this._contrast = contrast;
    this._base = base;

    this.rebuildContrast();
  }

  get contrast() {
    return this._contrast;
  }
  set contrast(val) {
    this._contrast = val;
    this.rebuildContrast();
  }

  get base() {
    return this._base;
  }
  set base(val) {
    this._base = val;
    this.rebuildContrast();
  }

  get dark() {
    return this._dark;
  }

  rebuildContrast() {
    this._cache = new Map();

    const base = RGBAColor.fromCSS(this._base),
      lum = base.luminance();

    const dark = (this._dark = lum < 0.5);

    if (dark) {
      this._luv = new XYZAColor(
        0,
        this._contrast * (base.toXYZA().y + 0.05) - 0.05,
        0,
        1
      ).toLUVA().l;

      this._luma = this._contrast * (base.luminance() + 0.05) - 0.05;
    } else {
      this._luv = new XYZAColor(
        0,
        (base.toXYZA().y + 0.05) / this._contrast - 0.05,
        0,
        1
      ).toLUVA().l;

      this._luma = (base.luminance() + 0.05) / this._contrast - 0.05;
    }
  }

  process(color, throw_errors = false) {
    if (color instanceof RGBAColor) color = color.toCSS();

    if (!color) return null;

    if (this._cache.has(color)) return this._cache.get(color);

    let rgb;

    try {
      rgb = RGBAColor.fromCSS(color);
    } catch (err) {
      if (throw_errors) throw err;

      return null;
    }

    // HSL Luma
    const luma = rgb.luminance();

    if (this._dark ? luma < this._luma : luma > this._luma)
      rgb = rgb.toHSLA().targetLuminance(this._luma).toRGBA();

    const out = rgb.toCSS();
    this._cache.set(color, out);
    return out;
  }
}

const findReactState = async (node, criteria, tries = 0) => {
  if (node == null) {
    return;
  }
  let fiber = Object.entries(node).find(([k]) =>
    k.startsWith("__reactFiber$")
  )[1];
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

  const headerSection = await waitFor("section");
  if (headerSection == null) {
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

  const items = headerSection.querySelectorAll("a");
  for (const item of items) {
    addPreviewListener(item);
  }

  const headerSectionObserver = new MutationObserver((mutations) => {
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
  headerSectionObserver.observe(headerSection, {
    childList: true,
    subtree: true,
  });
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
      let codec;
      const hls = corePlayer?.player?._mediaController?._hls;
      if (hls != null) {
        const level = hls.levels?.[hls.currentLevel];
        if (level != null) {
          codec = `${level.videoCodec},${level.audioCodec}`;
        }
      }
      content.innerText = `해상도: ${info.resolution}
비트레이트: ${numberFormatter.format(info.bitrate)} kbps
FPS: ${info.fps}
지연 시간: ${numberFormatter.format(info.latency)} ms
코덱: ${codec || "알 수 없음"}`;
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

const enablePlayerFeatures = async (node, tries = 0) => {
  if (node == null) {
    return;
  }
  const isLive = !node.className.includes("vod_");
  const pzp = node.querySelector(".pzp-pc");
  const vue = pzp?.__vue__;
  if (vue == null) {
    if (tries > 500) {
      return;
    }
    return new Promise((r) => setTimeout(r, 50)).then(() =>
      enablePlayerFeatures(node, tries + 1)
    );
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
    pzp.querySelector(".pzp-pc-viewmode-button"),
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

document.body.addEventListener("keydown", (e) => {
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target?.contentEditable === "true"
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

const colorAdjuster = new ColorAdjuster("#141517");
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
  if (chatController.knifePatched) {
    return;
  }
  chatController.knifePatched = true;

  const colorMap = new Map();
  const originalFilter = chatController.messageFilter;
  chatController.messageFilter = (message) => {
    if (!originalFilter.call(chatController, message)) {
      return false;
    }
    if (config.hideDonation && message.type === 10) {
      return false;
    }
    colorMap.set(message.profile.nickname, message.user.slice(0, 6));
    return true;
  };

  const chatObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((n) => {
        if (!config.chatColor || n.querySelector == null) {
          return;
        }
        const span = n.querySelector(
          '[class^="live_chatting_username_nickname__"]'
        );
        const nick = n.querySelector('[class^="name_text__"]')?.textContent;
        if (span != null && !span.style.color && colorMap.has(nick)) {
          span.style.color = colorAdjuster.process(`#${colorMap.get(nick)}`);
        }
      });
    });
  });
  chatObserver.observe(chattingContainer, { childList: true, subtree: true });
};

(async () => {
  await Promise.all([enablePreview(), attachBodyObserver()]);
  rootObserver.disconnect();
})();
