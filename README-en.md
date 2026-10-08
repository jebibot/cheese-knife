# ![Logo](./icon48.png) Cheese Knife

> CHZZK Toolkit

## Compatibility recovery preview

Branch `codex/chzzk-compatibility-recovery` contains a 2.13.2 recovery preview based on upstream v2.13.1. It adds Vue-free controls/compression, cancelable HLS previews, scoped page lifecycles, and per-tab feature readiness. It is not the upstream store release.

[Korean contribution PR #81](https://github.com/jebibot/cheese-knife/pull/81) is open against upstream. It discloses verified scope, unverified states and audio/environment limits, not full restoration or release approval. No store deployment or merge was performed. Historical candidate/pending notes below describe their respective stages; use the [latest readiness summary](docs/superpowers/validation/2026-10-08-contribution-readiness.md) for current status.

165 automated tests passed; controlled real audio output and separate-browser public preview frame progression were also recorded. See the [independent implementation review](docs/superpowers/reviews/2026-10-08-implementation-review.md), [installed-Chrome VOD hold fix review](docs/superpowers/reviews/2026-10-08-vod-hold-review.md), and [whole-branch review and follow-up](docs/superpowers/reviews/2026-10-08-whole-branch-review.md). The [latest contribution-readiness summary](docs/superpowers/validation/2026-10-08-contribution-readiness.md) distinguishes installed acceptance, automated contracts and unverified boundaries across all 25 setting leaves and 25 styles. Earlier candidate/refresh-pending sections are historical records; full acceptance and release approval remain pending.

The [follow-up readiness review](docs/superpowers/reviews/2026-10-08-final-readiness-review.md) found reused sidebar-link/VOD-tooltip and hold-OFF cancellation defects. One user-approved fix pass added fourteen tests: twelve RED→GREEN plus two protective characterizations; Node136/style91/filter17 passed at that stage. After the user refreshed the extension, [controlled installed reuse and trusted VOD input checks](docs/superpowers/validation/2026-10-08-restored-settings-and-runtime-checks.md) also passed. A guarded deleted-message candidate and current mission/blocked CSS were added later and submitted in the contribution PR without counting remaining actual-event/environment gaps as full restoration.

The Gain slider is now 48px with an 8px end gap, checked in installed Chrome. [Synthetic audio-quality diagnostics](docs/superpowers/validation/2026-10-08-audio-quality-and-gain-spacing.md) document defaults and transition improvement candidates, not a subjective sound-quality guarantee. DSP is unchanged. Reproduce with `node scripts/check-audio-quality.mjs --chrome`; a fresh profile captures synthetic floating output while sending zeros to speakers, without recording broadcasts.

The [follow-up Gain smoothing and preview-delay fix](docs/superpowers/validation/2026-10-08-gain-smoothing-follow-up.md) ramps updates over 10ms and overlaps loading with the hover delay. The user confirmed preview works normally. After the [full-feature audit](docs/superpowers/validation/2026-10-08-full-feature-audit.md), the left-chat live player collapse was fixed and installed live/VOD layout and chat resizing were checked. That stage's settings-race, preview-cancellation, popup-drag and status fixes required manual refresh; later installed results are recorded separately. Unverified [full-feature acceptance](docs/superpowers/plans/2026-10-08-full-feature-acceptance.md) boundaries remain distinct from the user-approved limited contribution PR.

Check out this branch, load the repository root or built `dist` at `chrome://extensions`, temporarily disable the old Cheese Knife extension to avoid duplicate injection, and reload CHZZK tabs. A local extension with a different ID does not automatically share store-extension settings. Do not delete the old extension or its settings.

A guarded [live deleted-chat candidate](docs/superpowers/validation/2026-10-08-restored-settings-and-runtime-checks.md) preserves native content and other listeners without JSX, historical recovery or server lookup. The user confirmed installed readiness and original OFF restoration including the ownership fix, not an actual natural deletion event/label rendering. Current automated records are deleted29/full165/style108/filter17. Installed expanded mission hiding ON and original OFF restoration were checked; actual party/blocked targets were absent. Missing native contracts and VOD deletion remain limited. Native-button sidebar refresh/expansion passed basic installed checks, not every variant. Stats show resolution/measured FPS; unverified bitrate/latency are unknown. Compression requires an eligible same-origin blob source and may require a user gesture. Age-restricted previews are not played. Full installed-Chrome/Firefox verification is pending. See [validation](docs/superpowers/validation/2026-10-08-chzzk-compatibility.md), [design](docs/superpowers/specs/2026-10-08-chzzk-compatibility-design.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

Develop with Node 24: `npm ci`, `npm test`, `npm run check`, `npm run build`. The package excludes dependencies, tests and backup files.

The [new adapter/CSS review](docs/superpowers/reviews/2026-10-08-deleted-chat-and-style-review.md) identified stale retention after an external in-place hidden-status/content/identity change. The fix requires current NORMAL/type/identity/content ownership and retires mismatched records: seven RED→GREEN cases, deleted29/full165/style108/filter17 plus build/package checks passed. The refreshed installation's readiness and original OFF restoration were user-confirmed, with ordinary playback/chat preserved; actual natural deletion remains unverified. The earlier readiness report does not certify these later changes.

Run explicit native CSS checks with `node scripts/check-styles.mjs --chrome`; these do not add a browser requirement to the Node test suite. [Installed preview timing and style audit](docs/superpowers/validation/2026-10-08-preview-timing-and-style-audit.md) records the configured one-second wait, temporary 100ms comparison, four scoped style candidates and remaining acceptance.

The [toolbar layout follow-up](docs/superpowers/validation/2026-10-08-installed-follow-up-and-toolbar-design.md) records 33 native CSS cases and 7 actual viewport/sidebar combinations. Top navigation uses the toolbar at 1800px or wider with search separated from menus; narrower views retain the native sidebar. Auto-hide now handles the current sticky header and keyboard focus. Installed-Chrome checks passed for both enabled options, focus recovery and five viewports; full style acceptance remains incomplete.

Run synthetic video filter diagnostics with `node scripts/check-video-filters.mjs --chrome`. Seventeen cases check actual CSS-filtered video pixels, reset, native PZP filter preservation and single application, but do not guarantee the user's GPU behavior or sharpening edge quality. The [installed-filter investigation](docs/superpowers/validation/2026-10-08-restored-settings-and-runtime-checks.md) distinguishes failures, regressions and pending installed acceptance.

The [home recommendation hiding candidate](docs/superpowers/validation/2026-10-08-home-recommendation-recovery.md) hides only the ordinary home recommendation grid, preserving editorial promotions, following and recent VODs. The responsive fix passed Node 101 and native CSS 40 cases, followed by installed narrow/wide rerender, route cleanup/reapplication and stored-option OFF/ON restoration checks without temporary CSS. [Additional installed checks](docs/superpowers/validation/2026-10-08-installed-remaining-function-checks.md) include user-confirmed fullscreen/Esc operation and subsequent start-time selector recovery. Remaining full acceptance is still in progress.

[Player-style checks](docs/superpowers/validation/2026-10-08-style-baseline-and-acceptance.md) confirmed button hiding, volume-label toggling and restoration, and identified a current VOD fit-player regression caused by the legacy selector and inline height reservation. That change passed Node109, native CSS49 and actual temporary-rule VOD A/B checks. The refreshed extension's stored option ON passed basic normal/wide-mode checks without temporary CSS, followed by original OFF restoration. The scoped nickname-badge fix passed Node109, native CSS58 and actual temporary-rule live/VOD A/B checks; the refreshed extension also passed basic font8 badge, multi-badge and emote sizing without temporary CSS. Original chat-setting restoration, sidebar checks and remaining full acceptance are in progress. Account entitlement prevents actual time-machine verification, which is not counted as full acceptance.

The [start-time follow-up](docs/superpowers/validation/2026-10-08-start-time-selector-recovery.md) adds current live/VOD targets while preserving existing lookup, cache, cancellation and URL guards. After manual refresh, basic installed display, reentry, route cleanup and replacement-card cache reuse were confirmed. VOD screenshot capture and all-mode/full-feature acceptance remain separate boundaries.

[Website](https://www.chz.app/) | [Discord](https://discord.gg/9kq3UNKAkz) | [Chrome Web Store (compatible with Chromium, Edge, Whale)](https://chromewebstore.google.com/detail/nfkfgkkhgglkgnlppncolmpekidapkjh) | [Firefox Add-ons](https://addons.mozilla.org/addon/cheese-knife/) | [Korean](./README-en.md)

![Screenshot](./images/en.png)

[Sidebar follow-up](docs/superpowers/validation/2026-10-08-style-baseline-and-acceptance.md) confirmed original chat/sidebar setting restoration but found that ordinal hiding rules could hide general navigation during partial loading. Four current-DOM rules now use owned section identity markers while retaining scoped legacy rules. Node120, separate-profile browser84 (including production JS/CSS integration), build and package checks passed. Installed acceptance requires a manual extension refresh; full acceptance and PR creation remain pending.

## Features

The refreshed extension preserved general navigation during cold loading, expanded hiding and basic SPA transitions. Actual collapse removes the entire service header; that input is now covered by a follow-up correction with Node122/browser84 passing. The refreshed follow-up retained hiding without temporary CSS during actual collapse, native compact-state restoration after reload and compact SPA transitions. Remaining toolbar/explore/profile setting checks, full acceptance and PR creation remain pending.

Stored toolbar/explore/badge option inversion and basic responsive layout were checked. A two-selector CSS correction for missed live/VOD channel-info avatars passed Node122/browser91 and actual temporary-rule A/B checks. The refreshed extension subsequently preserved sizes and generic thumbnails while squaring those profiles; the original eight settings were restored. Blocked-broadcast hiding remains unverified without an actual blocked target and is not counted as full acceptance.

An installed filter test reproduced native PZP CSS overriding the extension filter. A CSS candidate preserves the native video pipeline and applies the extension filter once to its source wrapper. Node122/style91/filter17 and actual VOD temporary application/removal passed. Actual live A/B remains unverified because of a diagnostic limitation; full new-CSS installed acceptance and neutral-setting restoration require manual extension refresh. Full acceptance, final review and PR creation remain pending.

### Explore

- **Live Preview:** Preview live by hovering over the channel.
- **Refresh Sidebar:** Refresh the sidebar every 30 seconds.
- **Popup Player:** View multiple lives in one window.

### Player

- **Stats Menu:** Select Stats from the right-click menu to view resolution, bitrate, FPS, latency, and codec.
- **Seek with Arrow Keys:** Use the arrow keys to rewind a short amount of time.
- **Video Filters:** Adjust video brightness, contrast, and gamma, and apply a sharpen filter.
- **Audio Compressor:** Reduce loud sounds to adjust the dynamic range to make the sound more comfortable.

### Chat

- **Hide Donation Messages:** Hide Cheese messages in the chat.
- Adjust chat panel and font size

It also adds many other useful features and allows to customize styles.

> This extension is not affiliated with CHZZK, and related trademarks are the property of their respective owners. This extension is provided "as-is" without any warranties, and the developer assumes no responsibility for any issues, damages, or data loss resulting from its use.
