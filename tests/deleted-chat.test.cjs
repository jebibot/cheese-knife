const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, runtime, deliver, flush } = require('./helpers.cjs');

// External site boundary, characterized from its native listener/renderer:
// registration copies a function into an ordered {listener, once} record;
// blind retains content but changes status; CANCEL replaces the message.
// No real chat, network, moderation, JSX factory or source injection is used.
function controllerFixture(dom, root) {
  const row = dom.window.document.createElement('div'); row.className = '_item_test';
  row.innerHTML = '<div class="_chatting_message_test"><button class="_nickname_test">Synthetic</button><span class="_text_test"></span></div>';
  root.append(row);
  const calls = [];
  const controller = {
    emptyMessage: { status: 'NORMAL' }, messageFilter() { return true; },
    messageList: [{ key: 'fixture', user: 'synthetic', time: 123, type: 1, status: 'NORMAL', content: 'Synthetic content' }],
    notiUpdateMessageList() {
      const message = this.messageList[0];
      row.__reactProps$fixture = { children: { props: { chatMessage: message } } };
      row.querySelector('._text_test').textContent = message.status === 'NORMAL' ? 'Synthetic content' : 'Native hidden';
    },
    notiBlindListener(event) {
      calls.push(event.blindType);
      const index = this.messageList.findIndex(m => m.time === event.messageTime && m.user === event.userId);
      if (index < 0) return 'native';
      this.messageList[index] = event.blindType === 'CANCEL'
        ? { ...this.messageList[index], status: 'NORMAL', content: event.message.content }
        : { ...this.messageList[index], status: event.blindType };
      this.notiUpdateMessageList();
      return 'native';
    },
  };
  // Site callbacks are bound, as in its arrow-function instance fields.
  controller.notiBlindListener = controller.notiBlindListener.bind(controller);
  const original = controller.notiBlindListener;
  const before = { listener: () => calls.push('before'), once: false };
  const native = { listener: original, once: false };
  const after = { listener: () => calls.push('after'), once: true };
  const client = { _events: { notiBlind: [before, native, after] } };
  controller.chatClient = client;
  controller.notiUpdateMessageList();
  const emit = (blindType = 'BLIND', extra = {}) => {
    const event = { messageTime: 123, userId: 'synthetic', blindType, ...extra };
    const returns = client._events.notiBlind.slice().map(entry => entry.listener(event));
    return returns;
  };
  return { controller, row, text: row.querySelector('._text_test'), original, native, before, after, client, calls, emit };
}
function setup(t, config = {}, prepare = () => {}, vod = false) {
  const dom = page('<div id="root"><main id="layout-body"><aside><div role="log"></div></aside></main></div>',
    vod ? 'https://chzzk.naver.com/video/123' : undefined);
  t.after(() => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); dom.window.close(); });
  for (const file of ['web/runtime.js', 'web/site-adapter.js']) load(dom, file);
  const aside = dom.window.document.querySelector('aside');
  const fixture = controllerFixture(dom, aside.querySelector('[role="log"]'));
  aside.__reactFiber$fixture = { memoizedState: { memoizedState: fixture.controller, next: null }, return: null };
  prepare(fixture);
  deliver(dom, { showDeleted: true, ...config });
  load(dom, 'web/inject.js');
  return { dom, aside, ...fixture };
}

test('deleted chat preserves native dispatch order and marks retained ordinary content without JSX', async t => {
  const f = setup(t); const content = f.controller.messageList[0].content;
  assert.equal(runtime(f.dom).statuses.deletedChat.state, 'ready');
  assert.deepEqual(f.emit(), [1, 'native', 3]); await flush();
  assert.deepEqual(f.calls, ['before', 'BLIND', 'after']);
  assert.equal(f.client._events.notiBlind[0], f.before);
  assert.equal(f.client._events.notiBlind[2], f.after);
  assert.equal(f.after.once, true);
  assert.equal(f.controller.messageList[0].status, 'NORMAL');
  assert.equal(f.controller.messageList[0].content, content);
  assert.equal(f.text.dataset.knifeDeleted, '1');
  assert.equal(f.text.textContent, 'Synthetic content');
  assert.equal(f.row.querySelector('button').hasAttribute('data-knife-deleted'), false);
});

