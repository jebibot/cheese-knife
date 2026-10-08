const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, runtime, deliver, playerHTML, flush } = require('./helpers.cjs');

function setup(t, html = playerHTML, url, beforeInject = () => {}) {
  const dom = page(html, url);
  t.after(async () => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); await flush(); dom.window.close(); });
  dom.window.document.documentElement.style.setProperty('--knife-chat-resize', '1');
  dom.window.document.documentElement.style.setProperty('--knife-chat-timestamp', '1');
  for (const file of ['web/runtime.js','web/site-adapter.js','web/audio.js','web/player.js']) load(dom, file);
  deliver(dom, { arrowSeek: true, hideDonation: false });
  beforeInject(dom);
  load(dom, 'web/inject.js');
  return dom;
}

const homeHTML = '<div id="root"><div id="layout-body"><section><ul class="_grid_test _is_two_columns_test"><li>Recommended</li></ul></section></div><section id="foreign-grid"><ul class="_grid_test _is_two_columns_test"></ul></section></div>';

test('home recommendation CSS scope applies only to the exact home route', t => {
  const dom = setup(t, homeHTML, 'https://chzzk.naver.com/');
  const body = dom.window.document.getElementById('layout-body');
  assert.equal(body.dataset.knifeHome, '1');
  assert.equal(dom.window.document.getElementById('foreign-grid').dataset.knifeHome, undefined);
  deliver(dom, {}, 2); runtime(dom).reconcile();
  assert.equal(body.dataset.knifeHome, '1', 'repeated config/reconcile keeps the home scope');
  for (const path of ['/lives', '/home/game/HOME', '/video/123', '/settings/profile']) {
    dom.reconfigure({ url: 'https://chzzk.naver.com' + path }); runtime(dom).reconcile();
    assert.equal(body.dataset.knifeHome, undefined, path + ' must not carry home-only CSS');
  }
});

test('home recommendation scope follows a replaced layout and cleans the detached root', t => {
  const dom = setup(t, homeHTML, 'https://chzzk.naver.com/');
  const oldBody = dom.window.document.getElementById('layout-body');
  assert.equal(oldBody.dataset.knifeHome, '1');
  const replacement = dom.window.document.createElement('div'); replacement.id = 'layout-body';
  replacement.innerHTML = oldBody.innerHTML;
  oldBody.replaceWith(replacement); runtime(dom).reconcile();
  assert.equal(oldBody.dataset.knifeHome, undefined);
  assert.equal(replacement.dataset.knifeHome, '1');
  dom.reconfigure({ url: 'https://chzzk.naver.com/following' }); runtime(dom).reconcile();
  assert.equal(replacement.dataset.knifeHome, undefined);
  dom.reconfigure({ url: 'https://chzzk.naver.com/' }); runtime(dom).reconcile();
  assert.equal(replacement.dataset.knifeHome, '1');
});

test('home recommendation marker survives bfcache and retires on final page disposal', t => {
  const dom = setup(t, homeHTML, 'https://chzzk.naver.com/');
  const body = dom.window.document.getElementById('layout-body');
  assert.equal(body.dataset.knifeHome, '1');
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide', { persisted: true }));
  assert.equal(body.dataset.knifeHome, '1');
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow', { persisted: true }));
  assert.equal(body.dataset.knifeHome, '1');
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide'));
  assert.equal(body.dataset.knifeHome, undefined);
});

test('chat resize and player controls survive missing React controller and webpack', async t => {
  const html = playerHTML.replace('</main>', '<aside class="_container_chat_1"><div role="log"></div></aside></main>');
  const dom = setup(t, html);
  await flush();
  assert.equal(dom.window.document.querySelectorAll('.knife-resize-handle').length, 1);
  assert.equal(dom.window.document.querySelectorAll('.knife-ff').length, 1);
});

