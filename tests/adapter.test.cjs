const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, runtime, flush } = require('./helpers.cjs');

test('optional site adapter survives absent webpack and React', async t => {
  const dom = page();
  t.after(async () => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); await flush(); dom.window.close(); });
  load(dom, 'web/runtime.js'); load(dom, 'web/site-adapter.js');
  assert.equal(await runtime(dom).adapter.getCorePlayer(dom.window.document.body), null);
  assert.equal(await runtime(dom).adapter.getWebpackRequire(), null);
});

test('optional site adapter does not evaluate throwing global getters', async t => {
  const dom = page();
  let getters = 0;
  Object.defineProperty(dom.window, 'webpackChunkglive_fe_pc', { get() { getters++; throw new Error('unexpected getter'); } });
  t.after(async () => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); await flush(); dom.window.close(); });
  load(dom, 'web/runtime.js'); load(dom, 'web/site-adapter.js');
  assert.equal(await runtime(dom).adapter.getWebpackRequire(), null);
  assert.equal(getters, 0);
});