test('deleted chat OFF re-hides only owned messages and restores the copied native listener', async t => {
  const f = setup(t); f.emit(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1');
  deliver(f.dom, { showDeleted: false }, 2); await flush();
  assert.equal(f.controller.messageList[0].status, 'BLIND');
  assert.equal(f.text.textContent, 'Native hidden');
  assert.equal(f.text.dataset.knifeDeleted, undefined);
  assert.equal(f.native.listener, f.original);
  assert.equal(f.controller.notiBlindListener, f.original);
  assert.equal(runtime(f.dom).statuses.deletedChat.state, 'disabled');
  deliver(f.dom, { showDeleted: true }, 3); f.emit(); await flush();
  assert.equal(f.controller.messageList[0].status, 'BLIND', 'ON does not reveal previously hidden history');
});

test('deleted chat marks unchanged native text when React updates only props without DOM mutations', async t => {
  const f = setup(t);
  let updateProps;
  f.controller.notiUpdateMessageList = () => {
    updateProps = () => { f.row.__reactProps$fixture = { children: { props: { chatMessage: f.controller.messageList[0] } } }; };
  };
  f.emit();
  assert.equal(f.text.dataset.knifeDeleted, '1', 'pre-render stable identity already marks the unchanged native text');
  updateProps(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1', 'a props-only native render needs no extra DOM polling');
});

test('deleted chat CANCEL preserves native replacement and retires its marker', async t => {
  const f = setup(t); f.emit(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1');
  f.emit('CANCEL', { message: { content: 'Native restored content' } }); await flush();
  assert.equal(f.controller.messageList[0].content, 'Native restored content');
  assert.equal(f.controller.messageList[0].status, 'NORMAL');
  assert.equal(f.text.dataset.knifeDeleted, undefined);
  deliver(f.dom, { showDeleted: false }, 2);
  assert.equal(f.controller.messageList[0].status, 'NORMAL');
});

test('deleted chat repeated blind events retain processed emotes and restore the latest blind status', async t => {
  const f = setup(t); const children = ['Synthetic', { type: 'img', props: { alt: 'Synthetic emote' } }];
  f.controller.messageList[0].content = children;
  f.emit(); await flush(); f.emit('RESTRICT'); await flush();
  assert.equal(f.controller.messageList[0].content, children);
  assert.equal(f.text.dataset.knifeDeleted, '1');
  assert.equal(f.controller.messageList[0].status, 'NORMAL');
  deliver(f.dom, { showDeleted: false }, 2);
  assert.equal(f.controller.messageList[0].status, 'RESTRICT');
  assert.deepEqual(f.calls, ['before', 'BLIND', 'after', 'before', 'RESTRICT', 'after']);
});

test('deleted chat DOM reuse removes stale owned markers and preserves foreign markers', async t => {
  const f = setup(t); f.emit(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1');
  f.controller.messageList = [{ key: 'new', user: 'other', time: 456, type: 1, status: 'NORMAL', content: 'Synthetic next' }];
  f.controller.notiUpdateMessageList(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, undefined);
  f.text.dataset.knifeDeleted = 'external';
  runtime(f.dom).reconcile();
  deliver(f.dom, { showDeleted: false }, 2);
  assert.equal(f.text.dataset.knifeDeleted, 'external');
});

test('deleted chat disposal retires local disclosure and leaves other listener records intact', async t => {
  const f = setup(t); f.emit(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1');
  f.dom.reconfigure({ url: 'https://chzzk.naver.com/settings/profile' }); runtime(f.dom).reconcile();
  assert.equal(f.controller.messageList[0].status, 'BLIND');
  assert.equal(f.text.dataset.knifeDeleted, undefined);
  assert.equal(f.native.listener, f.original);
  assert.equal(f.controller.notiBlindListener, f.original);
  assert.deepEqual(f.client._events.notiBlind, [f.before, f.native, f.after]);
});

test('deleted chat restoration never overwrites another writer changing message or callback', async t => {
  const f = setup(t); f.emit(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1');
  const other = () => 'external';
  f.controller.notiBlindListener = other; f.native.listener = other;
  f.controller.messageList[0] = { ...f.controller.messageList[0], content: 'External', status: 'CBOTBLIND' };
  f.text.dataset.knifeDeleted = 'external';
  deliver(f.dom, { showDeleted: false }, 2);
  assert.equal(f.controller.notiBlindListener, other);
  assert.equal(f.native.listener, other);
  assert.equal(f.controller.messageList[0].status, 'CBOTBLIND');
  assert.equal(f.controller.messageList[0].content, 'External');
  assert.equal(f.text.dataset.knifeDeleted, 'external');
});

// Break caught: stale retention must not authorize a message that another
// writer hid or rewrote in place; replacing the list object is not required.
for (const reconcile of [true, false]) test('deleted chat never re-discloses an in-place cleanbot change with reconciliation=' + reconcile, async t => {
  const f = setup(t); f.emit(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1');
  f.controller.messageList[0].status = 'CBOTBLIND';
  if (reconcile) { f.controller.notiUpdateMessageList(); runtime(f.dom).reconcile(); await flush(); }
  const blind = reconcile ? 'BLIND' : 'RESTRICT';
  f.emit(blind); await flush();
  assert.equal(f.controller.messageList[0].status, blind, 'the immediately preceding hidden status cannot be authorized by old retention');
  assert.equal(f.text.dataset.knifeDeleted, undefined);
  deliver(f.dom, { showDeleted: false }, 2);
  assert.equal(f.controller.messageList[0].status, blind);
});

for (const [field, value] of [['key', 'foreign-key'], ['user', 'foreign-user'], ['time', 456], ['type', 10]]) {
  test('deleted chat retires markers after in-place foreign ' + field + ' changes', async t => {
    const f = setup(t); f.emit(); await flush();
    const foreign = f.controller.messageList[0]; foreign[field] = value;
    f.controller.notiUpdateMessageList(); await flush();
    assert.equal(f.text.dataset.knifeDeleted, undefined, 'owned marker requires unchanged message identity and ordinary type');
    deliver(f.dom, { showDeleted: false }, 2);
    assert.equal(f.controller.messageList[0], foreign);
    assert.equal(f.controller.messageList[0][field], value);
    assert.equal(f.controller.messageList[0].status, 'NORMAL', 'OFF cannot restore an old hidden status over a foreign rewrite');
  });
}

test('deleted chat rejects stale retention when content is changed in place immediately before a native blind event', async t => {
  const f = setup(t); f.emit(); await flush();
  f.controller.messageList[0].content = 'External replacement content';
  f.emit(); await flush();
  assert.equal(f.controller.messageList[0].status, 'BLIND');
  assert.equal(f.controller.messageList[0].content, 'External replacement content');
  assert.equal(f.text.dataset.knifeDeleted, undefined);
  deliver(f.dom, { showDeleted: false }, 2);
  assert.equal(f.controller.messageList[0].status, 'BLIND');
});

test('deleted chat controller replacement retires the previous local disclosure', async t => {
  const f = setup(t); f.emit(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1');
  const next = controllerFixture(f.dom, f.aside.querySelector('[role="log"]'));
  f.aside.__reactFiber$fixture.memoizedState.memoizedState = next.controller;
  runtime(f.dom).reconcile(); next.emit(); await flush();
  assert.equal(f.native.listener, f.original);
  assert.equal(f.controller.messageList[0].status, 'BLIND');
  assert.equal(f.text.dataset.knifeDeleted, undefined);
  assert.equal(next.text.dataset.knifeDeleted, '1');
});

test('deleted chat client replacement reconnects without layering native callbacks', async t => {
  const f = setup(t); f.emit(); await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1');
  const freshEntry = { listener: f.controller.notiBlindListener, once: false };
  f.controller.chatClient = { _events: { notiBlind: [freshEntry] } };
  runtime(f.dom).reconcile(); runtime(f.dom).reconcile();
  assert.equal(f.native.listener, f.original);
  assert.equal(freshEntry.listener({ messageTime: 123, userId: 'synthetic', blindType: 'RESTRICT' }), 'native');
  await flush();
  assert.equal(f.text.dataset.knifeDeleted, '1');
  deliver(f.dom, { showDeleted: false }, 2);
  assert.equal(freshEntry.listener, f.original);
  assert.equal(f.controller.messageList[0].status, 'RESTRICT');
  assert.equal(f.calls.filter(x => x === 'RESTRICT').length, 1);
});

for (const [name, prepare, vod] of [
  ['missing copied listener', f => { f.client._events.notiBlind = []; }, false],
  ['ambiguous copied listener', f => { f.client._events.notiBlind.push({ listener: f.original, once: false }); }, false],
  ['once-only native listener', f => { f.native.once = true; }, false],
  ['unknown normal status', f => { f.controller.emptyMessage.status = 'UNKNOWN'; }, false],
  ['read-only native callback slot', f => { Object.defineProperty(f.native, 'listener', { writable: false }); }, false],
  ['read-only native callback field', f => { Object.defineProperty(f.controller, 'notiBlindListener', { writable: false }); }, false],
  ['VOD without verified live deletion contract', () => {}, true],
]) test('deleted chat remains limited for ' + name, t => {
  const f = setup(t, {}, prepare, vod);
  assert.equal(runtime(f.dom).statuses.deletedChat.state, 'limited');
  assert.equal(f.controller.notiBlindListener, f.original);
  assert.equal(f.native.listener, f.original);
});

for (const [name, status, type] of [['cleanbot', 'CBOTBLIND', 1], ['prior deletion', 'BLIND', 1], ['donation', 'NORMAL', 10], ['system', 'NORMAL', 10000]]) {
  test('deleted chat never reveals ' + name, async t => {
    const f = setup(t, {}, f => { Object.assign(f.controller.messageList[0], { status, type }); });
    f.emit(); await flush();
    assert.equal(f.controller.messageList[0].status, 'BLIND');
    assert.equal(f.text.dataset.knifeDeleted, undefined);
  });
}

test('deleted chat OFF never rewires native listeners or annotates old hidden history', async t => {
  const f = setup(t, { showDeleted: false });
  f.emit(); await flush();
  assert.equal(f.native.listener, f.original);
  assert.equal(f.controller.notiBlindListener, f.original);
  assert.equal(f.controller.messageList[0].status, 'BLIND');
  assert.equal(f.text.dataset.knifeDeleted, undefined);
});
