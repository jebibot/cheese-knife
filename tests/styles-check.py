#!/usr/bin/env python3
"""styles/*.css 선택자 검사용 HTML 을 만든다.

치지직 번들(2026-11-26)에서 읽어 낸 DOM 구조를 본뜬 시험 문서에 모든 스타일을 넣고,
브라우저에서 열면 규칙마다 (1) 파싱됐는지 (2) 시험 문서의 요소에 걸리는지 표로 보여 준다.
잘못된 선택자는 브라우저가 규칙을 통째로 버리므로 "원본 규칙 수 != 파싱된 규칙 수" 로 잡힌다.

사용: python3 tests/styles-check.py 출력.html  → 브라우저로 열기
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 클래스 이름은 실제 번들 값(뒤 해시·줄 번호는 빌드마다 바뀜). 구조만 맞으면 된다.
FIXTURE = """
<div class="_glive_duf89_1">
  <div data-nlog-area="home_top_skin" class="_container_1mndr_2 _is_scrolled_1mndr_12"></div>
  <header id="header" class="_container_1cyju_1">
    <div class="_menu_logo_qz74s_1">
      <button type="button"></button>
      <h1 class="_logo_qz74s_9"><a href="/"><img class="_logo_chzzk_qz74s_21" width="85" height="27"></a></h1>
    </div>
    <div class="_container_mzph5_1">
      <div class="_container_w2gsx_2"><nav class="_navigation_w2gsx_16"><ul class="_list_w2gsx_20"></ul></nav></div>
      <div class="_section_mzph5_8">
        <div class="_box_mzph5_15"><a class="_button_x_1 _studio_button_mzph5_22"></a></div>
        <div class="_box_mzph5_15"><button class="_profile_button_mzph5_36"><img></button></div>
      </div>
    </div>
  </header>
  <aside id="sidebar" class="_container_1b725_2 _is_expanded_1b725_12">
    <div class="_wrapper_1b725_48">
      <div class="_content_1b725_30 _show_tooltip_1b725_35">
        <nav class="_section_qz74s_26" data-t="top">
          <ul class="_list_qz74s_54">
            <li class="_item_qz74s_107"><a class="_menu_qz74s_1" href="/lives"></a></li>
            <li class="_item_qz74s_107"><a class="_menu_qz74s_1" href="/category"></a></li>
            <li class="_item_qz74s_107"><a class="_banner_1b725_92" href="/cheezefarm"></a></li>
          </ul>
        </nav>
        <nav class="_section_qz74s_26" data-t="following">
          <ul class="_list_qz74s_54">
            <li class="_item_qz74s_107" data-t="live-channel">
              <div class="_item_3vlej_57 _type_profile_3vlej_70 _is_expanded_3vlej_64">
                <div class="_profile_3vlej_70 _is_live_3vlej_182"><img></div>
                <div class="_tooltip_3vlej_123"><div class="_tooltip_inner_3vlej_130"></div></div>
                <a class="_item_link_3vlej_126" href="/live/aaa"></a>
              </div>
            </li>
            <li class="_item_qz74s_107" data-t="offline-channel">
              <div class="_item_3vlej_57 _type_profile_3vlej_70">
                <div class="_profile_3vlej_70"><img></div>
                <a class="_item_link_3vlej_126" href="/bbb"></a>
              </div>
            </li>
          </ul>
          <div class="_box_qz74s_149"><button class="_more_button_qz74s_155" aria-expanded="false"></button></div>
        </nav>
        <nav class="_section_qz74s_26" data-t="categories">
          <ul class="_list_qz74s_54"><li class="_item_qz74s_107">
            <div class="_item_3vlej_57 _type_category_3vlej_103"><a class="_item_link_3vlej_126" href="/category/GAME/x/lives"></a></div>
          </li></ul>
        </nav>
        <nav class="_section_qz74s_26" data-t="schedule">
          <ul class="_list_qz74s_54"><li class="_item_qz74s_107">
            <div class="_item_3vlej_57 _type_profile_3vlej_70"><div class="_profile_3vlej_70 _is_live_3vlej_182"></div><a class="_item_link_3vlej_126" href="/live/ccc"></a></div>
          </li></ul>
        </nav>
        <nav class="_section_qz74s_26" data-t="partner">
          <div class="_header_qz74s_46"><a href="/partner" class="_link_window_3vlej_43"></a></div>
        </nav>
        <nav class="_section_qz74s_26" data-t="shortcut">
          <ul class="_list_qz74s_54"><li class="_item_qz74s_107"><a class="_menu_qz74s_1" target="_blank" href="https://game.naver.com"></a></li></ul>
        </nav>
      </div>
    </div>
  </aside>
  <div id="layout-body" class="_body_duf89_11 _is_expanded_duf89_22">
    <div data-nlog-area="chzzk_main_top_live"></div>
    <ul>
      <li data-t="blocked-card"><div class="_container_1v58w_2 _is_blocked_1v58w_9"><div class="_thumbnail_1v58w_20"></div></div></li>
      <li data-t="live-card">
        <div class="_container_1v58w_2">
          <a class="_thumbnail_1v58w_20" href="/live/ddd"></a>
          <div class="_description_1v58w_60"><em class="_container_abcde_1 _live_abcde_9 _medium_abcde_5 _is_on_abcde_12 _badge_1v58w_70"></em></div>
        </div>
      </li>
    </ul>
    <section class="_container_9sate_1 _is_large_9sate_7" data-t="live">
      <div class="_wrapper_9sate_17">
        <main class="_container_e18n0_2 _is_large_e18n0_17">
          <div class="_contents_e18n0_31">
            <div class="_player_e18n0_23"><div id="live_player_layout" class="chzzk_player type_live miniplayer is_large"><div class="pzp-pc"><div class="pzp-pc__volume-slider knife-gain-slider"></div><div class="knife-comp"></div><div class="knife-ff"></div></div></div></div>
          </div>
        </main>
        <div class="knife-resize-handle"></div>
        <aside id="aside-chatting" class="_container_nu1j9_2 _is_large_nu1j9_31">
          <div class="_container_rank1_1"><button class="_ranking_button_rank1_5"></button></div>
          <div class="_container_1li40_1" role="log">
            <div class="_fixed_1li40_16">
              <div class="_container_faoew_2" data-t="mission"><i class="_icon_mission_faoew_46"></i></div>
              <div class="_container_1rul5_2" data-t="party"><button aria-controls="party-wrapper"></button></div>
            </div>
            <div class="_wrapper_1li40_25">
              <div class="_item_1li40_7"><div><div class="_chatting_message_jbnq0_21" data-timestamp="12:34"></div></div></div>
            </div>
          </div>
        </aside>
      </div>
    </section>
    <section class="_container_vozox_1 _is_large_vozox_6" data-t="vod">
      <div class="_wrapper_vozox_41">
        <div class="_player_vozox_14">
          <div class="_video_vozox_51"></div>
          <aside id="vod-aside" class="_aside_vozox_44">
            <div class="_stack_vozox_26"><div class="_container_tdctj_2"><div class="_content_tdctj_120" role="log"><div class="_list_tdctj_127"><div class="_item_tdctj_142"></div></div></div></div></div>
          </aside>
        </div>
      </div>
    </section>
    <div class="_container_cbsk1_1" data-t="clip"><div class="_viewer_area_cbsk1_10"></div><div class="_comment_cbsk1_25"></div></div>
    <div class="_avatar_area_ic6oj_28"><img></div>
    <div class="miniplayer" data-t="miniplayer-not-large"></div>
    <div data-t="folded-chat"><div class="knife-resize-handle"></div><aside class="_container_nu1j9_2 _is_folded_nu1j9_10"></aside></div>
  </div>
