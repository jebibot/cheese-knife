const test = require('node:test');
const assert = require('node:assert/strict');
const { page, load, runtime, deliver, playerHTML, flush } = require('./helpers.cjs');

function setup(t, vod = false, beforePlayer = () => {}) {
  const dom = page(vod ? playerHTML.replace('live_player_layout', 'player_layout') : playerHTML,
    vod ? 'https://chzzk.naver.com/video/123456' : undefined);
  t.after(async () => { dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide')); await flush(); dom.window.close(); });
  load(dom, 'web/runtime.js');
  deliver(dom, { arrowSeek: true, pressToFastForward: true });
  beforePlayer(dom);
  load(dom, 'web/player.js');
  return dom;
}
const ranges = values => ({ length: values.length, start: index => values[index][0], end: index => values[index][1] });

test('Vue-free live controls mount once and do not seek an empty buffer', t => {
  const dom = setup(t);
  runtime(dom).reconcile(); runtime(dom).reconcile();
  assert.equal(dom.window.document.querySelectorAll('.knife-ff').length, 1);
  dom.window.document.querySelector('.knife-ff').click();
  assert.equal(dom.window.document.querySelector('video').currentTime, 0);
});

test('live seeking clamps gaps and supports finite live duration', t => {
  const dom = setup(t);
  const video = dom.window.document.querySelector('video');
  Object.defineProperty(video, 'seekable', { value: ranges([[10,20],[30,40]]) });
  Object.defineProperty(video, 'duration', { value: 40 });
  video.currentTime = 19;
  runtime(dom).player.seek(false);
  assert.equal(video.currentTime, 30);
  dom.window.document.querySelector('.knife-ff').click();
  assert.equal(video.currentTime, 39.95);
});

test('editable descendants and sliders retain arrow keys', t => {
  const dom = setup(t);
  const video = dom.window.document.querySelector('video');
  Object.defineProperty(video, 'seekable', { value: ranges([[0,100]]) });
  video.currentTime = 50;
  dom.window.document.body.insertAdjacentHTML('beforeend', '<div contenteditable="true"><span id="typing">text</span></div><input id="slider" type="range">');
  for (const id of ['typing','slider']) {
    dom.window.document.getElementById(id).dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  }
  assert.equal(video.currentTime, 50);
});

test('Gain keys retain native range defaults without reaching player shortcuts', t => {
  const dom = setup(t, false, dom => load(dom, 'web/audio.js'));
  const { document, KeyboardEvent } = dom.window;
  const pzp = document.querySelector('.pzp-pc');
  let nativeShortcuts = 0;
  pzp.addEventListener('keydown', event => { nativeShortcuts++; event.preventDefault(); });
  const slider = document.querySelector('.knife-gain-slider');
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    slider.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false, `${key} must retain range default`);
  }
  assert.equal(nativeShortcuts, 0);
  pzp.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  assert.equal(nativeShortcuts, 1, 'non-slider shortcuts remain native');
});

test('quick VOD release preserves original user speed', async t => {
  const dom = setup(t, true);
  const video = dom.window.document.querySelector('video');
  video.playbackRate = 1.5;
  const target = dom.window.document.querySelector('.pzp-pc__video');
  target.dispatchEvent(new dom.window.MouseEvent('pointerdown', { button: 0, bubbles: true, clientX: 10, clientY: 10 }));
  dom.window.dispatchEvent(new dom.window.MouseEvent('pointerup', { button: 0, bubbles: true }));
  await flush();
  assert.equal(video.playbackRate, 1.5);
});

test('native replacement of control children automatically restores owned controls', async t => {
  const dom = setup(t);
  dom.window.document.querySelector('.pzp-pc__bottom-buttons-left').innerHTML = '<button class="pzp-pc__playback-switch"></button><div class="pzp-pc__volume-control"></div>';
  await flush(); await flush();
  assert.equal(dom.window.document.querySelectorAll('.knife-ff').length, 1);
});

function nativeVOD(t, initiallyPaused) {
  const dom = setup(t, true, dom => {
    const video = dom.window.document.querySelector('video');
    let paused = initiallyPaused;
    Object.defineProperty(video, 'paused', { get: () => paused });
    video.play = async () => { paused = false; };
    video.pause = () => { paused = true; };
    // External player boundary: the native video click toggles playback. Keep
    // actual DOM propagation and the production hold controller intact.
    dom.window.document.querySelector('.pzp-pc').addEventListener('click', event => {
      if (event.target.closest('.pzp-pc__video')) paused ? video.play() : video.pause();
    });
  });
  const video = dom.window.document.querySelector('video');
  const target = dom.window.document.querySelector('.pzp-pc__video');
  const send = (type, destination = target, detail = type === 'click' ? 1 : 0, pointerId = 7) => {
    const event = new dom.window.MouseEvent(type, { button: 0, bubbles: true, cancelable: true, detail, clientX: 10, clientY: 10 });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    destination.dispatchEvent(event); return event;
  };
  return { dom, video, target, send };
}

// Break caught: OFF is checked only at pointerdown, so a delayed or already
// active hold can outlive permission and change playback after being disabled.
for (const paused of [false, true]) test('VOD option OFF cancels a pending hold, paused=' + paused, async t => {
  const { dom, video, send } = nativeVOD(t, paused); video.playbackRate = 1.5;
  send('pointerdown'); deliver(dom, { pressToFastForward: false }, 2);
  await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(video.playbackRate, 1.5); assert.equal(video.paused, paused);
  assert.equal(dom.window.document.querySelector('.knife-ff-indicator'), null);
  send('pointerup'); assert.equal(send('click').defaultPrevented, false, 'a never-activated gesture remains a native click');
  assert.equal(video.paused, !paused);
  deliver(dom, { pressToFastForward: true }, 3);
  send('pointerdown'); await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(video.playbackRate, 2, 'reenabling permits a new hold');
  send('pointerup'); assert.equal(send('click').defaultPrevented, true);
  assert.equal(video.playbackRate, 1.5); assert.equal(video.paused, !paused);
});

