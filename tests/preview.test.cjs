const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, runtime, deliver, playerHTML, flush } = require('./helpers.cjs');

function setup(t) {
  const dom = page(playerHTML + '<a id="one" href="/live/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb">One</a><a id="two" href="/live/cccccccccccccccccccccccccccccccc">Two</a>');
  t.after(async () => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); await flush(); dom.window.close(); });
  const pending = [];
  dom.window.fetch = (_url, options) => new Promise(resolve => pending.push({ resolve, options }));
  for (const anchor of dom.window.document.querySelectorAll('a')) anchor.getBoundingClientRect = () => ({ left: 20, right: 120, top: 30, bottom: 50, width: 100, height: 20 });
  load(dom, 'web/runtime.js'); deliver(dom, { preview: true, livePreview: false, previewWidth: 400, previewDelay: 0.1, previewVolume: 5 });
  load(dom, 'web/preview.js');
  const response = image => ({ ok: true, json: async () => ({ code: 200, content: { status: 'OPEN', liveImageUrl: image, livePlaybackJson: '{}' } }) });
  return { dom, preview: runtime(dom).preview, pending, response, one: dom.window.document.getElementById('one'), two: dom.window.document.getElementById('two') };
}

test('late hover A cannot replace newer hover B even when abort is ignored', async t => {
  const { dom, preview, pending, response, one, two } = setup(t);
  const first = preview.show(one.href, one, true);
  const second = preview.show(two.href, two, true);
  pending[1].resolve(response('https://images.invalid/b.jpg')); await second;
  pending[0].resolve(response('https://images.invalid/a.jpg')); await first;
  assert.equal(dom.window.document.querySelector('.knife-preview img').getAttribute('src'), 'https://images.invalid/b.jpg');
  assert.equal(pending[0].options.signal.aborted, true);
});

test('hide before request response cannot reopen the preview', async t => {
  const { dom, preview, pending, response, one } = setup(t);
  const first = preview.show(one.href, one, true);
  preview.hide(); pending[0].resolve(response('https://images.invalid/a.jpg')); await first;
  assert.equal(dom.window.document.querySelector('.knife-preview')?.hidden ?? true, true);
});

test('same anchor changing URL invalidates an earlier request', async t => {
  const { dom, preview, pending, response, one } = setup(t);
  const first = preview.show(one.href, one, true);
  one.href = '/live/cccccccccccccccccccccccccccccccc';
  pending[0].resolve(response('https://images.invalid/a.jpg')); await first;
  assert.equal(dom.window.document.querySelector('.knife-preview')?.hidden ?? true, true);
});

test('untrusted hrefs do not request an API or create media', async t => {
  const { preview, pending, one } = setup(t);
  await preview.show('https://external.invalid/live/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', one, true);
  assert.equal(pending.length, 0);
});

for (const sidebar of [true, false]) for (const phase of ['fetch', 'preload', 'displayed']) {
  test(`disabling ${sidebar ? 'sidebar' : 'custom-card'} preview cancels its ${phase} while the other surface stays enabled`, async t => {
    const { dom, preview, pending, one } = setup(t);
    dom.window.HTMLMediaElement.prototype.pause = () => {};
    dom.window.HTMLMediaElement.prototype.load = () => {};
    let destroyed = 0;
    runtime(dom).Hls = class {
      static isSupported() { return true; }
      static Events = { ERROR: 'error', MANIFEST_PARSED: 'manifest' };
      on() {} loadSource() {} attachMedia() {} destroy() { destroyed++; }
    };
    const config = { preview: true, customPreview: true, livePreview: true, previewDelay: 0.1 };
    deliver(dom, config, 2);
    const showing = preview.show(one.href, one, sidebar);
    const response = { ok: true, json: async () => ({ code: 200, content: { status: 'OPEN', livePlaybackJson: JSON.stringify({ media: [{ mediaId: 'HLS', path: 'https://media.invalid/master.m3u8' }] }) } }) };
    if (phase !== 'fetch') { pending[0].resolve(response); await showing; }
    if (phase === 'displayed') { await new Promise(resolve => setTimeout(resolve, 150)); assert.equal(dom.window.document.querySelector('.knife-preview').hidden, false); }
    deliver(dom, { ...config, [sidebar ? 'preview' : 'customPreview']: false }, 3);
    assert.equal(pending[0].options.signal.aborted, true);
    if (phase === 'fetch') { pending[0].resolve(response); await showing; }
    await flush();
    assert.equal(destroyed, phase === 'fetch' ? 0 : 1);
    assert.equal(dom.window.document.querySelector('.knife-preview-video'), null);
    assert.equal(dom.window.document.querySelector('.knife-preview')?.hidden ?? true, true);
  });
}