test('channel button is unique and generic nonchannel tablists remain unchanged', async t => {
  const html = '<div id="root"><div id="layout-body"><section><div role="tablist"><button>Videos</button></div></section></div></div>';
  const dom = setup(t, html, 'https://chzzk.naver.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  runtime(dom).reconcile(); runtime(dom).reconcile();
  await flush();
  assert.equal(dom.window.document.querySelectorAll('.knife-channel-chat').length, 1);
  dom.reconfigure({ url: 'https://chzzk.naver.com/following' });
  runtime(dom).reconcile(); await flush();
  assert.equal(dom.window.document.querySelectorAll('.knife-channel-chat').length, 0);
});

test('chat discovery recovers after bounded timeout and controller replacement', async t => {
  const dom = setup(t, playerHTML.replace('</main>', '<aside><div role="log"></div></aside></main>'));
  deliver(dom, { hideDonation: true }, 2);
  await new Promise(resolve => setTimeout(resolve, 2150));
  const chat = dom.window.document.querySelector('aside');
  const first = { messageFilter: function (message) { return this.allowed && message.type !== 99; }, allowed: true };
  const original = first.messageFilter;
  chat.__reactFiber$test = { memoizedState: { memoizedState: first, next: null }, return: null };
  runtime(dom).reconcile(); await flush();
  assert.equal(first.messageFilter({ type: 10 }), false);
  assert.equal(first.messageFilter({ type: 1 }), true);
  const second = { messageFilter: function () { return true; } };
  chat.__reactFiber$test.memoizedState.memoizedState = second;
  runtime(dom).reconcile(); await flush();
  assert.equal(first.messageFilter, original);
  assert.equal(second.messageFilter({ type: 10 }), false);
});

test('chat capability status follows option changes without repatching the same controller', t => {
  const controller = { messageFilter() { return true; } };
  const dom = setup(t, playerHTML.replace('</main>', '<aside><div role="log"></div></aside></main>'), undefined, dom => {
    dom.window.document.querySelector('aside').__reactFiber$test = { memoizedState: { memoizedState: controller, next: null }, return: null };
  });
  const patched = controller.messageFilter;
  assert.equal(runtime(dom).statuses.donationChat.state, 'disabled');
  deliver(dom, { hideDonation: true, showDeleted: true }, 2);
  assert.equal(controller.messageFilter({ type: 10 }), false);
  assert.equal(runtime(dom).statuses.donationChat.state, 'ready');
  assert.equal(runtime(dom).statuses.deletedChat.state, 'limited');
  assert.equal(runtime(dom).statuses.deletedChat.reason, 'native-deletion-adapter-unavailable');
  deliver(dom, { hideDonation: false, showDeleted: false }, 3);
  assert.equal(controller.messageFilter({ type: 10 }), true);
  assert.equal(runtime(dom).statuses.donationChat.state, 'disabled');
  assert.equal(runtime(dom).statuses.deletedChat.state, 'disabled');
  assert.equal(controller.messageFilter, patched, 'config changes do not layer wrappers');
});

test('timestamp capability remains pending until supported message rows are observed', async t => {
  const dom = setup(t, playerHTML.replace('</main>', '<aside><div role="log"></div></aside></main>'));
  dom.window.document.documentElement.style.setProperty('--knife-chat-timestamp', '1');
  runtime(dom).reconcile(); await flush();
  assert.equal(runtime(dom).statuses.chatTimestamp.state, 'pending');
  const root = dom.window.document.querySelector('[role="log"]');
  const row = dom.window.document.createElement('div'); row.className = '_item_test';
  row.innerHTML = '<span class="_chatting_message_test"></span>';
  row.__reactProps$test = { chatMessage: { time: '2026-10-08T01:02:00Z' } };
  root.append(row); await flush();
  assert.equal(runtime(dom).statuses.chatTimestamp.state, 'ready');
  assert.match(row.firstElementChild.dataset.timestamp, /^\d\d:\d\d$/);
});

test('VOD timestamps find message rows rather than nested nickname wrappers and update reused rows', async t => {
  const html = playerHTML.replace('live_player_layout', 'player_layout').replace('</main>', '<aside id="vod-aside" class="_aside_test"><div role="log"><div class="_list_test"><div class="_item_test"><span class="_nickname_test"><span class="_wrapper_test"></span></span><span class="_chatting_message_test">Synthetic</span></div></div></div></aside></main>');
  const dom = setup(t, html, 'https://chzzk.naver.com/video/123', dom => {
    dom.window.document.querySelector('._item_test').__reactProps$test = { children: { props: { chatMessage: { playerMessageTime: 61000 } } } };
  });
  const row = dom.window.document.querySelector('._item_test');
  runtime(dom).reconcile(); await flush();
  const target = row.querySelector('._chatting_message_test');
  assert.equal(target.dataset.timestamp, '1:01');
  row.__reactProps$test.children.props.chatMessage.playerMessageTime = 62000;
  target.firstChild.textContent = 'Reused'; await flush();
  assert.equal(target.dataset.timestamp, '1:02');
});

test('live start tooltip reads verified React metadata without a network request', async t => {
  const dom = setup(t);
  const node = dom.window.document.createElement('span'); node.className = 'video_information_count__test';
  node.__reactFiber$test = { memoizedState: { memoizedState: [{ openDate: '2026-10-08 10:00:00' }], next: null } };
  dom.window.document.getElementById('layout-body').append(node);
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.match(node.dataset.knifeTooltip || '', /2026-10-08 10:00:00/);
});

test('VOD start tooltip rejects stale route metadata and foreign video links', async t => {
  const dom = setup(t);
  const body = dom.window.document.getElementById('layout-body');
  body.insertAdjacentHTML('beforeend', '<article><a href="/video/123">VOD</a><div><span class="video_card_item__test">Date</span></div></article>');
  let resolve; let calls = 0;
  dom.window.fetch = (url, options) => {
    assert.equal(url, 'https://api.chzzk.naver.com/service/v3/videos/123');
    assert.equal(options.credentials, 'include'); calls++;
    return new Promise(done => { resolve = done; });
  };
  const node = body.querySelector('span');
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(calls, 1);
  dom.reconfigure({ url: 'https://chzzk.naver.com/following' }); runtime(dom).reconcile();
  resolve({ ok: true, json: async () => ({ code: 200, content: { liveOpenDate: '2026-10-08 10:00:00' } }) }); await flush();
  assert.equal(node.dataset.knifeTooltip, undefined);
  body.querySelector('a').href = 'https://foreign.invalid/video/123';
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(calls, 1);
});

test('VOD start tooltip shows successful metadata and reuses bounded cache', async t => {
  const dom = setup(t);
  dom.window.document.getElementById('layout-body').insertAdjacentHTML('beforeend', '<article><a href="/video/123">VOD</a><div><span class="video_card_item__test">Date</span></div></article>');
  let calls = 0;
  dom.window.fetch = async () => { calls++; return { ok: true, json: async () => ({ code: 200, content: { liveOpenDate: '2026-10-08 10:00:00' } }) }; };
  const node = dom.window.document.querySelector('span');
  for (let i = 0; i < 2; i++) { node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush(); }
  assert.match(node.dataset.knifeTooltip || '', /2026-10-08 10:00:00/); assert.equal(calls, 1);
});

// Break caught: legacy-only selectors leave current live/VOD metadata unbound.
// Exercise the production listener and adapter; only the remote HTTP boundary is faked.
test('current live viewer count reads ancestor metadata and leaves other count elements untouched', async t => {
  const dom = setup(t);
  const main = dom.window.document.querySelector('main');
  main.insertAdjacentHTML('beforeend', '<div class="_data_current"><strong id="viewers" class="_count_current"><span>Viewers</span></strong><span id="elapsed" class="_count_current">Elapsed</span><p id="followers" class="_count_current">Followers</p></div><strong id="other-count" class="_count_current">Other</strong>');
  const viewers = main.querySelector('#viewers');
  const metadata = { memoizedState: { memoizedState: [{ openDate: '2026-10-08 10:00:00' }], next: null }, return: null };
  for (const node of main.querySelectorAll('[class*="_count_"]')) node.__reactFiber$test = { memoizedState: null, return: metadata };
  dom.window.fetch = () => { assert.fail('live start time must not request a network fallback'); };
  viewers.firstElementChild.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(viewers.dataset.knifeTooltip, 'Live start: 2026-10-08 10:00:00');
  assert.equal(runtime(dom).statuses.startTime.state, 'ready');
  for (const id of ['elapsed','followers','other-count']) {
    const node = main.querySelector('#' + id);
    node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
    assert.equal(node.dataset.knifeTooltip, undefined, id);
  }
  dom.reconfigure({ url: 'https://chzzk.naver.com/following' }); runtime(dom).reconcile();
  assert.equal(viewers.dataset.knifeTooltip, undefined, 'route disposal removes its annotation');
});

test('current live viewer count without verified metadata reports limited support', async t => {
  const dom = setup(t);
  dom.window.document.querySelector('main').insertAdjacentHTML('beforeend', '<div class="_data_current"><strong class="_count_current">Viewers</strong></div>');
  const node = dom.window.document.querySelector('strong');
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(node.dataset.knifeTooltip, undefined);
  assert.equal(runtime(dom).statuses.startTime?.state, 'limited');
  assert.equal(runtime(dom).statuses.startTime?.reason, 'start-metadata-unavailable');
});

test('current live count shape on a nonlive route cannot acquire a live start annotation', async t => {
  const dom = setup(t, playerHTML, 'https://chzzk.naver.com/following');
  dom.window.document.querySelector('main').insertAdjacentHTML('beforeend', '<div class="_data_current"><strong class="_count_current">Not live</strong></div>');
  const node = dom.window.document.querySelector('strong');
  node.__reactFiber$test = { memoizedState: { memoizedState: [{ openDate: '2026-10-08 10:00:00' }], next: null }, return: null };
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(node.dataset.knifeTooltip, undefined);
  assert.equal(runtime(dom).statuses.startTime, undefined);
});

function currentVodDate(dom, href = '/video/123') {
  const card = dom.window.document.createElement('article'); card.className = '_area_current';
  card.innerHTML = '<a class="_title_current">VOD</a><div class="_information_current"><span class="_item_current">Views</span><span class="_item_current">Date</span></div>';
  card.querySelector('a').href = href;
  dom.window.document.getElementById('layout-body').append(card);
  return card.querySelector('span:last-child');
}

// Break caught: a successful annotation short-circuits before validating a
// reused card's new VOD identity. Expected dates/requests are independent data.
for (const current of [true, false]) test('successful VOD tooltip follows a reused card identity, current=' + current, async t => {
  const dom = setup(t, playerHTML, 'https://chzzk.naver.com/');
  let node;
  if (current) node = currentVodDate(dom);
  else {
    dom.window.document.getElementById('layout-body').insertAdjacentHTML('beforeend', '<article><a href="/video/123">VOD</a><div><span class="video_card_item__test">Date</span></div></article>');
    node = dom.window.document.querySelector('span');
  }
  const calls = [];
  dom.window.fetch = async (url, options) => {
    assert.equal(options.credentials, 'include');
    const id = url.split('/').at(-1); calls.push(id); assert.ok(['123', '456'].includes(id));
    return { ok: true, json: async () => ({ code: 200, content: { liveOpenDate: id === '123' ? '2026-10-08 10:00:00' : '2026-10-08 11:00:00' } }) };
  };
  const link = node.closest('article').querySelector('a');
  const hover = async () => { node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush(); };
  await hover(); assert.equal(node.dataset.knifeTooltip, 'Live start: 2026-10-08 10:00:00');
  link.href = '/video/456'; await hover();
  assert.equal(node.dataset.knifeTooltip, 'Live start: 2026-10-08 11:00:00');
  link.href = '/video/123'; await hover();
  assert.equal(node.dataset.knifeTooltip, 'Live start: 2026-10-08 10:00:00');
  assert.deepEqual(calls, ['123', '456'], 'returning to the first VOD consumes its own cache entry');
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide'));
  assert.equal(node.dataset.knifeTooltip, undefined, 'disposal removes the latest owned annotation');
});

test('owned VOD tooltip is invalidated when its reused card no longer has a trusted VOD link', async t => {
  const dom = setup(t);
  const node = currentVodDate(dom); const link = node.closest('article').querySelector('a');
  let calls = 0;
  dom.window.fetch = async () => { calls++; return { ok: true, json: async () => ({ code: 200, content: { liveOpenDate: '2026-10-08 10:00:00' } }) }; };
  const hover = async () => { node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush(); };
  for (const href of ['https://foreign.invalid/video/123', '/lives']) {
    link.href = '/video/123'; await hover(); assert.ok(node.dataset.knifeTooltip);
    link.href = href; await hover(); assert.equal(node.dataset.knifeTooltip, undefined);
  }
  assert.equal(calls, 1, 'invalid links never trigger lookup and valid cached ID is reused');
});

test('VOD identity change supersedes pending lookup without stale response or duplicate requests', async t => {
  const dom = setup(t); const node = currentVodDate(dom); const link = node.closest('article').querySelector('a');
  const requests = [];
  dom.window.fetch = (url, options) => new Promise(resolve => { requests.push({ id: url.split('/').at(-1), signal: options.signal, resolve }); });
  const hover = async () => { node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush(); };
  await hover(); link.href = '/video/456'; await hover();
  assert.deepEqual(requests.map(r => r.id), ['123', '456']);
  assert.equal(requests[0].signal.aborted, true, 'the previous identity is cancelled');
  requests[0].resolve({ ok: true, json: async () => ({ code: 200, content: { liveOpenDate: '2026-10-08 10:00:00' } }) }); await flush();
  assert.equal(node.dataset.knifeTooltip, undefined);
  await hover(); assert.equal(requests.length, 2, 'old finally must not release a newer pending request');
  requests[1].resolve({ ok: true, json: async () => ({ code: 200, content: { liveOpenDate: '2026-10-08 11:00:00' } }) }); await flush();
  assert.equal(node.dataset.knifeTooltip, 'Live start: 2026-10-08 11:00:00');
});

test('VOD tooltip lookup leaves preexisting foreign annotations untouched', async t => {
  const dom = setup(t); const node = currentVodDate(dom);
  node.dataset.knifeTooltip = 'External annotation';
  let calls = 0; dom.window.fetch = async () => { calls++; return { ok: false }; };
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  node.closest('article').querySelector('a').href = 'https://foreign.invalid/video/456';
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide'));
  assert.equal(node.dataset.knifeTooltip, 'External annotation'); assert.equal(calls, 0);
});

test('reused VOD card does not overwrite or remove an externally replaced annotation', async t => {
  const dom = setup(t); const node = currentVodDate(dom); let calls = 0;
  dom.window.fetch = async () => { calls++; return { ok: true, json: async () => ({ code: 200, content: { liveOpenDate: '2026-10-08 10:00:00' } }) }; };
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  node.dataset.knifeTooltip = 'External replacement'; node.closest('article').querySelector('a').href = '/video/456';
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide'));
  assert.equal(node.dataset.knifeTooltip, 'External replacement'); assert.equal(calls, 1);
});

test('current VOD date shows metadata and reuses the cache for a replacement card', async t => {
  const dom = setup(t, playerHTML, 'https://chzzk.naver.com/');
  let calls = 0;
  dom.window.fetch = async (url, options) => {
    assert.equal(url, 'https://api.chzzk.naver.com/service/v3/videos/123');
    assert.equal(options.credentials, 'include'); calls++;
    return { ok: true, json: async () => ({ code: 200, content: { liveOpenDate: '2026-10-08 10:00:00' } }) };
  };
  const node = currentVodDate(dom);
  node.previousElementSibling.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(calls, 0, 'views metadata is not the last date item');
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(node.dataset.knifeTooltip, 'Live start: 2026-10-08 10:00:00');
  node.closest('article').remove();
  const replacement = currentVodDate(dom);
  replacement.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(replacement.dataset.knifeTooltip, 'Live start: 2026-10-08 10:00:00');
  assert.equal(calls, 1, 'a new node for the same VOD consumes the metadata cache');
});

test('current VOD date rejects foreign and nonvideo links', async t => {
  const dom = setup(t);
  dom.window.fetch = () => { assert.fail('untrusted or nonvideo metadata must not request a date'); };
  for (const href of ['https://foreign.invalid/video/123','/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','/video/123/extra']) {
    const node = currentVodDate(dom, href);
    node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
    assert.equal(node.dataset.knifeTooltip, undefined, href);
  }
});

for (const change of ['href','route']) test(`current VOD date ignores a late response after ${change} changes`, async t => {
  const dom = setup(t);
  const node = currentVodDate(dom);
  let resolve; let signal; let calls = 0;
  dom.window.fetch = (url, options) => {
    assert.equal(url, 'https://api.chzzk.naver.com/service/v3/videos/123');
    calls++; signal = options.signal;
    return new Promise(done => { resolve = done; });
  };
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(calls, 1);
  if (change === 'href') node.closest('article').querySelector('a').href = '/video/456';
  else { dom.reconfigure({ url: 'https://chzzk.naver.com/following' }); runtime(dom).reconcile(); assert.equal(signal.aborted, true); }
  resolve({ ok: true, json: async () => ({ code: 200, content: { liveOpenDate: '2026-10-08 10:00:00' } }) }); await flush();
  assert.equal(node.dataset.knifeTooltip, undefined);
});

test('current VOD date without start metadata stays unannotated and limited', async t => {
  const dom = setup(t);
  dom.window.fetch = async () => ({ ok: true, json: async () => ({ code: 200, content: {} }) });
  const node = currentVodDate(dom);
  node.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true })); await flush();
  assert.equal(node.dataset.knifeTooltip, undefined);
  assert.equal(runtime(dom).statuses.startTime?.state, 'limited');
});

