if (
  location.hostname === "chzzk.naver.com" &&
  !location.pathname.startsWith("/chat/") &&
  !location.pathname.startsWith("/donation/")
) {
  const initConfig = (config) => {
    setFilters(config);
    if (!config.rememberTime) {
      window.localStorage.removeItem("vodResumeTimes");
    }
    window.postMessage({ type: "config", config }, location.origin);
  };

  const initStyleParameters = (styleParameters) => {
    if (!isNaN(styleParameters["chat-font-size"])) {
      for (const t of [1, 2, 10, 20]) {
        document.documentElement.style.setProperty(
          `--knife-chat-size-${t}`,
          `${styleParameters["chat-font-size"] / t}px`
        );
      }
    }
  };

  const storagePromise = chrome.storage.local.get({
    config: {
      preview: true,
      livePreview: true,
      previewWidth: 400,
      previewDelay: 1,
      previewVolume: 5,
      updateSidebar: true,
      popupPlayer: true,
      arrowSeek: true,
      rememberTime: true,
      brightness: 1,
      contrast: 1,
      gamma: 1,
      sharpness: 0,
      hideDonation: false,
      optimizeEmotes: false,
    },
    styleParameters: {},
  });

  window.addEventListener("message", async (e) => {
    switch (e.data.type) {
      case "getConfig":
        const { config, styleParameters } = await storagePromise;
        initConfig(config);
        initStyleParameters(styleParameters);
        break;
    }
  });

  chrome.storage.local.onChanged.addListener((changes) => {
    if (changes.config != null) {
      initConfig(changes.config.newValue);
    }
    if (changes.styleParameters != null) {
      initStyleParameters(changes.styleParameters.newValue);
    }
  });

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("web/inject.js");
  document.body.appendChild(script);

  const createSVGElement = (name) =>
    document.createElementNS("http://www.w3.org/2000/svg", name);
  const svg = createSVGElement("svg");
  if (navigator.userAgent.includes("Firefox")) {
    svg.style.height = "0";
  } else {
    svg.style.display = "none";
  }

  const filter = createSVGElement("filter");
  filter.id = "knifeFilter";
  svg.appendChild(filter);
  document.body.appendChild(svg);

  const setFilters = (config) => {
    const filters = [];
    for (const f of ["brightness", "contrast", "gamma"]) {
      const v = config[f];
      if (isNaN(v) || v === 1) {
        continue;
      }
      const transfer = createSVGElement("feComponentTransfer");
      filters.push(transfer);

      for (const ff of ["feFuncR", "feFuncG", "feFuncB"]) {
        const func = createSVGElement(ff);
        switch (f) {
          case "brightness":
            func.setAttribute("type", "linear");
            func.slope.baseVal = v;
            break;
          case "contrast":
            func.setAttribute("type", "linear");
            func.slope.baseVal = v;
            func.intercept.baseVal = -v / 2 + 0.5;
            break;
          case "gamma":
            func.setAttribute("type", "gamma");
            func.exponent.baseVal = v;
            break;
        }
        transfer.appendChild(func);
      }
    }

    const s = config.sharpness;
    if (s > 0) {
      const v = Number((s / 5).toFixed(2));
      const conv = createSVGElement("feConvolveMatrix");
      conv.preserveAlpha.baseVal = true;
      conv.setAttribute(
        "kernelMatrix",
        `0 ${-v} 0 ${-v} ${1 + v * 4} ${-v} 0 ${-v} 0`
      );
      filters.push(conv);
    }
    filter.replaceChildren(...filters);
    if (filters.length) {
      document.body.classList.add("knife-filter");
    } else {
      document.body.classList.remove("knife-filter");
    }
  };
}