for (const paused of [false, true]) test('VOD option OFF restores an active hold and consumes only its completing click, paused=' + paused, async t => {
  const { dom, video, send } = nativeVOD(t, paused); video.playbackRate = 1.5;
  send('pointerdown'); await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(video.playbackRate, 2); assert.equal(video.paused, false);
  deliver(dom, { pressToFastForward: false }, 2);
  assert.equal(video.playbackRate, 1.5); assert.equal(video.paused, paused);
  assert.equal(dom.window.document.querySelector('.knife-ff-indicator'), null);
  // OFF may occur long before physical release. Start the bounded click token
  // on matching pointerup, not on OFF where it could expire while still held.
  await new Promise(resolve => setTimeout(resolve, 1050));
  send('pointerup', undefined, 0, 8);
  send('pointerup'); assert.equal(send('click').defaultPrevented, true);
  assert.equal(video.paused, paused, 'native click must not undo OFF restoration of a completed hold');
  send('pointerdown'); send('pointerup'); assert.equal(send('click').defaultPrevented, false);
  assert.equal(video.paused, !paused, 'future short clicks retain native behavior');
});

test('VOD hold timer rechecks permission immediately before activation', async t => {
  const { dom, video, send } = nativeVOD(t, true); video.playbackRate = 1.5;
  send('pointerdown'); runtime(dom).config.pressToFastForward = false;
  await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(video.playbackRate, 1.5); assert.equal(video.paused, true);
  assert.equal(dom.window.document.querySelector('.knife-ff-indicator'), null);
});

test('OFF restoration of a VOD hold preserves a newer user-selected speed', async t => {
  const { dom, video, send } = nativeVOD(t, false);
  send('pointerdown'); await new Promise(resolve => setTimeout(resolve, 550));
  video.playbackRate = 1.25; deliver(dom, { pressToFastForward: false }, 2);
  assert.equal(video.playbackRate, 1.25);
  assert.equal(dom.window.document.querySelector('.knife-ff-indicator'), null);
  send('pointerup'); send('click'); assert.equal(video.paused, false);
});

for (const paused of [false, true]) {
  test('completed VOD hold restores speed/play state and consumes its native click, paused=' + paused, async t => {
    const { dom, video, send } = nativeVOD(t, paused);
    video.playbackRate = 1.5;
    send('pointerdown'); await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(video.playbackRate, 2); assert.equal(video.paused, false);
    send('pointerup'); const click = send('click');
    assert.equal(video.playbackRate, 1.5); assert.equal(video.paused, paused);
    assert.equal(click.defaultPrevented, true);
    assert.equal(dom.window.document.querySelector('.knife-ff-indicator'), null);
    send('pointerdown'); send('pointerup'); const shortClick = send('click');
    assert.equal(shortClick.defaultPrevented, false);
    assert.equal(video.paused, !paused, 'a subsequent short click must still toggle playback');
  });
}

test('short VOD click remains native and keyboard clicks are not consumed by a completed hold', async t => {
  const { dom, video, send } = nativeVOD(t, true);
  send('pointerdown'); send('pointerup');
  assert.equal(send('click').defaultPrevented, false); assert.equal(video.paused, false);
  send('pointerdown'); await new Promise(resolve => setTimeout(resolve, 550)); send('pointerup');
  assert.equal(send('click', undefined, 0).defaultPrevented, false); assert.equal(video.paused, true);
  const button = dom.window.document.querySelector('.pzp-pc__playback-switch');
  assert.equal(send('click', button).defaultPrevented, false);
});

test('cancelled VOD hold restores speed without consuming a later click', async t => {
  const { video, send } = nativeVOD(t, false);
  video.playbackRate = 1.5;
  send('pointerdown'); await new Promise(resolve => setTimeout(resolve, 550)); send('pointercancel');
  assert.equal(video.playbackRate, 1.5); assert.equal(video.paused, false);
  assert.equal(send('click').defaultPrevented, false); assert.equal(video.paused, true);
});

test('another pointer cannot end the active hold or consume its click token', async t => {
  const { video, send } = nativeVOD(t, false);
  send('pointerdown'); await new Promise(resolve => setTimeout(resolve, 550));
  send('pointerup', undefined, 0, 8); assert.equal(video.playbackRate, 2);
  send('pointerup');
  assert.equal(send('click', undefined, 1, 8).defaultPrevented, false);
  assert.equal(send('click').defaultPrevented, true);
});

test('unused completed-hold click token expires without intercepting a later activation', async t => {
  const { video, send } = nativeVOD(t, false);
  send('pointerdown'); await new Promise(resolve => setTimeout(resolve, 550)); send('pointerup');
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal(send('click').defaultPrevented, false); assert.equal(video.paused, true);
});

test('route disposal restores an active hold and removes its click interception', async t => {
  const { dom, video, send } = nativeVOD(t, false);
  video.playbackRate = 1.5;
  send('pointerdown'); await new Promise(resolve => setTimeout(resolve, 550));
  dom.reconfigure({ url: 'https://chzzk.naver.com/following' }); runtime(dom).reconcile();
  assert.equal(video.playbackRate, 1.5);
  assert.equal(dom.window.document.querySelector('.knife-ff-indicator'), null);
  assert.equal(send('click').defaultPrevented, false); assert.equal(video.paused, true);
});
