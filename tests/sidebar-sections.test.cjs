const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, runtime, deliver, flush } = require('./helpers.cjs');

const sections = {
  general: '<nav id="general" class="_section_test"><ul><li><a href="/lives">Live</a></li></ul></nav>',
  following: '<nav id="following" class="_section_test" aria-label="팔로우"><div class="_header_test"><strong class="_title_test">팔로잉 채널</strong></div></nav>',
  popular: '<nav id="popular" class="_section_test" aria-label="인기 카테고리"><div class="_header_test"><strong class="_title_test">인기 카테고리</strong></div></nav>',
  schedule: '<nav id="schedule" class="_section_test"><div class="_header_test"><strong class="_title_test">다가오는 방송 일정</strong></div><ul><li class="_type_profile_test">Scheduled profile</li></ul></nav>',
  partner: '<nav id="partner" class="_section_test"><div class="_header_test"><strong class="_title_test">파트너 스트리머<a href="/partner"><span>파트너 스트리머 목록</span></a></strong></div></nav>',
  shortcut: '<nav id="shortcut" class="_section_test"><div class="_header_test"><strong class="_title_test">서비스 바로가기<span>새 창</span></strong></div><ul><li><a href="https://game.naver.com">Game</a></li><li><a href="https://game.naver.com/esports">Esports</a></li></ul></nav>',
};
function setup(t, names = Object.keys(sections), before = () => {}) {
  const dom = page('<aside id="sidebar" aria-label="사이드바"><div class="_content_test">' + names.map(name => sections[name]).join('') + '</div></aside><main id="layout-body"></main>', 'https://chzzk.naver.com/');
  t.after(() => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); dom.window.close(); });
  load(dom, 'web/runtime.js'); load(dom, 'web/site-adapter.js'); deliver(dom);
  before(dom); load(dom, 'web/inject.js');
  return dom;
}
const marker = (dom, id) => dom.window.document.getElementById(id).getAttribute('data-knife-sidebar-section');

test('sidebar section identity survives cold two-section loading without marking general navigation', async t => {
  const dom = setup(t, ['general', 'shortcut']);
  assert.equal(marker(dom, 'general'), null);
  assert.equal(marker(dom, 'shortcut'), 'shortcut');
  dom.window.document.querySelector('._content_test').insertAdjacentHTML('beforeend', ['following','popular','schedule','partner'].map(name => sections[name]).join(''));
  await flush();
  for (const [id, expected] of [['general',null],['following',null],['popular','popular'],['schedule','schedule'],['partner','partner'],['shortcut','shortcut']]) assert.equal(marker(dom, id), expected, id);
});

test('sidebar identities do not depend on missing sections or reordered siblings', async t => {
  const dom = setup(t);
  const content = dom.window.document.querySelector('._content_test');
  for (const id of ['partner','general','schedule','following','shortcut','popular']) content.append(dom.window.document.getElementById(id));
  await flush();
  for (const id of ['popular','schedule','partner','shortcut']) assert.equal(marker(dom, id), id);
  for (const id of ['popular','schedule','partner']) dom.window.document.getElementById(id).remove();
  await flush();
  assert.equal(marker(dom, 'general'), null); assert.equal(marker(dom, 'following'), null); assert.equal(marker(dom, 'shortcut'), 'shortcut');
});

test('collapsed sidebar keeps aria/link identities and the compact schedule title', async t => {
  const dom = setup(t);
  for (const id of ['following','popular','partner','shortcut']) {
    const title = dom.window.document.querySelector('#' + id + ' ._title_test');
    for (const node of [...title.childNodes]) if (node.nodeType === 3) node.data = '';
  }
  dom.window.document.querySelector('#schedule ._title_test').firstChild.data = '방송일정';
  await flush();
  for (const id of ['popular','schedule','partner','shortcut']) assert.equal(marker(dom, id), id);
  dom.window.document.querySelector('#schedule ._title_test').firstChild.data = '다가오는 방송 일정';
  await flush(); assert.equal(marker(dom, 'schedule'), 'schedule');
});

test('service identity survives native collapse removing the entire header', async t => {
  const dom = setup(t, ['general','shortcut']);
  assert.equal(marker(dom, 'shortcut'), 'shortcut');
  const service = dom.window.document.getElementById('shortcut');
  service.querySelector('._header_test').remove();
  service.insertAdjacentHTML('afterbegin', '<span class="blind">서비스 바로가기</span>');
  await flush();
  assert.equal(marker(dom, 'shortcut'), 'shortcut'); assert.equal(marker(dom, 'general'), null);
  service.querySelector('a[href="https://game.naver.com/esports"]').remove(); await flush();
  assert.equal(marker(dom, 'shortcut'), null, 'one Game link is not a service signature');
});

test('cold compact sidebar identifies services without depending on a previous expanded marker', t => {
  const dom = setup(t, ['general','shortcut'], dom => {
    const service = dom.window.document.getElementById('shortcut');
    service.querySelector('._header_test').remove();
    service.insertAdjacentHTML('afterbegin', '<span class="blind">서비스 바로가기</span>');
  });
  assert.equal(marker(dom, 'shortcut'), 'shortcut'); assert.equal(marker(dom, 'general'), null);
});

test('reused section drops its old identity when direct header text changes', async t => {
  const dom = setup(t, ['schedule']);
  assert.equal(marker(dom, 'schedule'), 'schedule');
  const title = dom.window.document.querySelector('._title_test');
  title.firstChild.data = 'Other section'; await flush();
  assert.equal(marker(dom, 'schedule'), null);
  title.firstChild.data = '서비스 바로가기'; await flush();
  assert.equal(marker(dom, 'schedule'), 'shortcut');
});

