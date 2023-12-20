document.querySelectorAll("a").forEach((a) => {
  a.onclick = (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: a.href });
  };
});

chrome.storage.local
  .get({
    config: {
      preview: true,
      disableClickToPlay: true,
      arrowSeek: true,
      hideDonation: false,
      chatColor: true,
    },
    t: 0,
  })
  .then(({ config, t }) => {
    for (const c in config) {
      const checkbox = document.getElementById(c);
      checkbox.checked = config[c];
      checkbox.addEventListener("change", (e) => {
        config[e.target.id] = e.target.checked;
        chrome.storage.local.set({ config });
      });
    }

    if (isNaN(t)) {
      t = 0;
      chrome.storage.local.set({ t });
    }
    const sharpness = document.getElementById("sharpness");
    const current = document.getElementById("current");
    sharpness.value = t;
    current.textContent = t;
    sharpness.addEventListener("input", (e) => {
      const t = Number(e.target.value);
      chrome.storage.local.set({ t });
      current.textContent = t;
    });
  });
