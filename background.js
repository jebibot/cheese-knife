async function initConfig() {
  let changed = false;
  let { config, styles, t } = await chrome.storage.local.get([
    "config",
    "styles",
    "t",
  ]);
  if (config?.resizeChat) {
    changed = true;
    delete config.resizeChat;
    styles ||= [];
    if (!styles.includes("chat-resize")) {
      styles.push("chat-resize");
    }
  }
  if (t != null) {
    if (!isNaN(t)) {
      changed = true;
      config.sharpness = t;
    }
    await chrome.storage.local.remove("t");
  }
  if (changed) {
    chrome.storage.local.onChanged.removeListener(onStylesChanged);
    await chrome.storage.local.set({ config, styles });
    chrome.storage.local.onChanged.addListener(onStylesChanged);
  }
  return { config, styles };
}

function onStylesChanged({ styles }) {
  if (styles != null) {
    registerStyles(styles.newValue);
  }
}

async function registerStyles(styles) {
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
      "hide-live-badge",
      "hide-offline",
      "hide-ranking",
      "hide-recommended-live",
      "hide-recommended",
      "hide-sidebar-partner",
      "hide-shortcut",
      "hide-studio",
      "hide-ticket",
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
  const { styles } = await initConfig();
  await registerStyles(styles);
  await checkPermission();
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
chrome.permissions.onRemoved.addListener(checkPermission);
chrome.storage.local.onChanged.addListener(onStylesChanged);