function sidebarFixture(t, config = {}) {
  const html = '<div id="root"><aside id="sidebar">' +
    '<nav><strong class="_title_test">인기 카테고리</strong><button aria-label="새로고침" id="foreign-refresh"></button><button class="_more_button_test" aria-expanded="false" id="foreign-more">더보기</button></nav>' +
    '<nav id="following"><div class="_header_test"><strong class="_title_test">팔로잉 채널</strong><button aria-label="새로고침" id="refresh"></button></div><button class="_more_button_test" aria-expanded="false" id="more">더보기</button></nav>' +
    '</aside><div id="layout-body"></div></div>';
  const dom = page(html);
  const timers = new Map(); let next = 10000;
  const setInterval = dom.window.setInterval.bind(dom.window), clearInterval = dom.window.clearInterval.bind(dom.window);
  dom.window.setInterval = (fn, ms) => { if (ms !== 30000) return setInterval(fn, ms); const id = next++; timers.set(id, fn); return id; };
  dom.window.clearInterval = id => { timers.delete(id); clearInterval(id); };
  t.after(async () => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); await flush(); dom.window.close(); });
  load(dom, 'web/runtime.js'); load(dom, 'web/site-adapter.js');
  deliver(dom, config); load(dom, 'web/inject.js');
  const counts = { refresh: 0, more: 0, foreign: 0 };
  dom.window.document.getElementById('refresh').addEventListener('click', () => counts.refresh++);
  dom.window.document.getElementById('more').addEventListener('click', event => { counts.more++; event.currentTarget.setAttribute('aria-expanded', 'true'); });
  for (const id of ['foreign-refresh', 'foreign-more']) dom.window.document.getElementById(id).addEventListener('click', () => counts.foreign++);
  return { dom, timers, counts, tick() { for (const fn of [...timers.values()]) fn(); } };
}

