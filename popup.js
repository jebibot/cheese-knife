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
      sharpness: 0,
      hideDonation: false,
      optimizeEmotes: false,
    },
  })
  .then(({ config }) => {
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
  });
