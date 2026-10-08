document.title = chrome.i18n.getMessage("ext_shortName");
document.getElementById("stylesConfig").textContent =
  chrome.i18n.getMessage("config_styles");

(async () => {
  const box = document.getElementById("capabilities");
  const message = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
  const title = document.createElement("div"); title.className = "title";
  title.textContent = message("capability_title", "Current tab"); box.append(title);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.tabs.sendMessage(tab.id, { type: "cheese-knife-status" }, { frameId: 0 });
    let shown = 0;
    for (const feature of ["player", "compressor", "preview", "livePreview", "chatResize", "donationChat", "deletedChat", "sidebarRefresh", "statistics"]) {
      const status = result?.statuses?.[feature];
      if (!status) continue;
      const row = document.createElement("div"); row.className = "capability-row";
      const name = document.createElement("span"); name.textContent = message("capability_" + feature, feature);
      const value = document.createElement("span"); value.className = "capability-state " + status.state;
      value.textContent = message("capability_state_" + status.state, status.state);
      if (status.reason) row.title = message("capability_reason_" + status.reason.replaceAll("-", "_"), message("capability_reason_generic", "This feature is not available on the current page."));
      row.append(name, value); box.append(row); shown++;
    }
    if (!shown) throw new Error("no-active-features");
  } catch {
    const note = document.createElement("div"); note.className = "desc";
    note.textContent = message("capability_reload", "Open a CHZZK tab and reload it after updating the extension."); box.append(note);
  }
})();

let hardwareAcceleration = false;
try {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
  hardwareAcceleration = !!gl;
} catch {}

getConfig().then(({ config }) => {
  const list = document.getElementById("list");
  const createRow = (c) => {
    const row = document.createElement("div");
    row.classList.add("row");

    const label = document.createElement("label");
    label.htmlFor = c.id;
    const desc = chrome.i18n.getMessage(`config_${c.id}_desc`);
    if (desc) {
      label.title = desc;
    }
    label.textContent = chrome.i18n.getMessage(`config_${c.id}`);
    row.appendChild(label);

    let warning;
    if (c.id === "sharpness") {
      warning = document.createElement("a");
      warning.style.visibility =
        config[c.id] && !hardwareAcceleration ? "visible" : "hidden";
      warning.href = "#";
      warning.title = chrome.i18n.getMessage(`config_${c.id}_warning`);
      warning.textContent = "⚠️";
      warning.addEventListener("click", () => {
        chrome.tabs.create({
          url: navigator.userAgent.includes("Firefox")
            ? "about:preferences"
            : "chrome://settings/system",
        });
      });
      label.appendChild(warning);
    }

    const input = document.createElement("input");
    input.id = c.id;
    row.appendChild(input);

    if (c.type == null) {
      input.type = "checkbox";
      input.checked = config[c.id];
      input.addEventListener("change", (e) => {
        config[e.target.id] = e.target.checked;
        chrome.storage.local.set({ config });
      });
    } else if (c.type === "range") {
      input.type = "range";
      input.min = c.min;
      input.max = c.max;
      input.step = c.step;
      input.value = config[c.id];
      input.addEventListener("input", (e) => {
        config[e.target.id] = Number(e.target.value);
        setCurrent(e.target.value);
        chrome.storage.local.set({ config });

        if (warning != null) {
          warning.style.visibility =
            config[e.target.id] && !hardwareAcceleration ? "visible" : "hidden";
        }
      });
      input.addEventListener("dblclick", () => {
        input.value = Number(c.defaultValue);
        input.dispatchEvent(new Event("input"));
      });

      const current = document.createElement("span");
      const setCurrent = (v) => {
        current.textContent = c.digits ? Number(v).toFixed(c.digits) : v;
      };
      setCurrent(input.value);
      row.appendChild(current);

      if (c.unit) {
        row.appendChild(document.createTextNode(c.unit));
      }
    }
    return row;
  };

  for (const { id, configs } of CONFIGS) {
    const box = document.createElement("div");
    box.classList.add("box");
    list.appendChild(box);

    const title = document.createElement("div");
    title.classList.add("title");
    title.textContent = chrome.i18n.getMessage(`config_category_${id}`);
    box.appendChild(title);

    for (const c of configs) {
      if (c.type === "details") {
        const details = document.createElement("details");
        box.appendChild(details);

        const summary = document.createElement("summary");
        summary.textContent = chrome.i18n.getMessage(`config_category_${c.id}`);
        details.appendChild(summary);

        for (const cc of c.configs) {
          details.appendChild(createRow(cc));
        }

        const desc = chrome.i18n.getMessage(`config_category_${c.id}_desc`);
        if (desc) {
          const d = document.createElement("div");
          d.classList.add("desc");
          d.textContent = desc;
          details.appendChild(d);
        }
        continue;
      }
      box.appendChild(createRow(c));
    }
  }
});
