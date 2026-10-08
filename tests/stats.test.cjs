const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, runtime, deliver, playerHTML, flush } = require('./helpers.cjs');

test('statistics read frozen media metadata without changing track IDs', async t => {
  const dom = page(playerHTML);
  t.after(async () => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); await flush(); dom.window.close(); });
  load(dom, 'web/runtime.js'); deliver(dom); load(dom, 'web/player.js');
  const video = dom.window.document.querySelector('video');
  Object.defineProperty(video, 'videoWidth', { value: 1920 }); Object.defineProperty(video, 'videoHeight', { value: 1080 });
  const media = Object.freeze([Object.freeze({ mediaId: 'HLS' }), Object.freeze({ mediaId: 'LLHLS' })]);
  const core = Object.freeze({ srcObject: Object.freeze({ data: Object.freeze({ media }) }) });
  const result = runtime(dom).player.readStats(video, core);
  assert.equal(result.resolution, '1920×1080');
  assert.equal(result.bitrate, null);
  assert.equal(result.latency, null);
  assert.equal(media[0].mediaId, 'HLS');
});
