var CONFIGS = [
  {
    id: "preview",
    configs: [
      {
        id: "preview",
        defaultValue: true,
      },
      {
        id: "livePreview",
        defaultValue: true,
      },
      {
        id: "previewWidth",
        type: "range",
        min: 300,
        max: 1000,
        step: 50,
        unit: "px",
        defaultValue: 400,
      },
      {
        id: "previewDelay",
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
        type: "range",
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        defaultValue: 5,
      },
      {
        id: "thumbnailPreview",
        type: "details",
        configs: [
          {
            id: "rightClickToUnmute",
            defaultValue: true,
          },
          {
            id: "customPreview",
            defaultValue: false,
          },
        ],
      },
    ],
  },
  {
    id: "explore",
    configs: [
      {
        id: "updateSidebar",
        defaultValue: true,
      },
      {
        id: "expandFollowings",
        defaultValue: false,
      },
      {
        id: "popupPlayer",
        defaultValue: true,
      },
    ],
  },
  {
    id: "player",
    configs: [
      {
        id: "arrowSeek",
        defaultValue: true,
      },
      {
        id: "pressToFastForward",
        defaultValue: true,
      },
      {
        id: "videoFilter",
        type: "details",
        configs: [
          {
            id: "brightness",
            type: "range",
            min: 0,
            max: 3,
            step: 0.05,
            digits: 2,
            defaultValue: 1,
          },
          {
            id: "contrast",
            type: "range",
            min: 0,
            max: 3,
            step: 0.05,
            digits: 2,
            defaultValue: 1,
          },
          {
            id: "gamma",
            type: "range",
            min: 0,
            max: 3,
            step: 0.05,
            digits: 2,
            defaultValue: 1,
          },
          {
            id: "sharpness",
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
        id: "compressor",
        type: "details",
        configs: [
          {
            id: "compressorDefault",
            defaultValue: false,
          },
          {
            id: "compressorThreshold",
            type: "range",
            min: -100,
            max: 0,
            step: 1,
            unit: "dB",
            defaultValue: -50,
          },
          {
            id: "compressorKnee",
            type: "range",
            min: 0,
            max: 40,
            step: 1,
            unit: "dB",
            defaultValue: 40,
          },
          {
            id: "compressorRatio",
            type: "range",
            min: 1,
            max: 20,
            step: 0.5,
            digits: 1,
            defaultValue: 12,
          },
          {
            id: "compressorAttack",
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
    id: "chat",
    configs: [
      {
        id: "hideDonation",
        defaultValue: false,
      },
      {
        id: "showDeleted",
        defaultValue: false,
      },
      {
        id: "optimizeEmotes",
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
