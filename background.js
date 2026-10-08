let stylesRevision = 0;
let configRevision = 0;
let latestConfig;
async function initConfig() {
  const startingStylesRevision = stylesRevision;
  const startingConfigRevision = configRevision;
  let changed = false;
  let migratedStyles = false;
  let { config, styles, t } = await chrome.storage.local.get([
    "config",
    "styles",
    "t",
  ]);
  if (t != null) await chrome.storage.local.remove("t");
  const newerConfig = configRevision !== startingConfigRevision;
  if (newerConfig) config = latestConfig;
  if (config?.resizeChat) {
    changed = true;
    migratedStyles = true;
    delete config.resizeChat;
    if (!Array.isArray(styles)) styles = [];
    if (!styles.includes("chat-resize")) {
      styles.push("chat-resize");
    }
  }
  if (t != null && !newerConfig) {
    if (!isNaN(t)) {
      changed = true;
      config ||= {};
      config.sharpness = t;
    }
  }
  if (changed) {
    await chrome.storage.local.set({ config,
      ...(migratedStyles && stylesRevision === startingStylesRevision ? { styles } : {}),
    });
  }
  return { config, styles };
}

function onStylesChanged({ styles, config }) {
  if (config != null) { configRevision++; latestConfig = config.newValue; }
  if (styles != null) {
    stylesRevision++;
    registerStyles(styles.newValue);
  }
}

let stylesRegistration = Promise.resolve();
function registerStyles(styles) {
  const snapshot = Array.isArray(styles) ? [...styles] : styles;
  const next = stylesRegistration.catch(() => {}).then(() => applyStyles(snapshot));
  stylesRegistration = next;
  return next;
}

async function applyStyles(styles) {
  await chrome.scripting.unregisterContentScripts();
  if (!Array.isArray(styles)) {
    return;
  }
  styles = styles.filter((t) =>
    [
      "auto-hide-toolbar",
      "chat-font-size",
      "chat-resize",
      "chat-timestamp",
      "fit-player",
      "hide-blocked",
      "hide-comp",
      "hide-ff",
      "hide-mission",
      "hide-live-badge",
      "hide-offline",
      "hide-ranking",
      "hide-recommended-live",
      "hide-recommended",
      "hide-schedule",
      "hide-sidebar-partner",
      "hide-shortcut",
      "hide-studio",
      "hide-topics",
      "left-chat",
      "rectangle-profile",
      "right-sidebar",
      "static-logo",
      "top-explore",
      "volume-percentage",
    ].includes(t)
  );
  if (styles.length === 0) {
    return;
  }
  await chrome.scripting.registerContentScripts([
    {
      id: "styles",
      matches: ["*://chzzk.naver.com/*"],
      css: styles.map((t) => `styles/${t}.css`),
      runAt: "document_start",
    },
  ]);
}

async function checkPermission() {
  const granted = await chrome.permissions.contains({
    origins: ["*://*.chzzk.naver.com/*"],
  });
  if (!granted) {
    chrome.tabs.create({
      url: chrome.runtime.getURL("permission.html"),
    });
  }
}

async function init() {
  const startingStylesRevision = stylesRevision;
  const { styles } = await initConfig();
  if (stylesRevision === startingStylesRevision) await registerStyles(styles);
  else await stylesRegistration;
  await checkPermission();
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
chrome.permissions.onRemoved.addListener(checkPermission);
chrome.storage.local.onChanged.addListener(onStylesChanged);
