# Audio quality diagnostics and Gain spacing — 2026-10-08

Scope: user requested audio quality testing and approved a 48px slider plus 8px end gap. Base `a87f4b4`, recovery preview 2.13.2. Only `web/main.css` changes production behavior; DSP/configuration/keyboard handlers are unchanged. This is not full release acceptance.

## Installed Chrome UI

Before: slider width 64px, slider-to-native “실시간” slot gap 0px (requested width/gap check failed). After the user refreshed the local extension and the live page was reloaded: width 48px, gap 8px (PASS). The original wide-player mode was restored. Final DOM check: compressor on, Gain 1.5, media playing and unmuted; input min/max/step remain 0/2/0.05.

The change adds `margin-inline-end: 8px` to `.knife-comp` and reduces `.knife-gain-slider` width to 48px. Screenshot is local/ignored `output/acceptance/gain-spacing-fixed.png`, not published to GitHub. Actual slider keyboard input was attempted but focus moved to the native player and the value did not change; do not label this a keyboard PASS. Broader responsive/fullscreen/PIP layouts are not verified.

## Reproducible native audio test

Run `node scripts/check-audio-quality.mjs --chrome` after installing the locked development dependencies and system Chrome. Without `--chrome`, an installed Playwright Chromium is required. Latest run: system Chrome 155.0.8059.39, fresh temporary profile, 48kHz, one native media source and one native compressor. It loads production config/runtime/audio/player modules into a controlled page, not the installed extension.

Synthetic stereo 16-bit WAV data only. An AudioWorklet copies the summed floating output before returning zeros to the real speakers; interception is established while media is paused. No broadcast audio/user profile is recorded, no system sound settings change. An 8-second source avoids the earlier short-source loop boundary in transition windows. Capture rejects incomplete windows; bypass calibration checks approximately 0.35355 RMS. Raw aggregate JSON is local/ignored `output/audio-quality/report.json`.

Default parameters: threshold -50dB, knee 40dB, ratio 12, attack 0s, release 0.25s. Steady cases settle 1.75s and analyze the last 0.5s. THD uses harmonics 2–10 below Nyquist; it is not every form of distortion. The measurement utility has seven hand-derived regression tests, including injected 10% third harmonic, noncoherent-window rejection and stereo residual.

| Signal/profile | Peak (floating) | RMS | THD | Observation |
| --- | --- | --- | --- | --- |
| 1kHz, input peak 0.5, bypass | 0.49986 | 0.35355 | 0.00135% | Calibration |
| 1kHz, input peak 0.5, compressor/Gain 150% | 0.55479 | 0.39187 | 0.01734% | Measurable distortion, not an audibility judgment |
| 1kHz, input peak 0.98, compressor/Gain 200% | 0.78596 | 0.55510 | 0.01841% | No >1 samples in this case |
| 100Hz, input peak 0.8, compressor/Gain 150% | 0.57962 | 0.41122 | 0.47426% | Bypass THD 0.00070%; low-frequency shaping measurable |
| 5kHz, input peak 0.8, compressor/Gain 150% | 0.58287 | 0.41153 | 0.00076% | Bypass THD 0.00073% |
| 1kHz near-full-scale bursts, compressor/Gain 150% | 0.64674 | 0.19016 | Not evaluated | Burst envelope, not coherent steady tone |
| Separate stress: threshold 0/knee 0/ratio 1/Gain 200% | 1.95944 | — | — | 16,000 of 24,000 samples/channel >1 |

All 14 ordinary cases (four bypass, ten enabled) had zero samples with absolute value >1. Identical stereo channels had zero difference RMS; the left-only input had zero right-channel output. Quiet 1kHz input peak 0.01 had bypass THD 0.07442% versus compressed 0.07415%, so input quantization must not be attributed entirely to the compressor.

## Findings, not automatically applied fixes

1. **Abrupt Gain updates:** the production setter directly writes `gain.value`. In the final rerun at 250Hz, Gain 100→150% had a maximum adjacent-sample step 0.18625 versus pre/post baseline maximum 0.01825 (10.2×). At 1kHz, Gain 200→0% yielded 0.53512 versus 0.09664. A preceding run yielded 0.07870 and 0.70924 respectively: phase/timing affect these values. Both runs show discontinuities and potential clicks, not subjectively confirmed clicks. Candidate next change: short, cancelable Gain smoothing that preserves UI value and lifecycle semantics.
2. **Brief toggle dip:** at 250Hz on→off, minimum sliding 8ms RMS was 0.14471 versus steady baseline minimum 0.26325 (~5.2dB dip); at 750Hz, 0.14719 versus 0.28440 (~5.7dB). Off→on also dipped. No above-baseline adjacent-sample spike was seen for these toggles. The 1kHz test alone hid the dip. The [Web Audio compressor specification](https://www.w3.org/TR/webaudio/#DynamicsCompressorNode) describes fixed lookahead latency and automatic makeup gain; latency-mismatched dry/wet overlap is a plausible explanation, not a measured causal proof. Candidate next change: evaluate delay compensation/transition design with latency and bypass semantics explicitly tested.
3. **Custom-profile headroom:** no final limiter protects post-compressor Gain for every allowed configuration. The separately labeled unity-ratio stress exceeded floating full scale; zeros went to the speakers, so hardware clipping was NOT measured. Normal-default results do not guarantee arbitrary speech/music/transients/settings will never clip. Limiter policy would be a separate design decision.

No audio processing change was authorized or applied in this diagnostic step. [MDN GainNode](https://developer.mozilla.org/en-US/docs/Web/API/GainNode) documents click risk from immediate Gain changes; [MDN DynamicsCompressorNode](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode) documents the native compressor parameters.

User previously confirmed broadcast sound remained normal after off/on. That is a functional listening check, not a level-matched quality comparison. Speech/music listening, perceived pumping/tonal changes, hardware latency/clipping and sustained real-stream behavior remain unverified. Earlier RMS-only smoke results must not be treated as sound-quality assurance.

## Review and validation boundary

Independent focused read-only review: no Critical/Important findings. One Minor diagnostic-report hygiene issue (report written before calibration assertion) was addressed by moving calibration before report persistence. Reviewer reran seven metric tests and inspected the saved waveform report, not live layout or speaker output. These unverified domains remain in scope as limitations, not silently dropped requirements.

Full automated suite: 61 passed / 0 failed (54 prior + seven metric tests). Final build succeeded; source and dist package checks each passed (v2.13.2, 20 entry resources). Native audio harness rerun after report-ordering cleanup exited 0 with successful calibration and the same scoped findings. New diagnostic scripts/tests are not part of the extension package. Default DSP remains unchanged. Existing unrelated unsupported features and full Chrome/Firefox acceptance remain limited as recorded in the [main validation matrix](2026-10-08-chzzk-compatibility.md).
