const STYLES = [
  {
    id: "player",
    styles: [
      { id: "fit-player" },
      { id: "volume-percentage" },
      { id: "hide-ff" },
      { id: "hide-comp" },
    ],
  },
  {
    id: "chat",
    styles: [
      { id: "chat-resize" },
      { id: "chat-font-size", type: "range", min: -6, max: 16, step: 1 },
      { id: "chat-timestamp" },
      { id: "hide-ranking" },
      { id: "hide-mission" },
      { id: "left-chat" },
    ],
  },
  {
    id: "sidebar",
    styles: [
      { id: "hide-offline" },
      { id: "hide-recommended" },
      { id: "hide-sidebar-partner" },
      { id: "hide-shortcut" },
      { id: "right-sidebar" },
    ],
  },
  {
    id: "toolbar",
    styles: [
      { id: "static-logo" },
      { id: "hide-topics" },
      { id: "hide-studio" },
      { id: "auto-hide-toolbar" },
    ],
  },
  {
    id: "home",
    styles: [{ id: "hide-recommended-live" }],
  },
  {
    id: "explore",
    styles: [{ id: "top-explore" }, { id: "hide-blocked" }],
  },
  {
    id: "misc",
    styles: [{ id: "hide-live-badge" }, { id: "rectangle-profile" }],
  },
];

document.title = chrome.i18n.getMessage("ext_shortName");
document.getElementById("stylesConfig").textContent =
  chrome.i18n.getMessage("config_styles");

const list = document.getElementById("list");
const reload = document.getElementById("reload");
reload.appendChild(
  document.createTextNode(chrome.i18n.getMessage("config_reload"))
);
reload.addEventListener("click", () => {
  reload.classList.add("hidden");
  chrome.tabs.reload();
});

(async () => {
  const { styles, styleParameters } = await chrome.storage.local.get({
    styles: [],
    styleParameters: {},
  });
  const stylesSet = new Set(styles);
  for (const c of STYLES) {
    const category = document.createElement("div");
    category.classList.add("box");
    list.appendChild(category);

    const title = document.createElement("div");
    title.classList.add("title");
    title.textContent = chrome.i18n.getMessage(`styles_category_${c.id}`);
    category.appendChild(title);

    for (const style of c.styles) {
      const item = document.createElement("div");
      category.appendChild(item);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = stylesSet.has(style.id);
      checkbox.addEventListener("change", async (e) => {
        if (e.target.checked) {
          stylesSet.add(style.id);
        } else {
          stylesSet.delete(style.id);
        }
        await chrome.storage.local.set({ styles: [...stylesSet] });
        reload.classList.remove("hidden");
      });
      item.appendChild(checkbox);

      const label = document.createElement("label");
      label.textContent = chrome.i18n.getMessage(
        `styles_${style.id.replaceAll("-", "_")}`
      );
      label.htmlFor = style.id;
      item.appendChild(label);

      if (style.type == null) {
        checkbox.id = style.id;
      } else {
        checkbox.disabled = true;

        const input = document.createElement("input");
        input.id = style.id;
        if (style.type === "range") {
          input.type = "range";
          input.min = style.min;
          input.max = style.max;
          input.step = style.step;
        }
        input.value = styleParameters[style.id] ?? 0;
        input.addEventListener("input", async (e) => {
          const wasChecked = checkbox.checked;
          styleParameters[style.id] = Number(e.target.value);
          if (styleParameters[style.id]) {
            checkbox.checked = true;
            stylesSet.add(style.id);
          } else {
            checkbox.checked = false;
            stylesSet.delete(style.id);
          }
          current.textContent = e.target.value;

          await chrome.storage.local.set({
            styles: [...stylesSet],
            styleParameters,
          });
          if (checkbox.checked !== wasChecked) {
            reload.classList.remove("hidden");
          }
        });
        item.appendChild(input);

        const current = document.createElement("span");
        current.textContent = input.value;
        item.appendChild(current);
      }
    }
  }
})();