test('sidebar refresh uses only following native control and stops when disabled or disposed', t => {
  const { dom, timers, counts, tick } = sidebarFixture(t, { updateSidebar: true });
  for (let i = 0; i < 10; i++) runtime(dom).reconcile();
  assert.equal(timers.size, 1, 'one 30-second refresh timer');
  tick(); assert.equal(counts.refresh, 1); assert.equal(counts.foreign, 0);
  const button = dom.window.document.getElementById('refresh'); button.disabled = true;
  tick(); assert.equal(counts.refresh, 1, 'busy native control is not clicked'); button.disabled = false;
  deliver(dom, { updateSidebar: false }, 2);
  assert.equal(timers.size, 0); tick(); assert.equal(counts.refresh, 1);
  deliver(dom, { updateSidebar: true }, 3);
  assert.equal(timers.size, 1); tick(); assert.equal(counts.refresh, 2);
  dom.reconfigure({ url: 'https://chzzk.naver.com/settings/profile' }); runtime(dom).reconcile();
  assert.equal(timers.size, 0); tick(); assert.equal(counts.refresh, 2);
});

test('following expansion handles late controls and option changes without reopening a user collapse', async t => {
  const { dom, counts } = sidebarFixture(t, { expandFollowings: false });
  deliver(dom, { expandFollowings: true }, 2);
  assert.equal(counts.more, 1); assert.equal(counts.foreign, 0);
  const button = dom.window.document.getElementById('more'); button.setAttribute('aria-expanded', 'false');
  runtime(dom).reconcile(); assert.equal(counts.more, 1);
  deliver(dom, { expandFollowings: false }, 3); deliver(dom, { expandFollowings: true }, 4);
  assert.equal(counts.more, 2);
  button.remove(); runtime(dom).reconcile();
  const replacement = button.cloneNode(true); replacement.setAttribute('aria-expanded', 'false');
  replacement.addEventListener('click', () => counts.more++);
  dom.window.document.getElementById('following').append(replacement); await flush();
  assert.equal(counts.more, 3);
});