</div>
"""

SCRIPT = """
const sources = JSON.parse(document.getElementById("sources").textContent);
const rows = [];
let bad = 0;
const walk = (rules, out) => {
  for (const r of rules) {
    if (r.cssRules && r.type !== CSSRule.STYLE_RULE) walk(r.cssRules, out);
    else if (r.type === CSSRule.STYLE_RULE) out.push(r);
  }
};
for (const [name, css] of Object.entries(sources)) {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  const parsed = [];
  walk(style.sheet.cssRules, parsed);
  // 원본 규칙 수 = '{' 개수 - at-rule 개수
  const expected = (css.match(/{/g) || []).length - (css.match(/@media/g) || []).length;
  const unmatched = [];
  for (const r of parsed) {
    if (r.selectorText === "html") continue;
    for (const sel of [r.selectorText]) {
      // 가상 요소는 떼고 센다
      const plain = sel.replace(/::(before|after)|:hover/g, "");
      let n = 0;
      try { n = document.querySelectorAll(plain).length; } catch (e) { n = -1; }
      if (n <= 0) unmatched.push(sel);
    }
  }
  const dropped = expected - parsed.length;
  const ok = dropped === 0 && unmatched.length === 0;
  if (!ok) bad++;
  rows.push({ name, expected, parsed: parsed.length, dropped, unmatched });
  style.remove();
}
document.getElementById("result").textContent = JSON.stringify({ bad, rows }, null, 1);
document.title = bad === 0 ? "STYLES OK" : `STYLES FAIL ${bad}`;
"""


def main():
    out = sys.argv[1]
    sources = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "styles", "*.css"))):
        css = open(path, encoding="utf-8").read()
        sources[os.path.basename(path)] = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    html = (
        "<!doctype html><meta charset=utf-8><title>running</title>"
        + FIXTURE
        + '<pre id="result"></pre>'
        + '<script type="application/json" id="sources">'
        + json.dumps(sources).replace("</", "<\\/")
        + "</script><script>"
        + SCRIPT
        + "</script>"
    )
    open(out, "w", encoding="utf-8").write(html)
    print(out)


if __name__ == "__main__":
    main()
