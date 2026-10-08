const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, runtime, flush } = require('./helpers.cjs');
test('vendored HLS is private and does not overwrite the website Hls global', async t => {
  const dom = page();
  t.after(async () => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); await flush(); dom.window.close(); });
  const website = dom.window.Hls = { website: true };
  load(dom, 'web/runtime.js'); load(dom, 'vendor/hls.light.private.js');
  assert.equal(dom.window.Hls, website);
  assert.equal(runtime(dom).Hls.version, '1.6.16');
});
