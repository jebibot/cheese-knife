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

chrome.runtime.onInstalled.addListener(checkPermission);
chrome.runtime.onStartup.addListener(checkPermission);
chrome.permissions.onRemoved.addListener(checkPermission);
