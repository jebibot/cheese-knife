const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function settings(stored) {
  const context = vm.createContext({
    chrome: { storage: { local: { get: async () => stored } } },
  });
  vm.runInContext(fs.readFileSync('config.js', 'utf8'), context);
  return vm.runInContext('getConfig(true)', context);
}

test('partial stored settings keep explicit false and fill missing defaults', async () => {
  const { config } = await settings({ config: { arrowSeek: false } });
  assert.equal(config.arrowSeek, false);
  assert.equal(config.previewWidth, 400);
  assert.equal(config.compressorRatio, 12);
});

test('invalid types and nonfinite/out-of-range numbers use schema defaults', async () => {
  const { config } = await settings({ config: {
    compressorRatio: Infinity, compressorThreshold: -200,
    arrowSeek: 'false', brightness: NaN, previewVolume: 200,
    unknownOption: 'ignored',
  } });
  assert.equal(config.compressorRatio, 12);
  assert.equal(config.compressorThreshold, -50);
  assert.equal(config.arrowSeek, true);
  assert.equal(config.brightness, 1);
  assert.equal(config.previewVolume, 5);
  assert.equal(Object.hasOwn(config, 'unknownOption'), false);
});

test('missing or malformed storage does not prevent settings initialization', async () => {
  for (const config of [undefined, null, [], 'damaged']) {
    const result = await settings({ config });
    assert.equal(result.config.compressorRelease, 0.25);
    assert.equal(result.config.preview, true);
    assert.equal(JSON.stringify(result.styleParameters), '{}');
  }
});

test('zero compressor attack and supported style parameters are preserved', async () => {
  const result = await settings({ config: { compressorAttack: 0 }, styleParameters: { 'chat-font-size': 3 } });
  assert.equal(result.config.compressorAttack, 0);
  assert.equal(result.styleParameters['chat-font-size'], 3);
});
