document.getElementById("grant").addEventListener("click", () => {
  chrome.permissions
    .request({ origins: ["*://*.chzzk.naver.com/*"] })
    .then((granted) => {
      if (granted) {
        window.close();
      }
    });
});
