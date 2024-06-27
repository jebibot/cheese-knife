document.title = chrome.i18n.getMessage("ext_shortName");
document.getElementById("desc").textContent =
  chrome.i18n.getMessage("permission_desc");

const list = document.getElementById("list");
for (const h of ["chzzk.naver.com"]) {
  const item = document.createElement("li");
  item.textContent = chrome.i18n.getMessage("permission_host", h);
  list.appendChild(item);
}

const grant = document.getElementById("grant");
grant.textContent = chrome.i18n.getMessage("permission_grant");
grant.addEventListener("click", () => {
  chrome.permissions
    .request({ origins: ["*://*.chzzk.naver.com/*"] })
    .then((granted) => {
      if (granted) {
        window.close();
      }
    });
});
