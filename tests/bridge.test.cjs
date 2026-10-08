const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, runtime, deliver, playerHTML, flush } = require('./helpers.cjs');

function bridge(t, mainFirst, get = async () => ({ config: { arrowSeek: false }, styleParameters: {} })) {
  const dom = page(playerHTML);
  let storageListener;
  dom.window.chrome = {
    storage: { local: { get,
      onChanged: { addListener(fn) { storageListener = fn; } } } },
    i18n: { getMessage: key => key },
    runtime: { onMessage: { addListener() {} } },
  };
  load(dom, 'config.js');
  if (mainFirst) { load(dom, 'web/main.js'); load(dom, 'web/runtime.js'); }
  else { load(dom, 'web/runtime.js'); load(dom, 'web/main.js'); }
  t.after(async () => {
    dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide'));
    await flush(); dom.window.close();
  });
  return { dom, storageListener: (...args) => storageListener(...args) };
}

for (const mainFirst of [true, false]) test(`settings handshake works with ISOLATED script first=${mainFirst}`, async t => {
  const { dom } = bridge(t, mainFirst);
  // jsdom intentionally does not provide postMessage event.source/origin;
  // cross-world message transport is the one external boundary substituted.
  dom.window.postMessage = data => {
    queueMicrotask(() => dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
      source: dom.window, origin: dom.window.location.origin, data,
    })));
  };
  dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
    source: dom.window, origin: dom.window.location.origin,
    data: { namespace: 'cheese-knife', protocol: 1, type: 'config-request', requestId: runtime(dom).requestId },
  }));
  await flush();
  assert.equal(runtime(dom).configReady, true);
  assert.equal(runtime(dom).config.arrowSeek, false);
  assert.equal(runtime(dom).config.previewWidth, 400);
  assert.equal(runtime(dom).i18n.fastForward, 'content_fastForward');
});

for (const latest of [{ 'chat-font-size': 8 }, {}]) test(`initial style snapshot does not overwrite a newer parameter event: ${Object.keys(latest).length ? 'offset' : 'reset'}`, async t => {
  let resolveRead;
  const { dom, storageListener } = bridge(t, false, () => new Promise(resolve => { resolveRead = resolve; }));
  storageListener({ styleParameters: { newValue: latest } });
  dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
    source: dom.window, origin: dom.window.location.origin,
    data: { namespace: 'cheese-knife', protocol: 1, type: 'config-request', requestId: runtime(dom).requestId },
  }));
  resolveRead({ config: {}, styleParameters: { 'chat-font-size': 4 } }); await flush();
  assert.equal(dom.window.document.documentElement.style.getPropertyValue('--knife-chat-size-1'), Object.keys(latest).length ? '8px' : '');
});
