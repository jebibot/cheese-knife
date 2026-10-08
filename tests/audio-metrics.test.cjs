const test = require('node:test');
const assert = require('node:assert/strict');
const metrics = () => import('../scripts/audio-metrics.mjs');
const tone = (n, harmonic = 0) => Float64Array.from({length:n}, (_, i) =>
  0.5 * Math.sin(2 * Math.PI * 1000 * i / 48000) + harmonic * Math.sin(2 * Math.PI * 3000 * i / 48000));

test('waveform summary reports peak, RMS and samples outside floating full scale', async () => {
  const {measureSignal} = await metrics();
  const report = measureSignal([-1.2,0,1.2], 48000);
  assert.equal(report.peak, 1.2); assert.equal(report.mean, 0);
  assert.ok(Math.abs(report.rms - 0.9797958971132712) < 1e-12);
  assert.equal(report.overFullScaleSamples, 2); assert.equal(report.maxAdjacentStep, 1.2);
});

test('coherent pure tone has its hand-derived RMS and negligible harmonic distortion', async () => {
  const {measureSignal} = await metrics();
  const report = measureSignal(tone(4800), 48000, 1000);
  assert.ok(Math.abs(report.rms - 0.3535533905932738) < 1e-9);
  assert.ok(Math.abs(report.fundamentalAmplitude - 0.5) < 1e-9);
  assert.ok(report.thdPercent < 1e-7);
});

test('third harmonic with one tenth fundamental amplitude measures ten percent THD', async () => {
  const {measureSignal} = await metrics();
  const report = measureSignal(tone(4800, 0.05), 48000, 1000);
  assert.ok(Math.abs(report.thdPercent - 10) < 1e-6);
  assert.ok(Math.abs(report.thdnPercent - 10) < 1e-6);
});

test('noncoherent analysis does not mislabel spectral leakage as distortion', async () => {
  const {measureSignal} = await metrics();
  const report = measureSignal(tone(4801), 48000, 1000);
  assert.equal(report.thdPercent, null); assert.equal(report.spectralReason, 'non-coherent-window');
});

test('nonfinite or empty waveforms cannot receive a clean quality result', async () => {
  const {measureSignal} = await metrics();
  assert.throws(() => measureSignal([0,NaN],48000), /non-finite/);
  assert.throws(() => measureSignal([],48000), /samples required/);
});

test('stereo residual distinguishes identical channels from a silent partner', async () => {
  const {channelDifferenceRms} = await metrics();
  assert.equal(channelDifferenceRms([0.1,-0.1,0],[0.1,-0.1,0]), 0);
  assert.ok(Math.abs(channelDifferenceRms([0.1,-0.1,0],[0,0,0]) - 0.08164965809277261) < 1e-12);
});

test('local RMS envelope distinguishes a quieter interval without waveform phase bias', async () => {
  const {rmsEnvelope} = await metrics();
  const report = rmsEnvelope([0.5,-0.5,0.5,-0.5,1,-1,1,-1],1000,2);
  assert.equal(report.min,0.5); assert.equal(report.max,1); assert.equal(report.windowSamples,2);
});