test('aria-only and public-link-only descriptor changes update the same native section', async t => {
  const dom = setup(t, ['popular','partner','shortcut']);
  dom.window.document.querySelector('#popular ._title_test').firstChild.data = '';
  dom.window.document.querySelector('#partner ._title_test').firstChild.data = '';
  dom.window.document.querySelector('#shortcut ._title_test').firstChild.data = '';
  await flush();
  dom.window.document.getElementById('popular').setAttribute('aria-label', 'Other section');
  dom.window.document.querySelector('#partner a').setAttribute('href', 'https://foreign.invalid/partner');
  dom.window.document.querySelector('#shortcut a').setAttribute('href', 'https://game.naver.com/other');
  await flush();
  for (const id of ['popular','partner','shortcut']) assert.equal(marker(dom, id), null, id);
  dom.window.document.getElementById('popular').setAttribute('aria-label', '인기 카테고리');
  dom.window.document.querySelector('#partner a').setAttribute('href', '/partner');
  dom.window.document.querySelector('#shortcut a').setAttribute('href', 'https://game.naver.com/');
  await flush();
  for (const id of ['popular','partner','shortcut']) assert.equal(marker(dom, id), id, id);
});

test('sidebar classification ignores row text, foreign URLs, following and nested navigations', async t => {
  const dom = setup(t, ['general','following']);
  const general = dom.window.document.getElementById('general');
  general.insertAdjacentHTML('beforeend', '<ul><li><strong class="_title_test">다가오는 방송 일정</strong><a href="/partner">Partner row</a><a href="https://game.naver.com">Game row</a></li></ul><nav id="nested" class="_section_test" aria-label="인기 카테고리"></nav>');
  dom.window.document.getElementById('following').insertAdjacentHTML('beforeend', '<div class="_header_test"><strong class="_title_test">서비스 바로가기</strong></div>');
  await flush();
  assert.equal(marker(dom, 'general'), null); assert.equal(marker(dom, 'following'), null); assert.equal(marker(dom, 'nested'), null);
});

test('removed sidebar sections release their owned markers and can be reused as unknown', async t => {
  const dom = setup(t, ['schedule']); const section = dom.window.document.getElementById('schedule');
  assert.equal(marker(dom, 'schedule'), 'schedule');
  section.remove(); await flush(); assert.equal(section.getAttribute('data-knife-sidebar-section'), null);
  section.querySelector('strong').textContent = 'Unknown'; dom.window.document.querySelector('._content_test').append(section);
  await flush(); assert.equal(marker(dom, 'schedule'), null);
});

test('class-only native section or header reuse retires stale hiding identity', async t => {
  const dom = setup(t, ['schedule']); const section = dom.window.document.getElementById('schedule');
  assert.equal(marker(dom, 'schedule'), 'schedule');
  section.className = '_other_test'; await flush(); assert.equal(marker(dom, 'schedule'), null);
  section.className = '_section_test'; await flush(); assert.equal(marker(dom, 'schedule'), 'schedule');
  const header = section.firstElementChild;
  header.className = '_other_test'; await flush(); assert.equal(marker(dom, 'schedule'), null);
  header.className = '_header_test'; await flush(); assert.equal(marker(dom, 'schedule'), 'schedule');
});

test('section ownership never overwrites preexisting or externally changed markers', async t => {
  const dom = setup(t, ['popular','schedule'], dom => dom.window.document.getElementById('popular').setAttribute('data-knife-sidebar-section', 'external'));
  assert.equal(marker(dom, 'popular'), 'external'); assert.equal(marker(dom, 'schedule'), 'schedule');
  dom.window.document.getElementById('schedule').setAttribute('data-knife-sidebar-section', 'external-change');
  runtime(dom).reconcile(); await flush();
  assert.equal(marker(dom, 'schedule'), 'external-change');
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide'));
  assert.equal(marker(dom, 'popular'), 'external'); assert.equal(marker(dom, 'schedule'), 'external-change');
});

test('sidebar root replacement retires detached ownership and binds the new root once', t => {
  const dom = setup(t, ['popular','schedule']); const old = dom.window.document.getElementById('sidebar');
  assert.equal(marker(dom, 'popular'), 'popular');
  const replacement = old.cloneNode(true); for (const section of replacement.querySelectorAll('nav')) section.removeAttribute('data-knife-sidebar-section');
  old.replaceWith(replacement); runtime(dom).reconcile(); runtime(dom).reconcile();
  for (const section of old.querySelectorAll('nav')) assert.equal(section.getAttribute('data-knife-sidebar-section'), null);
  assert.equal(marker(dom, 'popular'), 'popular'); assert.equal(marker(dom, 'schedule'), 'schedule');
});

test('section identities survive bfcache and SPA then retire on exclusion and final disposal', t => {
  const dom = setup(t, ['partner']); assert.equal(marker(dom, 'partner'), 'partner');
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide', { persisted: true }));
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pageshow', { persisted: true }));
  assert.equal(marker(dom, 'partner'), 'partner');
  dom.reconfigure({ url: 'https://chzzk.naver.com/lives' }); runtime(dom).reconcile(); assert.equal(marker(dom, 'partner'), 'partner');
  dom.reconfigure({ url: 'https://chzzk.naver.com/settings/profile' }); runtime(dom).reconcile(); assert.equal(marker(dom, 'partner'), null);
  dom.reconfigure({ url: 'https://chzzk.naver.com/' }); runtime(dom).reconcile(); assert.equal(marker(dom, 'partner'), 'partner');
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); assert.equal(marker(dom, 'partner'), null);
});
