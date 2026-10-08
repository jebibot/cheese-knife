const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const base = 'https://chzzk.naver.com/live/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function page(html = '', url = base) {
  return new JSDOM(`<html><body>${html}</body></html>`, { url, runScripts: 'outside-only', pretendToBeVisual: true });
}
function load(dom, file) { dom.window.eval(fs.readFileSync(file, 'utf8')); }
function runtime(dom) { return dom.window[dom.window.Symbol.for('cheese-knife.runtime.v1')]; }
function deliver(dom, config = {}, revision = 1) {
  dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
    source: dom.window, origin: dom.window.location.origin,
    data: { namespace: 'cheese-knife', protocol: 1, type: 'config', revision,
      requestId: runtime(dom).requestId, config, i18n: { fastForward: 'Live edge', enableCompressor: 'Enable compressor', disableCompressor: 'Disable compressor', speed2x: '2x' } },
  }));
}
const playerHTML = '<div id="root"><div id="layout-body"><section><main><div id="live_player_layout"><div class="pzp-pc"><div class="pzp-pc__video"><video></video></div><div class="pzp-pc__bottom-buttons-left"><button class="pzp-pc__playback-switch"></button><div class="pzp-pc__volume-control"></div></div></div></div></main></section></div></div>';
const flush = () => new Promise(resolve => setTimeout(resolve, 30));
module.exports = { page, load, runtime, deliver, playerHTML, flush };