for (const invalidation of ['removed', 'changed-href', 'disabled-live-preview']) {
  test('active HLS media is destroyed when its anchor/config is ' + invalidation, async t => {
    const { dom, preview, pending, one } = setup(t);
    dom.window.HTMLMediaElement.prototype.pause = () => {};
    dom.window.HTMLMediaElement.prototype.load = () => {};
    let destroyed = 0;
    runtime(dom).Hls = class {
      static isSupported() { return true; }
      static Events = { ERROR: 'error', MANIFEST_PARSED: 'manifest' };
      on() {} loadSource() {} attachMedia() {} destroy() { destroyed++; }
    };
    const config = { preview: true, livePreview: true, previewDelay: 0.1 };
    deliver(dom, config, 2);
    const showing = preview.show(one.href, one);
    pending[0].resolve({ ok: true, json: async () => ({ code: 200, content: { status: 'OPEN', livePlaybackJson: JSON.stringify({ media: [{ mediaId: 'HLS', path: 'https://media.invalid/master.m3u8' }] }) } }) });
    await showing; await new Promise(resolve => setTimeout(resolve, 150));
    assert.ok(dom.window.document.querySelector('.knife-preview-video'));
    if (invalidation === 'removed') one.remove();
    else if (invalidation === 'changed-href') one.href = '/live/cccccccccccccccccccccccccccccccc';
    else deliver(dom, { ...config, livePreview: false }, 3);
    await flush();
    assert.equal(destroyed, 1);
    assert.equal(dom.window.document.querySelector('.knife-preview-video'), null);
  });
}