test('sidebar refresh suspends for bfcache and restores one timer after pageshow', t => {
  const { dom, timers, counts, tick } = sidebarFixture(t, { updateSidebar: true });
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide', { persisted: true }));
  assert.equal(timers.size, 0); tick(); assert.equal(counts.refresh, 0);
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow', { persisted: true }));
  assert.equal(timers.size, 1); tick(); assert.equal(counts.refresh, 1);
});

test('unavailable following section never refreshes or expands another sidebar section', t => {
  const { dom, timers, counts, tick } = sidebarFixture(t, { updateSidebar: true });
  dom.window.document.getElementById('following').remove();
  deliver(dom, { updateSidebar: true, expandFollowings: true }, 2);
  assert.equal(timers.size, 0); tick(); assert.equal(counts.foreign, 0);
  assert.equal(runtime(dom).statuses.sidebarRefresh.state, 'limited');
  assert.equal(runtime(dom).statuses.expandFollowings.state, 'limited');
});

// Break caught: a reused offline anchor receives no hover/drag handlers when
// only its href becomes live. Exercise the actual preview pipeline, mocking
// only HTTP and the native DataTransfer boundary.
test('reused offline sidebar anchor acquires live preview and popup drag without replacement', async t => {
  const html = '<div id="root"><div id="layout-body"></div><aside id="sidebar"><a id="reused" href="/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">Channel</a></aside></div>';
  const requests = [];
  const dom = setup(t, html, 'https://chzzk.naver.com/', dom => {
    const anchor = dom.window.document.getElementById('reused');
    anchor.getBoundingClientRect = () => ({ left: 20, top: 80, bottom: 110, width: 180, height: 30 });
    dom.window.fetch = async (url, options) => {
      assert.equal(url, 'https://api.chzzk.naver.com/service/v3.3/channels/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/live-detail');
      assert.equal(options.credentials, 'include'); requests.push(url);
      return { ok: true, json: async () => ({ code: 200, content: { status: 'OPEN', adult: false, liveImageUrl: 'https://fixture.invalid/image.png' } }) };
    };
    load(dom, 'web/preview.js');
  });
  deliver(dom, { preview: true, livePreview: false, previewDelay: 0.1, popupPlayer: true }, 2);
  const anchor = dom.window.document.getElementById('reused');
  anchor.dispatchEvent(new dom.window.MouseEvent('mouseenter')); await flush();
  assert.equal(requests.length, 0, 'offline links do not request a stream');
  anchor.href = '/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; await flush();
  anchor.dispatchEvent(new dom.window.MouseEvent('mouseenter'));
  await new Promise(resolve => setTimeout(resolve, 130));
  assert.equal(requests.length, 1);
  assert.equal(dom.window.document.querySelector('.knife-preview')?.hidden, false);
  assert.equal(dom.window.document.querySelector('.knife-preview img')?.getAttribute('src'), 'https://fixture.invalid/image.png');
  let payload; let writes = 0;
  const transfer = { setData(type, value) { assert.equal(type, 'knife-data'); payload = value; writes++; } };
  for (let i = 0; i < 3; i++) { anchor.href = '/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; await flush(); anchor.href = '/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; await flush(); }
  const event = new dom.window.Event('dragstart', { bubbles: true }); Object.defineProperty(event, 'dataTransfer', { value: transfer });
  anchor.dispatchEvent(event);
  assert.equal(payload, 'https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(writes, 1, 'href cycles must not duplicate the drag handler');
  anchor.dispatchEvent(new dom.window.MouseEvent('mouseleave'));
  assert.equal(dom.window.document.querySelector('.knife-preview')?.hidden, true);
});

test('sidebar drag validates a reused anchor current URL instead of its initial live URL', async t => {
  const html = '<div id="root"><div id="layout-body"></div><aside id="sidebar"><a id="reused" href="/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">Channel</a></aside></div>';
  const dom = setup(t, html, 'https://chzzk.naver.com/'); deliver(dom, { popupPlayer: true }, 2);
  const anchor = dom.window.document.getElementById('reused');
  for (const href of ['/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'https://foreign.invalid/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']) {
    anchor.href = href; await flush();
    const payloads = [];
    const event = new dom.window.Event('dragstart', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', { value: { setData(type, value) { payloads.push({ type, value }); } } });
    anchor.dispatchEvent(event);
    assert.deepEqual(payloads, [], 'invalid current URL must not become a popup payload');
  }
});

test('closing a popup during a drag restores the document cursor and removes drag listeners', async t => {
  const dom = setup(t);
  deliver(dom, { popupPlayer: true }, 2);
  const body = dom.window.document.getElementById('layout-body');
  const drop = new dom.window.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperties(drop, { dataTransfer: { value: { getData: () => 'https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } }, pageX: { value: 400 }, pageY: { value: 200 } });
  body.dispatchEvent(drop);
  const popup = body.querySelector('.knife-popup');
  popup.querySelector('.knife-popup-drag-area').dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: 400, clientY: 200 }));
  dom.window.document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 450, clientY: 250, buttons: 1 }));
  assert.equal(dom.window.document.body.classList.contains('knife-dragging'), true);
  popup.querySelector('.knife-popup-close-button').click();
  assert.equal(body.querySelector('.knife-popup'), null);
  assert.equal(dom.window.document.body.classList.contains('knife-dragging'), false);
  dom.window.document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 500, clientY: 300 }));
  assert.equal(dom.window.document.body.classList.contains('knife-dragging'), false);
  await flush();
});

