const STYLES = [
  {
    name: "light-mode",
    description: "라이트 모드",
  },
  {
    name: "fit-player",
    description: "플레이어 채우기",
  },
  {
    name: "volume-percentage",
    description: "볼륨 퍼센트 표시",
  },
  {
    name: "hide-ranking",
    description: "채팅창 후원 랭킹 숨기기",
  },
  {
    name: "left-chat",
    description: "채팅창 왼쪽 배치",
  },
  {
    name: "hide-offline",
    description: "사이드바 오프라인 채널 숨기기",
  },
  {
    name: "hide-recommended",
    description: "사이드바 추천 채널 숨기기",
  },
  {
    name: "hide-shortcut",
    description: "사이드바 서비스 바로가기 숨기기",
  },
  {
    name: "right-sidebar",
    description: "사이드바 오른쪽 배치",
  },
  {
    name: "hide-studio",
    description: "툴바 스튜디오 버튼 숨기기",
  },
  {
    name: "hide-ticket",
    description: "툴바 라운지 티켓 버튼 숨기기",
  },
  {
    name: "auto-hide-toolbar",
    description: "툴바 자동 숨기기",
  },
  {
    name: "hide-recommended-live",
    description: "메인 추천 방송 숨기기",
  },
  {
    name: "hide-partner",
    description: "메인 파트너 스트리머 소개 숨기기",
  },
  {
    name: "hide-news",
    description: "메인 최근 소식 숨기기",
  },
  {
    name: "hide-live-badge",
    description: "생방송 뱃지 숨기기",
  },
  {
    name: "rectangle-profile",
    description: "사각 프로필 이미지",
  },
];

(async () => {
  const { styles } = await chrome.storage.local.get({ styles: [] });
  const stylesSet = new Set(styles);
  const list = document.getElementById("list");
  for (const style of STYLES) {
    const item = document.createElement("div");
    list.appendChild(item);

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
    });
    item.appendChild(checkbox);

    const label = document.createElement("label");
    label.textContent = style.description;
    label.htmlFor = style.name;
    item.appendChild(label);
  }
})();
