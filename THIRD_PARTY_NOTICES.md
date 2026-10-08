# Third-party notices

Cheese Knife is based on [jebibot/cheese-knife](https://github.com/jebibot/cheese-knife), MIT, Copyright (c) 2023- jebibot. The original [LICENSE](LICENSE) is retained. Compatibility work consulted [scweeny commit 4930117](https://github.com/scweeny/cheese-knife/commit/493011729f9e49486254c34c1f6395b9626893ee) and [upstream PR #70](https://github.com/jebibot/cheese-knife/pull/70); their commits were not imported wholesale.

## HLS.js

- Upstream: [video-dev/hls.js](https://github.com/video-dev/hls.js)
- Package/version: `hls.js@1.6.16` from the official npm distribution, pinned by package-lock.json.
- Original file: `dist/hls.light.min.js`.
- Original SHA-256: `947b45be1392e39569d4aefc2cff9ff6ecbe6cc246cf67ab12ece0c41c24b793`.
- Included file: `vendor/hls.light.private.js`.
- Changes: capture the UMD CommonJS export in a local closure, register it on the Cheese Knife runtime, remove the source-map comment. The library implementation is unchanged and does not overwrite the website's global Hls.
- License: Apache-2.0; full original license at [vendor/hls.js.LICENSE](vendor/hls.js.LICENSE), including its copyright notices.
- Reproduce vendoring after dependency installation: `node scripts/vendor-hls.mjs`.

The extension contains this library locally. No executable script is fetched from a CDN at runtime.