test('default native thumbnail right-click unmutes only the card video', t => {
  const { dom } = setup(t);
  deliver(dom, { customPreview: false, rightClickToUnmute: true, previewVolume: 5 }, 2);
  const body = dom.window.document.getElementById('layout-body');
  body.insertAdjacentHTML('beforeend', '<a href="/live/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" id="native-card"><video muted></video></a>');
  const video = dom.window.document.querySelector('#native-card video'); video.muted = true;
  const event = new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  video.dispatchEvent(event);
  assert.equal(video.muted, false); assert.equal(video.volume, 0.05); assert.equal(event.defaultPrevented, true);
  const primary = dom.window.document.querySelector('.pzp-pc video'); primary.muted = true;
  primary.dispatchEvent(new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.equal(primary.muted, true);
});

test('preview display honors hover delay and hide cancels the scheduled display', async t => {
  const { dom, preview, one, pending, response } = setup(t);
  const showing = preview.show(one.href, one);
  pending[0].resolve(response('https://images.invalid/one.jpg')); await showing;
  assert.equal(dom.window.document.querySelector('.knife-preview').hidden, true);
  preview.hide(); await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(dom.window.document.querySelector('.knife-preview').hidden, true);
});

function clockPreview(dom) {
  let now=0, sequence=0;
  const timers=new Map();
  dom.window.Date.now=()=>now;
  dom.window.setTimeout=(callback,delay=0)=>{const id=++sequence;timers.set(id,{at:now+delay,callback});return id;};
  dom.window.clearTimeout=id=>timers.delete(id);
  return time=>{now=time;for(let count=0;count<100;count++){
    const next=[...timers].filter(([,timer])=>timer.at<=now).sort((a,b)=>a[1].at-b[1].at)[0];
    if(!next)return;timers.delete(next[0]);next[1].callback();
  }throw new Error('timer loop');};
}

test('metadata latency consumes hover delay instead of starting an additional full delay', async t => {
  const {dom,preview,one,pending,response}=setup(t);
  const tick=clockPreview(dom);
  const showing=preview.show(one.href,one,true);
  tick(75);pending[0].resolve(response('https://images.invalid/one.jpg'));await showing;
  assert.equal(dom.window.document.querySelector('.knife-preview').hidden,true);
  tick(99);assert.equal(dom.window.document.querySelector('.knife-preview').hidden,true);
  tick(100);assert.equal(dom.window.document.querySelector('.knife-preview').hidden,false);
});

test('stream prepares during remaining hover delay and leaving disposes the preloaded graph', async t => {
  const {dom,preview,one,pending}=setup(t);
  dom.window.HTMLMediaElement.prototype.pause=()=>{};
  dom.window.HTMLMediaElement.prototype.load=()=>{};
  let attached=0,destroyed=0;
  runtime(dom).Hls=class{static isSupported(){return true;}static Events={ERROR:'error',MANIFEST_PARSED:'manifest'};
    on(){}loadSource(){}attachMedia(){attached++;}destroy(){destroyed++;}};
  deliver(dom,{preview:true,livePreview:true,previewDelay:0.1},2);
  const tick=clockPreview(dom),showing=preview.show(one.href,one,true);
  tick(25);pending[0].resolve({ok:true,json:async()=>({code:200,content:{status:'OPEN',livePlaybackJson:JSON.stringify({media:[{mediaId:'HLS',path:'https://media.invalid/master.m3u8'}]})}})});
  await showing;
  assert.equal(attached,1);
  assert.equal(dom.window.document.querySelector('.knife-preview').hidden,true);
  preview.hide();tick(200);
  assert.equal(destroyed,1);assert.equal(dom.window.document.querySelector('.knife-preview-video'),null);
  assert.equal(dom.window.document.querySelector('.knife-preview').hidden,true);
});

test('metadata arriving after the hover deadline does not add another configured wait', async t => {
  const {dom,preview,one,pending,response}=setup(t),tick=clockPreview(dom);
  const showing=preview.show(one.href,one,true);
  tick(150);pending[0].resolve(response('https://images.invalid/one.jpg'));await showing;tick(150);
  assert.equal(dom.window.document.querySelector('.knife-preview').hidden,false);
});

test('cached re-entry still waits its own hover delay without another API request', async t => {
  const {dom,preview,one,pending,response}=setup(t),tick=clockPreview(dom);
  const first=preview.show(one.href,one,true);
  tick(75);pending[0].resolve(response('https://images.invalid/one.jpg'));await first;tick(100);
  preview.hide();tick(200);await preview.show(one.href,one,true);
  assert.equal(pending.length,1);
  tick(299);assert.equal(dom.window.document.querySelector('.knife-preview').hidden,true);
  tick(300);assert.equal(dom.window.document.querySelector('.knife-preview').hidden,false);
});

test('preloading never constructs media for an age-restricted stream', async t => {
  const {dom,preview,one,pending}=setup(t);
  deliver(dom,{preview:true,livePreview:true,previewDelay:0.1},2);
  const tick=clockPreview(dom),showing=preview.show(one.href,one,true);
  pending[0].resolve({ok:true,json:async()=>({code:200,content:{status:'OPEN',adult:true,livePlaybackJson:JSON.stringify({media:[{mediaId:'HLS',path:'https://media.invalid/master.m3u8'}]})}})});
  await showing;tick(100);
  assert.equal(dom.window.document.querySelector('.knife-preview').hidden,false);
  assert.equal(dom.window.document.querySelector('.knife-preview-video'),null);
  assert.equal(runtime(dom).statuses.livePreview.reason,'age-restricted-stream');
});
