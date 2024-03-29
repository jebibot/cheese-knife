if (
  location.hostname === "chzzk.naver.com" &&
  !location.pathname.startsWith("/chat/") &&
  !location.pathname.startsWith("/donation/")
) {
  const initConfig = (config) => {
    if (!config.rememberTime) {
      window.localStorage.removeItem("vodResumeTimes");
    }
    document.body.classList.toggle("knife-resize-chat", !!config.resizeChat);
  };

  window.addEventListener("message", async (e) => {
    switch (e.data.type) {
      case "getConfig":
        const { config } = await chrome.storage.local.get({
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
        });
        initConfig(config);
        window.postMessage({ type: "config", config }, location.origin);
        break;
    }
  });

  chrome.storage.local.onChanged.addListener((changes) => {
    if (changes.config != null) {
      const config = changes.config.newValue;
      initConfig(config);
      window.postMessage({ type: "config", config }, location.origin);
    }
  });

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("web/inject.js");
  document.body.appendChild(script);

  chrome.storage.local.get({ t: 0 }).then(({ t }) => {
    if (isNaN(t)) {
      t = 0;
      chrome.storage.local.set({ t });
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    if (navigator.userAgent.includes("Firefox")) {
      svg.style.height = "0";
    } else {
      svg.style.display = "none";
    }

    const filter = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "filter"
    );
    filter.id = "filterSharpen";

    const conv = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "feConvolveMatrix"
    );
    conv.preserveAlpha.baseVal = true;
    const setKernel = (s) => {
      if (s === 0) {
        document.body.classList.remove("knife-sharpen");
      } else {
        document.body.classList.add("knife-sharpen");
        conv.setAttribute(
          "kernelMatrix",
          `0 ${-s / 5} 0 ${-s / 5} ${1 + (s * 4) / 5} ${-s / 5} 0 ${-s / 5} 0`
        );
      }
    };
    setKernel(t);

    chrome.storage.local.onChanged.addListener((changes) => {
      if ("t" in changes) {
        setKernel(changes.t.newValue);
      }
    });

    filter.appendChild(conv);
    svg.appendChild(filter);
    document.body.appendChild(svg);
  });
}
