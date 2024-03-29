chrome.storage.local
  .get({
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
      hideDonation: false,
      resizeChat: false,
    },
    t: 0,
  })
  .then(({ config, t }) => {
    for (const c in config) {
      const input = document.getElementById(c);
      if (input == null) {
        continue;
      }
      if (input.type === "checkbox") {
        input.checked = config[c];
        input.addEventListener("change", (e) => {
          config[e.target.id] = e.target.checked;
          chrome.storage.local.set({ config });
        });
      } else {
        const current = input.parentElement.querySelector(".current");
        input.value = config[c];
        current.textContent = config[c];
        input.addEventListener("input", (e) => {
          config[e.target.id] = Number(e.target.value);
          current.textContent = e.target.value;
          chrome.storage.local.set({ config });
        });
      }
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
