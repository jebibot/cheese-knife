const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, flush } = require('./helpers.cjs');

function background(t, stored = {}) {
  const dom = page();
  const event = () => {
    const listeners = new Set();
    return { addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); },
      emit(value) { for (const fn of [...listeners]) fn(value); } };
  };
  const data = structuredClone(stored);
  dom.window.chrome = {
    storage: { local: { get: async () => structuredClone(data), set: async value => Object.assign(data, structuredClone(value)), remove: async key => { delete data[key]; }, onChanged: event() } },
    scripting: { unregisterContentScripts: async () => {}, registerContentScripts: async () => {} },
    permissions: { contains: async () => true, onRemoved: event() },
    runtime: { onInstalled: event(), onStartup: event() }, tabs: { create() { throw new Error('unexpected permission tab'); } },
  };
  load(dom, 'background.js');
  t.after(() => dom.window.close());
  return { dom, data };
}

test('rapid style updates serialize registration so the latest selection wins', async t => {
  const { dom } = background(t);
  let registered = null, release;
  const blocked = new Promise(resolve => { release = resolve; });
  dom.window.chrome.scripting.unregisterContentScripts = async () => { registered = null; };
  dom.window.chrome.scripting.registerContentScripts = async scripts => {
    if (scripts[0].css[0] === 'styles/left-chat.css') await blocked;
    if (registered) throw new Error('duplicate-style-registration');
    registered = structuredClone(scripts[0]);
  };
  const first = dom.window.registerStyles(['left-chat']).then(() => 'ok', error => error.message);
  await flush();
  const last = dom.window.registerStyles(['hide-studio']).then(() => 'ok', error => error.message);
  await flush(); release();
  assert.equal(await first, 'ok'); assert.equal(await last, 'ok');
  assert.deepEqual(Array.from(registered.css), ['styles/hide-studio.css']);
});

test('legacy sharpness migration works when the old config object is missing', async t => {
  const { dom, data } = background(t, { t: 0 });
  await dom.window.initConfig();
  assert.equal(data.config.sharpness, 0);
  assert.equal(Object.hasOwn(data, 't'), false);
});

test('a delayed startup style snapshot cannot overwrite a newer selection', async t => {
  const { dom, data } = background(t, { styles: ['left-chat'] });
  const old = structuredClone(data); let resolveRead, registered;
  dom.window.chrome.storage.local.get = () => new Promise(resolve => { resolveRead = resolve; });
  dom.window.chrome.scripting.registerContentScripts = async scripts => { registered = structuredClone(scripts[0]); };
  const starting = dom.window.init();
  data.styles = ['hide-studio'];
  dom.window.chrome.storage.local.onChanged.emit({ styles: { newValue: ['hide-studio'] } }); await flush();
  resolveRead(old); await starting; await flush();
  assert.deepEqual(Array.from(registered.css), ['styles/hide-studio.css']);
});

test('style changes during a pending migration write are still observed', async t => {
  const { dom, data } = background(t, { config: { resizeChat: true }, styles: [] });
  let releaseWrite, registered;
  dom.window.chrome.scripting.registerContentScripts = async scripts => { registered = structuredClone(scripts[0]); };
  dom.window.chrome.storage.local.set = async value => {
    Object.assign(data, structuredClone(value));
    if (value.styles) dom.window.chrome.storage.local.onChanged.emit({ styles: { newValue: value.styles } });
    await new Promise(resolve => { releaseWrite = resolve; });
  };
  const starting = dom.window.init(); await flush();
  data.styles = ['hide-studio'];
  dom.window.chrome.storage.local.onChanged.emit({ styles: { newValue: ['hide-studio'] } }); await flush();
  releaseWrite(); await starting; await flush();
  assert.deepEqual(Array.from(registered.css), ['styles/hide-studio.css']);
});

test('legacy resize migration does not overwrite a newer style selection made during its read', async t => {
  const { dom, data } = background(t, { config: { resizeChat: true }, styles: [] });
  const old = structuredClone(data); let resolveRead;
  dom.window.chrome.storage.local.get = () => new Promise(resolve => { resolveRead = resolve; });
  const migration = dom.window.initConfig();
  data.styles = ['hide-studio'];
  dom.window.chrome.storage.local.onChanged.emit({ styles: { newValue: ['hide-studio'] } });
  resolveRead(old); await migration;
  assert.deepEqual(Array.from(data.styles), ['hide-studio']);
  assert.equal(Object.hasOwn(data.config, 'resizeChat'), false);
});

test('legacy migration preserves a newer config value received before the startup read finishes', async t => {
  const { dom, data } = background(t, { config: { sharpness: 0 }, t: 2 });
  const old = structuredClone(data); let resolveRead;
  dom.window.chrome.storage.local.get = () => new Promise(resolve => { resolveRead = resolve; });
  const migration = dom.window.initConfig();
  data.config = { sharpness: 4, arrowSeek: false };
  dom.window.chrome.storage.local.onChanged.emit({ config: { newValue: data.config } });
  resolveRead(old); await migration;
  assert.deepEqual(data.config, { sharpness: 4, arrowSeek: false });
  assert.equal(Object.hasOwn(data, 't'), false);
});
