const STYLES = [
  {
    name: "플레이어",
    styles: [
      {
        name: "fit-player",
        description: "화면 채우기",
      },
      {
        name: "volume-percentage",
        description: "볼륨 퍼센트 표시",
      },
    ],
  },
  {
    name: "채팅창",
    styles: [
      {
        name: "hide-ranking",
        description: "후원 랭킹 숨기기",
      },
      {
        name: "left-chat",
        description: "왼쪽 배치",
      },
    ],
  },
  {
    name: "사이드바",
    styles: [
      {
        name: "hide-offline",
        description: "오프라인 채널 숨기기",
      },
      {
        name: "hide-recommended",
        description: "추천 채널 숨기기",
      },
      {
        name: "hide-sidebar-partner",
        description: "파트너 스트리머 숨기기",
      },
      {
        name: "hide-shortcut",
        description: "서비스 바로가기 숨기기",
      },
      {
        name: "right-sidebar",
        description: "오른쪽 배치",
      },
    ],
  },
  {
    name: "툴바",
    styles: [
      {
        name: "static-logo",
        description: "정적 로고",
      },
      {
        name: "hide-studio",
        description: "스튜디오 버튼 숨기기",
      },
      {
        name: "hide-ticket",
        description: "라운지 티켓 버튼 숨기기",
      },
      {
        name: "auto-hide-toolbar",
        description: "자동 숨기기",
      },
    ],
  },
  {
    name: "홈",
    styles: [
      {
        name: "hide-recommended-live",
        description: "추천 방송 숨기기",
      },
    ],
  },
  {
    name: "탐색",
    styles: [
      {
        name: "top-explore",
        description: "사이드바 대신 툴바에 표시",
      },
      {
        name: "hide-blocked",
        description: "차단한 유저 방송 숨기기",
      },
    ],
  },
  {
    name: "기타",
    styles: [
      {
        name: "hide-live-badge",
        description: "생방송 뱃지 숨기기",
      },
      {
        name: "rectangle-profile",
        description: "사각 프로필 이미지",
      },
    ],
  },
];

const list = document.getElementById("list");
const reload = document.getElementById("reload");
reload.addEventListener("click", () => {
  reload.style.display = "none";
  chrome.tabs.reload();
});

(async () => {
  const { styles } = await chrome.storage.local.get({ styles: [] });
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
      checkbox.id = style.name;
      checkbox.checked = stylesSet.has(style.name);
      checkbox.addEventListener("change", async (e) => {
        if (e.target.checked) {
          stylesSet.add(style.name);
        } else {
          stylesSet.delete(style.name);
        }
        await chrome.storage.local.set({ styles: [...stylesSet] });
        reload.style.display = "inline-flex";
      });
      item.appendChild(checkbox);

      const label = document.createElement("label");
      label.textContent = style.description;
      label.htmlFor = style.name;
      item.appendChild(label);
    }
  }
})();