for (const interruption of ['blur', 'pagehide', 'released']) test(`popup drag stops after ${interruption} and ignores later unpressed movement`, t => {
  const dom = setup(t); deliver(dom, { popupPlayer: true }, 2);
  const body = dom.window.document.getElementById('layout-body');
  const drop = new dom.window.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperties(drop, { dataTransfer: { value: { getData: () => 'https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } }, pageX: { value: 400 }, pageY: { value: 200 } });
  body.dispatchEvent(drop);
  const popup = body.querySelector('.knife-popup');
  popup.querySelector('.knife-popup-drag-area').dispatchEvent(new dom.window.MouseEvent('mousedown', { button: 0, clientX: 400, clientY: 200, buttons: 1 }));
  dom.window.document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 450, clientY: 250, buttons: 1 }));
  assert.equal(dom.window.document.body.classList.contains('knife-dragging'), true);
  const position = popup.style.cssText;
  if (interruption === 'blur') dom.window.dispatchEvent(new dom.window.Event('blur'));
  else if (interruption === 'pagehide') dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide', { persisted: true }));
  else dom.window.document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 500, clientY: 300, buttons: 0 }));
  assert.equal(dom.window.document.body.classList.contains('knife-dragging'), false);
  dom.window.document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 550, clientY: 350, buttons: 0 }));
  assert.equal(popup.style.cssText, position, 'interrupted gesture cannot keep moving the popup');
});
