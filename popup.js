chrome.storage.local
  .get({
    config: {
      preview: true,
      livePreview: true,
      previewWidth: 400,
      previewDelay: 1,
      previewVolume: 5,
      updateSidebar: true,
      expandFollowings: false,
      popupPlayer: true,
      arrowSeek: true,
      rememberTime: true,
      brightness: 1,
      contrast: 1,
      gamma: 1,
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
        const setCurrent = (v) => {
          current.textContent = current.dataset.digits
            ? Number(v).toFixed(current.dataset.digits)
            : v;
        };
        input.value = config[c];
        setCurrent(config[c]);
        input.addEventListener("input", (e) => {
          config[e.target.id] = Number(e.target.value);
          setCurrent(e.target.value);
          chrome.storage.local.set({ config });
        });
        if (input.dataset.default) {
          input.addEventListener("dblclick", () => {
            input.value = Number(input.dataset.default);
            input.dispatchEvent(new Event("input"));
          });
        }
      }
    }
  });
