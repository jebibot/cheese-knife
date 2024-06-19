getConfig().then(({ config }) => {
  const list = document.getElementById("list");
  const createRow = (c) => {
    const row = document.createElement("div");
    row.classList.add("row");

    const label = document.createElement("label");
    label.htmlFor = c.id;
    if (c.desc) {
      label.title = c.desc;
    }
    label.textContent = c.name;
    row.appendChild(label);

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

  for (const { name, configs } of CONFIGS) {
    const box = document.createElement("div");
    box.classList.add("box");
    list.appendChild(box);

    const title = document.createElement("div");
    title.classList.add("title");
    title.textContent = name;
    box.appendChild(title);

    for (const c of configs) {
      if (c.type === "details") {
        const details = document.createElement("details");
        box.appendChild(details);

        const summary = document.createElement("summary");
        summary.textContent = c.name;
        details.appendChild(summary);

        for (const cc of c.configs) {
          details.appendChild(createRow(cc));
        }

        if (c.desc) {
          const desc = document.createElement("div");
          desc.classList.add("desc");
          desc.textContent = c.desc;
          details.appendChild(desc);
        }
        continue;
      }
      box.appendChild(createRow(c));
    }
  }
});
