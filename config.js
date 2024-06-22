var CONFIGS = [
  {
    name: "미리보기",
    configs: [
      {
        id: "preview",
        name: "사이드바 미리보기",
        defaultValue: true,
      },
      {
        id: "livePreview",
        name: "방송 미리보기",
        defaultValue: true,
      },
      {
        id: "previewWidth",
        name: "크기",
        type: "range",
        min: 300,
        max: 1000,
        step: 50,
        unit: "px",
        defaultValue: 400,
      },
      {
        id: "previewDelay",
        name: "영상 지연",
        desc: "지정된 시간만큼 경과한 후 미리보기를 재생합니다.",
        type: "range",
        min: 0.1,
        max: 3,
        step: 0.1,
        digits: 1,
        unit: "s",
        defaultValue: 1,
      },
      {
        id: "previewVolume",
        name: "영상 볼륨",
        type: "range",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        defaultValue: 5,
      },
    ],
  },
  {
    name: "탐색",
    configs: [
      {
        id: "updateSidebar",
        name: "사이드바 갱신",
        desc: "30초마다 사이드바를 새로고침 합니다.",
        defaultValue: true,
      },
      {
        id: "expandFollowings",
        name: "팔로잉 채널 자동 펼치기",
        defaultValue: false,
      },
      {
        id: "popupPlayer",
        name: "팝업 플레이어",
        desc: "사이드바에서 채널을 드래그하면 플레이어를 작은 창으로 띄웁니다.",
        defaultValue: true,
      },
    ],
  },
  {
    name: "플레이어",
    configs: [
      {
        id: "arrowSeek",
        name: "방향키 탐색",
        desc: "생방송에서 짧은 시간을 되돌려 볼 수 있습니다.",
        defaultValue: true,
      },
      {
        id: "rememberTime",
        name: "재생 위치 기억",
        desc: "다시보기에서 마지막으로 본 위치를 기억하여 이어 재생합니다.",
        defaultValue: true,
      },
      {
        type: "details",
        name: "비디오 필터",
        desc: "기본값으로 설정하려면 더블 클릭하세요.",
        configs: [
          {
            id: "brightness",
            name: "밝기",
            type: "range",
            min: 0,
            max: 3,
            step: 0.05,
            digits: 2,
            defaultValue: 1,
          },
          {
            id: "contrast",
            name: "대비",
            type: "range",
            min: 0,
            max: 3,
            step: 0.05,
            digits: 2,
            defaultValue: 1,
          },
          {
            id: "gamma",
            name: "감마",
            type: "range",
            min: 0,
            max: 3,
            step: 0.05,
            digits: 2,
            defaultValue: 1,
          },
          {
            id: "sharpness",
            name: "선명도",
            desc: "샤픈 필터를 적용합니다.",
            type: "range",
            min: 0,
            max: 10,
            step: 0.1,
            digits: 1,
            defaultValue: 0,
          },
        ],
      },
      {
        type: "details",
        name: "오디오 컴프레서",
        desc: "기본값으로 설정하려면 더블 클릭하세요. 볼륨 옆 버튼을 눌러 활성화할 수 있으며 스타일 설정에서 숨길 수 있습니다.",
        configs: [
          {
            id: "compressorThreshold",
            name: "Thr.",
            desc: "이 크기보다 소리가 커지면 컴프레서가 작동합니다.",
            type: "range",
            min: -100,
            max: 0,
            step: 1,
            unit: "dB",
            defaultValue: -50,
          },
          {
            id: "compressorKnee",
            name: "Knee",
            desc: "값이 높을수록 컴프레서가 좀 더 부드럽게 작동합니다.",
            type: "range",
            min: 0,
            max: 40,
            step: 1,
            unit: "dB",
            defaultValue: 40,
          },
          {
            id: "compressorRatio",
            name: "Ratio",
            desc: "소리의 크기를 얼마나 줄일지 비율입니다.",
            type: "range",
            min: 1,
            max: 20,
            step: 0.5,
            digits: 1,
            defaultValue: 12,
          },
          {
            id: "compressorAttack",
            name: "Attack",
            desc: "소리가 커졌을 때 소리가 줄어드는데 걸리는 시간입니다.",
            type: "range",
            min: 0,
            max: 1,
            step: 0.01,
            digits: 2,
            unit: "s",
            defaultValue: 0,
          },
          {
            id: "compressorRelease",
            name: "Release",
            desc: "소리가 작아졌을 때 소리가 다시 커지는데 걸리는 시간입니다.",
            type: "range",
            min: 0,
            max: 1,
            step: 0.01,
            digits: 2,
            unit: "s",
            defaultValue: 0.25,
          },
        ],
      },
    ],
  },
  {
    name: "채팅",
    configs: [
      {
        id: "hideDonation",
        name: "후원 메시지 숨기기",
        defaultValue: false,
      },
      {
        id: "showDeleted",
        name: "블라인드된 메시지 보기",
        desc: "삭제된 채팅을 지우지 않고 취소선으로 표시합니다.",
        defaultValue: false,
      },
      {
        id: "optimizeEmotes",
        name: "애니메이션 이모티콘 최적화",
        defaultValue: false,
      },
    ],
  },
];

const DEFAULT_CONFIGS = {};
for (const { configs } of CONFIGS) {
  for (const c of configs) {
    if (c.type === "details") {
      for (const cc of c.configs) {
        DEFAULT_CONFIGS[cc.id] = cc.defaultValue;
      }
    } else {
      DEFAULT_CONFIGS[c.id] = c.defaultValue;
    }
  }
}

function getConfig(includeStyleParameters) {
  return chrome.storage.local.get({
    config: DEFAULT_CONFIGS,
    ...(includeStyleParameters ? { styleParameters: {} } : {}),
  });
}
