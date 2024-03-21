async function registerStyles(styles) {
  await chrome.scripting.unregisterContentScripts();
  if (!Array.isArray(styles)) {
    return;
  }
  styles = styles.filter((t) =>
    [
      "auto-hide-toolbar",
      "fit-player",
      "hide-live-badge",
      "hide-news",
      "hide-offline",
      "hide-partner",
      "hide-ranking",
      "hide-recommended-live",
      "hide-recommended",
      "hide-shortcut",
      "hide-studio",
      "hide-ticket",
      "left-chat",
      "rectangle-profile",
      "right-sidebar",
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
  const { styles } = await chrome.storage.local.get({ styles: [] });
  await registerStyles(styles);
  await checkPermission();
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
chrome.permissions.onRemoved.addListener(checkPermission);

chrome.storage.local.onChanged.addListener(async ({ styles }) => {
  if (styles != null) {
    await registerStyles(styles.newValue);
  }
});
