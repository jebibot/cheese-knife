# Gain smoothing follow-up and preview diagnosis

User authorized continued work while away, then preview diagnosis and a Korean contribution PR only after verification. Explicit stop condition: if extension refresh cannot be performed autonomously, stop at the required stage. Base: `2b7a67e`.

## Bounded design and implementation

Continue the previously recommended Gain smoothing within `web/audio.js`. Preserve Gain range, immediately reflected/stored UI target, compressor parameters and dry/wet behavior. Initialize a new disconnected wet graph directly; later Gain changes linearly reach their target in 10ms. Retarget an active transition at its analytically interpolated current value, not its old target. Unchanged values on configuration/re-enable do not restart the ramp. No delay compensation or limiter was added; those require separate design and acceptance.

Three production-module regressions failed against the base (missing scheduling), then passed after implementation. One strict timestamp assertion required a floating-point tolerance (2.005+0.01); that test failure was arithmetic comparison, not a production change. Native output was also measured in the silent synthetic harness, not merely inferred from test doubles.

After smoothing, all 12 Gain transitions at 250/750/1000Hz had maximum adjacent-sample steps equal to the maximum of their settled endpoints in that run. Representative 250Hz 100→150%: 0.018248 instead of prior 0.186250; 1kHz 200→0%: 0.096639 instead of prior 0.535117. Phase/timing vary between runs. Default steady output, THD and the 14 ordinary cases' zero >1 samples were unchanged within displayed precision. The toggle dip and custom-profile headroom risk remain; this change does not claim to fix them or guarantee subjective click-free sound.

Reproduce: `node scripts/check-audio-quality.mjs --chrome` and compare Gain transition maximum adjacent-sample steps with their pre/post settled endpoints in the generated report. This is a regression probe for these signals, not universal audio quality certification.

## Preview investigation, not a declared fix

Read the installed homepage DOM: configuration ready, valid 32-character channel links in `#sidebar`, native homepage thumbnail video present. The user's wide live layout had no sidebar links, which alone is not a preview bug. Existing hidden panel / stale stream-loading status on that live page is not sufficient evidence of the failure cause.

In a fresh system Chrome 155.0.8059.39 profile on the public homepage, loaded the actual manifest MAIN modules and default normalized configuration, added production CSS, and hovered the first real sidebar link (not a fabricated anchor or a direct `preview.show` call). At 7 seconds, preview/livePreview ready, panel visible, media readyState4, time5.926324, decodedFrames294. This shows actual hover/API/stream playback for that public case, but does not load the extension or establish the user's failed case. No login or age/security gate was bypassed. No speculative preview fix was made.

## Required pause before installed acceptance / PR

User-browser diagnostics subsequently returned browser unavailable. Native app automation is disabled; no supported interface is available for the local extension's refresh button. A normal page reload does not refresh the extension. Do not use filesystem edits, settings/security changes, synthetic extension API calls or a new browser profile as substitutes for the required installed-extension refresh.

Prepared candidate: full suite64/64 passed, dist build succeeded. Prepare and preserve the candidate, then STOP before installed acceptance. User must refresh the local extension at `chrome://extensions`; afterwards resume actual live Gain acceptance and reproduce the particular preview failure (sidebar tooltip versus main thumbnail, settings, network/playback state). Do not open a contribution PR yet: the user's all-verifications condition is unmet. Preserve the branch and upstream/main; no store deployment.

Focused read-only review found no Critical/Important issue and reran audio tests10/10. One Minor remains for resumption: if native source creation throws after initializing Gain, a retry creates a new gain node but retains entry-scoped transition tracking; an unchanged target may then skip initialization and leave the new node at unity. Add a failure/retry regression and associate/reset transition tracking for new nodes before PR readiness. Product work was stopped at the user-mandated refresh boundary rather than silently treating this edge or installed acceptance as complete.

## Resumption: CDP and delayed-preview follow-up

User refreshed the extension and enabled full CDP. Current supported CDP became available for HTTP(S) tab-origin debugging/input; attempting to claim the known chrome://extensions tab still returned internal-tab unavailable. This does not establish that every browser/CDP implementation forbids extension management; it describes the currently exposed tools. No security/access settings were changed by the agent.

Reloaded the actual installed homepage and hovered a real sidebar link via CDP mouse input. Preview/livePreview became ready and a visible moving preview was photographed. Native media time/decoded frames advanced36.174139/2031→40.652054/2295. Right click on its anchor changed muted true→false at volume0.05→true; moving away hid the panel and removed the media. No signed playback URL or raw chat content is persisted in this record. Screenshot is ignored output/acceptance/installed-preview-playing.png.

User clarified that the failure is several seconds of hover before display. Source investigation found serial API latency + full configured delay + starting stream loading only at display. Fix candidate counts delay from hover start and starts muted loading as soon as metadata arrives, overlapping the remaining wait. Two RED→GREEN regressions verify delayed metadata and preloaded-stream disposal. It preserves the configured delay and protected-stream rejection, but first video frame still depends on external playback loading. Actual installed timing after this new change remains pending another extension refresh.

The source-creation retry Minor was reproduced (replacement Gain1 instead of1.5) then fixed by clearing transition tracking whenever a new Gain node is created; audio suite11/11 passed. User expanded scope to all feature settings and styles. The [full acceptance plan](../plans/2026-10-08-full-feature-acceptance.md) tracks these unfinished checks. Whole-feature acceptance and PR are not complete.

Final candidate: full suite70/70, build and both package checks PASS. Source/dist audio and preview module hashes match. Separate system Chrome public-preview smoke after delay changes: time0→1.93024, decoded frames0→60, readyState4, hide removed media/panel; after settling, zero additional measured HLS media requests. This is not the installed timing result. Focused independent review found no Critical/Important findings and ran audio/preview25/25. Nonblocking Minor: Date.now deadline can be affected by wall-clock changes; consider monotonic timing with a clock-adjustment regression in a later batch. User was asked to refresh the new dist; work stopped at that required installed-acceptance gate. No contribution PR opened.
