const STYLES = [
  {
    name: "플레이어",
    styles: [
      {
        id: "fit-player",
        name: "화면 채우기",
      },
      {
        id: "volume-percentage",
        name: "볼륨 퍼센트 표시",
      },
    ],
  },
  {
    name: "채팅창",
    styles: [
      {
        id: "chat-resize",
        name: "채팅창 크기 조절",
      },
      {
        id: "chat-font-size",
        name: "폰트 크기 조절",
        type: "range",
        min: -6,
        max: 16,
        step: 1,
      },
      {
        id: "chat-timestamp",
        name: "타임스탬프 표시",
      },
      {
        id: "hide-ranking",
        name: "후원 랭킹 숨기기",
      },
      {
        id: "left-chat",
        name: "왼쪽 배치",
      },
    ],
  },
  {
    name: "사이드바",
    styles: [
      {
        id: "hide-offline",
        name: "방송 중이 아닌 채널 숨기기",
      },
      {
        id: "hide-recommended",
        name: "추천 채널 숨기기",
      },
      {
        id: "hide-sidebar-partner",
        name: "파트너 스트리머 숨기기",
      },
      {
        id: "hide-shortcut",
        name: "서비스 바로가기 숨기기",
      },
      {
        id: "right-sidebar",
        name: "오른쪽 배치",
      },
    ],
  },
  {
    name: "툴바",
    styles: [
      {
        id: "static-logo",
        name: "정적 로고",
      },
      {
        id: "hide-studio",
        name: "스튜디오 버튼 숨기기",
      },
      {
        id: "hide-ticket",
        name: "라운지 티켓 버튼 숨기기",
      },
      {
        id: "auto-hide-toolbar",
        name: "자동 숨기기",
      },
    ],
  },
  {
    name: "홈",
    styles: [
      {
        id: "hide-recommended-live",
        name: "추천 방송 숨기기",
      },
    ],
  },
  {
    name: "탐색",
    styles: [
      {
        id: "top-explore",
        name: "사이드바 메뉴 툴바에 표시",
      },
      {
        id: "hide-blocked",
        name: "차단한 유저 방송 숨기기",
      },
    ],
  },
  {
    name: "기타",
    styles: [
      {
        id: "hide-live-badge",
        name: "생방송 뱃지 숨기기",
      },
      {
        id: "rectangle-profile",
        name: "사각 프로필 이미지",
      },
    ],
  },
];

const list = document.getElementById("list");
const reload = document.getElementById("reload");
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
    title.textContent = c.name;
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
      label.textContent = style.name;
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
