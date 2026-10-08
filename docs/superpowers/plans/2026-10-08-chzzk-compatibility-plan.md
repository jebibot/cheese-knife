# CHZZK Compatibility Recovery Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline. Keep evidence and decisions in the adjacent progress record. User authorized implementation on 2026-10-08.

**Goal:** Restore Cheese Knife on current CHZZK without relying on Vue for standard controls or hiding unavailable site integrations.

**Architecture:** Keep the ISOLATED settings/filter bridge and MAIN site integration. Add scoped runtime, audio, player and preview modules. Existing site integrations use a bounded adapter and retain individual status.

**Tech Stack:** Node 24, classic content scripts, DOM/Web Audio, jsdom 26.1.0, private vendored HLS.js, Playwright Chromium for separate-profile checks.

**Spec:** [Approved direction and reviewed design](../specs/2026-10-08-chzzk-compatibility-design.md)

## Global Constraints

- Manifest V3, minimum Chrome 121; existing config keys and CSS classes remain compatible.
- origin is Do-hyeon/cheese-knife; main remains at original v2.13.1; no force push or store publication.
- ISOLATED owns extension APIs/storage; MAIN owns DOM/media and optional React integrations.
- No CDN script loading, arbitrary URL broker, cookies permission or site security-policy changes.
- AudioContext/source must not be destroyed just because controls remount.
- Unverified live audio/HLS/site integrations stay UNVERIFIED in the validation record.
- Source unpacked and dist include identical manifest-referenced runtime files and vendor license.

## Review Focus

- Already running audio plus delayed/failed resume and same video reused across routes.
- Native CHZZK keyboard behavior and DVR engine forcing playback back to live.
- CSP/CORS and actual manifest/segment/video playback in an unauthenticated test profile.
- VOD/live classification when both have .pzp-pc and controls/video independently remount.
- Optional React/controller/webpack integrations unavailable while standard features still mount.

## Task 1: D0 diagnostics, tooling and portable package

Files: scripts/inspect-site.mjs, scripts/build.mjs, scripts/check-package.mjs, tests/config.test.cjs, tests/package.test.cjs, package.json/package-lock.json, config.js, validation/progress records.

Interfaces: `normalizeConfig(value)` returns all known keys with validated values. `build(root, target)` copies only manifest references and known pages. `checkPackage(directory)` rejects missing references and version mismatch. Diagnostic stdout contains capability booleans and aggregate media structures only.

- [ ] Install locked test dependencies and use a separate Chromium profile for D0; do not touch the user's Chrome profile.
- [ ] Write tests: `{arrowSeek:false}` retains false plus previewWidth=400; NaN ratio becomes 12, gain-related range validation follows config schema; fake package missing an actual referenced script is rejected; build includes vendor only when referenced.
- [ ] Run tests before fixes: expect missing defaults/range normalization or absent build functions.
- [ ] Implement settings normalization and filesystem build/check functions; check source and dist.
- [ ] Capture public-page MAIN capabilities, current player DOM, media eligibility and preview availability. Record blockers; do not infer actual audio success.
- [ ] Verify complete test suite and package. Commit meaningful tooling/config changes.

## Task 2: Runtime, handshake and bounded site adapter

Files: web/runtime.js, web/site-adapter.js, web/main.js, web/inject.js, manifest.json, tests/runtime.test.cjs, tests/bridge.test.cjs, tests/adapter.test.cjs.

Interfaces: `window[Symbol.for('cheese-knife.runtime.v1')]` owns config/i18n, `setStatus(feature,state,reason)`, `subscribe(callback)`, `route()`, `selectPlayer()`, `createScope()`. Adapter provides `getCorePlayer(node)`, `getWebpackRequire()` and React access without unhandled rejection. Config messages use namespace/protocol/type/requestId/revision.

- [ ] Write tests: /video/123 stays vod even with .pzp-pc; /following stays explore even with tablist; delayed root discovers player; preview excluded; duplicate script load registers once; null/foreign/old config messages do not change state.
- [ ] Run RED, then implement bounded initialization and scope lifecycle; existing code consumes normalized runtime config.
- [ ] Replace optional webpack promise rejection with handled null result; cap optional discovery at 2 seconds.
- [ ] Verify config delivery in either script order and root/player/video replacement. Run complete suite. Commit.

