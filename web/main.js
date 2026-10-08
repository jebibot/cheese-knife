const initConfig = (config) => {
  currentConfig = normalizeConfig(config);
  setFilters(currentConfig);
  if (requestId) sendConfig();
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

let currentConfig;
let currentParameters = {};
let revision = 0;
let requestId;
let statuses = {};
let diagnostics = {};
let changedBeforeLoad = false;
let parametersChangedBeforeLoad = false;
const sendConfig = () => window.postMessage({ namespace: "cheese-knife", protocol: 1,
  type: "config", requestId, revision: revision++, config: currentConfig, i18n }, location.origin);
const configPromise = getConfig(true);
window.addEventListener("message", async (e) => {
  const data = e.data;
  if (e.source !== window || e.origin !== location.origin || data == null || typeof data !== "object" ||
    data.namespace !== "cheese-knife" || data.protocol !== 1) return;
  if (data.type === "config-request" && typeof data.requestId === "string" && data.requestId.length <= 100) {
    requestId = data.requestId;
    try {
      const stored = await configPromise;
      if (!changedBeforeLoad || !currentConfig) currentConfig = stored.config;
      if (!parametersChangedBeforeLoad) currentParameters = stored.styleParameters;
      setFilters(currentConfig);
      initStyleParameters(currentParameters);
      sendConfig();
    } catch { /* MAIN reports the bounded configuration timeout. */ }
  } else if (data.type === "status" && data.statuses && typeof data.statuses === "object") {
    const accepted = {};
    for (const [key, value] of Object.entries(data.statuses).slice(0, 30)) {
      if (/^[a-zA-Z][a-zA-Z0-9-]{0,39}$/.test(key) && value &&
        ["pending", "ready", "limited", "failed", "disabled"].includes(value.state)) {
        accepted[key] = { state: value.state, reason: typeof value.reason === "string" ? value.reason.slice(0, 80) : "" };
      }
    }
    statuses = accepted;
    diagnostics = data.diagnostics?.world === "MAIN" ? data.diagnostics : {};
    let node = document.getElementById("knife-status");
    if (!node) { node = document.createElement("script"); node.id = "knife-status"; node.type = "application/json"; document.body.appendChild(node); }
    node.textContent = JSON.stringify({ statuses, diagnostics });
  }
});
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type === "cheese-knife-status") respond({ statuses, diagnostics });
});

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.config != null) {
    changedBeforeLoad = true;
    initConfig(changes.config.newValue);
  }
  if (changes.styleParameters != null) {
    parametersChangedBeforeLoad = true;
    currentParameters = changes.styleParameters.newValue || {};
    initStyleParameters(currentParameters);
  }
});

const i18n = {};
for (const m of [
  "close",
  "chat",
  "stats",
  "resolution",
  "bitrate",
  "fps",
  "latency",
  "codec",
  "unknown",
  "fastForward",
  "enableCompressor",
  "disableCompressor",
  "liveStart",
  "speed2x",
  "measured"
]) {
  i18n[m] = chrome.i18n.getMessage(`content_${m}`);
}
const i18nScript = document.createElement("script");
i18nScript.id = "knife-i18n";
i18nScript.type = "application/json";
i18nScript.textContent = JSON.stringify(i18n);
document.body.appendChild(i18nScript);

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

  const sat = config.saturation;
  if (!isNaN(sat) && sat !== 1) {
    const color = createSVGElement("feColorMatrix");
    color.setAttribute("type", "saturate");
    const v = svg.createSVGNumber();
    v.value = sat;
    color.values.baseVal.initialize(v);
    filters.push(color);
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