## Task 3: Standard player and audio compressor

Files: web/audio.js, web/player.js, web/main.css, web/inject.js, tests/player.test.cjs, tests/audio.test.cjs.

Interfaces: runtime registers a player reconciler; audio manager exposes `setEnabled(video,boolean)`, `configure(config)`, `setGain(video,gain)`, `bypass(video)`. Return on/off/pending/unavailable only after actual transitions. Player controller has idempotent dispose and owns pointer/key/UI resources.

- [ ] Write RED tests: one fast-forward button without __vue__; click empty buffer does nothing; 5s seek clamps valid disjoint/short ranges; contenteditable/slider untouched; quick VOD release leaves 1.5x unchanged; route cancel restores only an owned rate.
- [ ] Add RED audio tests: pending resume creates no source; off during pending cannot enable later; 20 toggles/repeated UI initialization reuse one source; invalid stored gain resets to 1; source error keeps output untouched.
- [ ] Implement DOM controls, safe range selection and pointer lifecycle.
- [ ] Implement document audio owner and complementary dry/wet gains, safe resume, eligibility and inactive graph cleanup.
- [ ] Move old Vue initialization and global seek behavior out of inject.js. Keep filter independent and scoped.
- [ ] Verify full suite plus actual separate-browser media checks. Preserve UNVERIFIED for live listening not established. Commit.

## Task 4: Cancelable preview with private HLS

Files: web/preview.js, vendor/hls.light.private.js, vendor/hls.js.LICENSE, THIRD_PARTY_NOTICES.md, web/inject.js, tests/preview.test.cjs.

Interfaces: preview owns `show(href,anchor,tooltip)`, `hide(href?)`, one backend/frame and bounded channel cache. Backend exposes play, mute, visibility and dispose; only extension-owned media is disposed.

- [ ] Write RED tests: A fetch completes after B and cannot replace B; hide before response/metadata keeps hidden and silent; same anchor URL change creates new generation; invalid/expired playback remains thumbnail; closing HLS calls destroy once.
- [ ] Implement fetch cancellation/generation/TTL and current core/native/HLS backend selection.
- [ ] Vendor a verified pinned official HLS build with local UMD capture; page window.Hls unchanged. Include original license and exact hash/provenance.
- [ ] Verify full suite, real-frame preview where public API allows it, and all package references. Commit.

## Task 5: Existing integrations, visible status and release evidence

Files: web/inject.js, popup.html/popup.js/popup.css, _locales/*/messages.json, tests/integration.test.cjs, README.md/README-en.md, docs/superpowers/validation/2026-10-08-chzzk-compatibility.md.

Interfaces: feature status relay uses current tab/frame; legacy integrations have independent scope ownership and bounded discovery. `ready` is not equivalent to release validation PASS.

- [ ] Write RED tests for chat resize without controller, duplicate channel button, read-only stats on frozen media, original listener restoration only if still owned, and failure isolation when React absent.
- [ ] Implement integrations against verified site structures. Unavailable data is unknown/limited, never invented.
- [ ] Add popup current-tab capability summary and local load/reload instructions.
- [ ] Run full suite, source/dist load and live/VOD switching checks. Record each requirement as PASS/FAIL/UNVERIFIED.
- [ ] Run independent whole-branch review; fix important findings with RED→GREEN and full suite. Commit/push changes and validation record.

## Progress recording

Use [implementation progress](../validation/2026-10-08-progress.md). Windows execution uses the existing clean, user-selected fork branch and native Node/PowerShell. Shell-specific skill scratch scripts are replaced with this tracked ledger so published history retains decisions and evidence.

Pre-flight: Task 2 runtime is consumed by Tasks 3–5; Task 1 normalizer is consumed by the ISOLATED bridge; Task 4 private HLS is copied through Task 1 manifest-driven package. The package checker must be rerun after each manifest change. No circular dependencies are required.
