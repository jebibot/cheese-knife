# 새 설치본 후속 검증 및 툴바 배치 설계 게이트

2026-10-08. 사용자가 `6bffbc4` dist의 확장 새로고침을 확인했다. 실제 사용자 Chrome의 별도 검사 탭에서 실행했으며 사용자 시청 탭의 경로·설정은 변경하지 않았다. 툴바 배치 충돌의 후속 승인·구현 결과는 아래 ‘승인 후 구현 및 검증’에 기록한다. 이 기록은 전체 기능 정상 판정 또는 PR 승인서가 아니다.

## 6bffbc4 설치본에서 확인한 범위

| 항목 | 실제 증거 / 범위 |
| --- | --- |
| 라이브 기본 | 1920×1080, 재생 유지, 컴프레서1개, resize handle1개, timestamp30개. 왼쪽 채팅 설정에서 플레이어 폭1963px 유지 |
| 팝업 | 사이드바의 실제 drag로640×360 생성. 이후+60/+50px 이동. 해제 후 knife-dragging=false, iframe pointer-events=auto. 닫기 후 popup0개 |
| 컴프레서/Gain | 실제 버튼 ON, Gain1.5→키보드1.55→1.5, 재생 유지, OFF 복원. 이번 검사는 주관적 음질 보장이나 장기GC 검사가 아님 |
| 사이드바 미리보기 | 실제 hover에서400×225, 음소거 재생,113프레임 관찰. 우클릭 음량0.05 관찰. 이탈 후 hidden=true/video0개 |
| surface 옵션 해제 회귀 | 실제 페이지 runtime의 임시 설정으로 sidebar preview=false/custom=true 변경. 진행 중 영상171프레임→hidden=true/video0개, 주영상 재생 유지. MAIN custom=false/sidebar=true도 영상 제거 확인. 저장소/UI 변경 경로 검사는 아님 |
| 메인 썸네일 | runtime 임시 custom=true/sidebar=false로 실제 카드 hover,231프레임. 폭320 설정은 카드폭392.796875px 하한을 적용. 폭600/image-only에서는600px,video0개,imageLoaded=true. live 모드 우클릭 음량0.07/음소거 해제/18프레임; 다시 음소거·이탈 후 정리 |
| VOD | 시작 때 native adbreak에서 본 영상이 정지해 있었고, 광고 종료 후 본 영상 재생/1726프레임/시각33개 확인. 광고를 건너뛰거나 조작하지 않음 |
| VOD 탐색/편집 | trusted ArrowRight delta4.912244초/재생 유지. 검색창 편집 중 ArrowLeft는 영상 delta0.050982초(자연 진행), 입력 보존. 검색은 제출하지 않고 빈값 복원 |
| VOD hold | 850ms 실제 클릭 유지 후 paused=false/rate1. 이번 실행은 hold 중간2배속을 별도로 측정하지 않았으며 이전 설치본 중간/원복 검사 기록과 구분 |
| SPA/미니플레이어 | 컴프레서ON의 VOD→채널: generation3→4, 동일 video400×225/pip_mode로 이동·재생 유지, 기존 오디오off/확장 제어0개. 미니플레이어에서 확장 제어를 유지한다는 보장은 아님 |
| 채널 채팅 버튼 | 실제 channel route에 버튼1개. 클릭 후 해당 `/live/<channel-id>`로 이동 완료. 대상은 플레이어 없는 종료 화면이어서 정상 방송 채팅 연결까지 PASS로 하지 않음 |
| 전체 화면 | 사이트 버튼 뒤 fullscreen=false, enabled=true. 오류 `TypeError: not granted`가 있었으나 전체 화면 때문인지 단정하지 않음. 여전히 미검증 |

임시 runtime 설정은 보관한 원래 config로 복원하고 진단 Symbol을 제거했다. 검사 중 Gain은1.5, 컴프레서는OFF로 복원했다. popup/preview/임시 CSS와 검색 입력을 정리했다. viewport override는 매회 reset했다. live 검사 탭에는 viewport override가 적용되지 않아 live 작은 화면 PASS를 주장하지 않는다. home 탭에서는1100×800의 실제 축소/사이드바82px를 확인했다. 채팅·후원·moderation·차단 관계를 변경하지 않았고, 토큰·쿠키·signed URL·채팅 본문을 기록하지 않았다.

## 스타일 추가 조사와 미적용 후보

홈/헤더/사이드바15개 스타일을 실제 CSSOM으로 조사했다. 타깃 존재/일부 display 변경은 전체 옵션 수용 또는 실제 저장 옵션ON/OFF 검사를 대신하지 않는다.

- hide-studio/topics/offline/recommended/schedule/sidebar-partner/shortcut/right-sidebar/static-logo/rectangle-profile/live-badge는 현재 DOM 타깃을 관찰했다.
- hide-recommended-live의 옛 `home_recommend_live_container__`는0개. 실제 홈의 추천 카드 영역은 새 section/grid 구조이며 동등한 의미 표지는 확인하지 못했다. 임의 nth-child나 개인화 데이터로 숨기지 않았다. **복구 미완료**.
- hide-blocked의 옛 타깃은0개였으나 실제 차단 상태 카드가 있는지 입증하지 못했다. 시험을 위해 실제 사용자의 차단 관계를 변경하지 않았다. **미검증**.

### 상단 탐색

옛 aside_content/navigation_bar 선택자는0개이고 첫 nav가 x20/y64, position=static/list=block이었다. 원본 CSS 임시 A/B도 위치가 변하지 않았다. 현재 첫 nav/직접 ul에 연결하는 후보의 native fixture3개는2FAIL→3PASS. 오른쪽 사이드바·1100px에서 무관한 섹션/다른 nav를 보존했다.

현재 여섯 번째 nav item은 `/cheezefarm` 프로모션 카드(56px)로서 툴바 밖/검색창 위로 넘쳤다. 원래 배너 숨김 의도를 보존해 이 첫 nav의 해당 item만 넓은 화면에서 제외하는 후보를 작성했다. native3개2FAIL→3PASS; 다른 farm 링크와 좁은 화면은 보존. 실제 후보에서 메뉴 y11..49, 프로모션display=none 확인.

### 자동 숨김과 조합

현재 sticky 헤더는 negative margin만으로 숨지 않아 y0을 유지했다. 또 사이트가 inline `transform:translateY(0px)`를 설정하므로 일반 CSS transform으로 덮을 수 없었다. 현재 aria 헤더에만 !important -45px를 적용하고 hover/focus-within에서는0으로 복원하는 후보를 작성했다. 옛 skin 선택자는 바꾸지 않았다.

현재 sidebar의 top-explore offset에도 기존 -45px 변수를 적용해 조합을 보완했다. 실제 A/B: 접힌 headerY=-45/navY=-34/bottom4, hover headerY=0/navY11/bottom49. 검색 포커스 중 펼침을 관찰했지만 actual pointer hover를 분리하는 진단은 성립하지 않았으므로 실제 무hover 포커스 PASS는 주장하지 않는다. 별도 native fixture에서 무hover 포커스는 확인했다.

native CSS 총25개 사례 PASS. **25개 스타일 전체를 검증했다는 의미가 아니다.** 전환 중의 -44/-1/-0을 읽는 검사 오차는100ms 전환 완료 조건과0.1px 허용 범위로 바로잡았다. 제품 변경으로 숨기지 않았다.

## 새로 발견한 배치 충돌 — 설계 승인 필요

선택자 복구 뒤 실제 홈에서:

| viewport | 메뉴 가로 범위 | 검색 input 범위 | 판정 |
| --- | --- | --- | --- |
|1200px|406..938.53125|427..734|겹침 FAIL|
|1800px|406..938.53125|709.5..1051.5|겹침 FAIL|

사이트 검색 container는 absolute/중앙 정렬이고 우측 제어 영역은340px였다. 따라서 옛1200px breakpoint와 중앙 검색 위치를 그대로 보존하는 설계는 충분하지 않다.

사용자에게 제안한 bounded CSS 설계:1800px 이상에서는 메뉴를 툴바에 두고 검색창을 우측 제어 앞에 정렬한다. 그보다 좁으면 기본 사이드바 메뉴를 유지한다. 저장 키/JS/검색 기능은 변경하지 않는다. 다른 선택지는 두 줄 툴바 설계를 별도 검토하는 것이다. 이 시점에는 승인을 기다렸다.

승인 요청 시점의 후보2개 CSS/진단 스크립트는 미커밋이며 새 dist에 적용하지 않았다. 실제 배치 FAIL을 자동 fixture25PASS로 덮지 않았다. 사용자 선택 전에 이 후보를 설치본으로 배포하거나 PR을 만들지 않았다.

## 승인 후 구현 및 검증

사용자가 권장안을 ‘승인’했다. `top-explore.css`의 breakpoint를1800px로 바꾸고, 해당 폭에서만 `#header div:has(> form #search-input)`을 native flex 흐름으로 되돌렸다. auto 왼쪽 여백·우측16px 여백으로 검색창이 우측 제어 바로 앞에 놓인다. 우측 제어의340px 폭을 제품 코드에 하드코딩하지 않는다. 좁은 화면의 사이트 검색·메뉴 위치, 기존 저장 키/JS/번역은 그대로다.

- TDD: breakpoint/검색/계정 제어 겹침의8개 실패를 관찰한 뒤 CSS 수정. native CSS 총33/33 PASS. 첫 섹션·farm·오른쪽 사이드바·1799/1800 경계·검색 제거 원복·다른 form 보존·inline sticky header·hover/무hover 포커스·auto-hide 조합을 포함한다.33개 사례이지25개 원래 스타일 전체 수용이 아니다.
- 전체 Node98/98, build/source·dist 패키지 v2.13.2/20 entry resources PASS. 수정 CSS2개 source/dist SHA256 일치, diff check PASS.
- 새 변경의 작성자 자체 검토: 선택자는 현재 공개 DOM 연결점에 한정되고, 비활성 스타일/1800px 미만의 검색창은 건드리지 않는다. vendor/권한/저장 형식을 바꾸지 않는다. 앞선 독립 전체 브랜치 검토가 이 후속 CSS를 승인했다고 주장하지 않는다. 전체 수용·PR 게이트는 여전히 남음.

### 실제 홈의 임시 CSS 검사

Chrome155.0.8059.39. 별도 사용자 Chrome 검사 탭에서 실제 viewport를 확인하고 원복했다. source CSS를 임시 style로 적용한 검사이며 **새 dist의 저장 옵션/등록 수용 검사가 아니다**.

| 폭 / 사이드바 | 메뉴 범위 | 검색 container 범위 | 결과 |
| --- | --- | --- | --- |
|1200/왼쪽|기본 사이드바 x20|410..775, absolute|기본 배치 유지|
|1799/왼쪽|기본 사이드바 x20|692..1092, absolute|기본 배치 유지|
|1800/왼쪽|406..938.53125|999..1399, static|겹침 없음|
|1920/왼쪽|406..938.53125|1119..1519, static|겹침 없음|
|2560/왼쪽|406..938.53125|1759..2159, static|겹침 없음|
|1800/오른쪽|363..895.53125|949..1349, static|겹침 없음|
|1920/오른쪽|363..895.53125|1069..1469, static|겹침 없음|

우측 제어 시작까지 검색창 뒤26px 간격을 확인했다.1800px 오른쪽 접힘의 settled 메뉴 x361..525.078125/y4..58도 검색949..1349와 겹치지 않았다. 접기 직후 transition 중 y11을 읽은 값은 settled 수용으로 사용하지 않았다. 버튼 복원 때 추측한 ‘메뉴 펼치기’가 아닌 실제 ‘메뉴 확장’ 이름을 확인한 뒤 클릭했고 펼침 상태를 복원했다.

오른쪽+auto-hide 조합: 마우스/포커스 없음 headerY=-45/navY=-34/bottom4. 페이지 focus 진단으로 검색창에 포커스를 주면 **hover=false/focus=true**, headerY=0/navY11. 이로써 앞선 실제 무hover 포커스 판단 유보도 해당 진단 범위에서 해소했다. trusted Tab 전체 순서/다른 메뉴 패널까지 증명하는 검사는 아니다.

마지막으로 임시 CSS0개, 검색 empty/absolute, 탐색 static, 사이드바 펼침, viewport2560 원복을 확인하고 검사 탭을 닫았다. 사용자 시청 탭은 그대로 유지했다. screenshot/whitelisted 수치 JSON은 ignored output/acceptance에만 남겼다. 새 dist 빌드 후 설치본 옵션 수용을 위해 사용자 확장 새로고침이 필요하다.

## 남은 전체 완료 조건

### 267d17c 설치본 수용

사용자가 새 확장 새로고침과 두 옵션ON/페이지 새로고침을 ‘완료’로 확인했다. 별도 새 홈 탭에서 **임시 style0개**인 상태로 headerY=-45/margin=-45,상단 nav absolute x406/y-34,검색 static을 확인했다. 같은 설치본에서 검색 focus만 주면 hover=false/focus=true/headerY0/navY11로 복원됐다.

실제 viewport1200/1799에서는 nav static 및 기본 absolute 검색을 유지했고,1800/1920/2560에서는 메뉴/검색/우측 제어가 겹치지 않았다.1800의 메뉴406..938.53125/검색999..1399는 앞선 임시 CSS 결과와 일치했다.5개 폭 모두 수용 PASS. 이번 실행은 오른쪽 사이드바 저장 옵션을 켜지 않았으므로 그 저장 옵션 조합까지 추가 PASS로 하지 않는다.

viewport2560/검색 empty/임시 style0개를 확인하고 포커스·검사 탭을 정리했다. 두 스타일은 사용자가 켠 상태를 유지했다. 사용자가 변경 전 상태를 제공하지 않아 OFF였다고 추측하거나 저장 설정을 덮지 않았다.

후속 조사: 일반 홈(`/`)에서 옛 추천 선택자0개,현재 추천 section의직접 two-columns grid1개,보존할 following/VOD list2개를 확인했다. 다음 bounded 설계로 홈 route 표지와 좁은 grid CSS를 제안했고 사용자 승인을 기다린다. 아직 product JS/CSS에 추가하지 않았다. 전체 화면은 사용자 직접 버튼 검사로 도구의 허가 제한과 결함을 구분하도록 요청했으며 답변 전 PASS로 하지 않는다.

툴바의 해당 설치본 충돌은 수용 검사에서 해소했다. 추천 방송 숨김, 삭제 채팅 표시의 지원 제한, 실제 허용-DVR/광고 안전성/전체 화면, 시작 시각, 실제 후원 유형, 나머지 스타일·작은 화면 조합, 전체 저장 옵션 수용 및 장기 오디오 수명 검사가 남는다. 기존 전체 브랜치 독립 검토를 후속 CSS의 전체 승인으로 재사용하지 않는다. 한글 기여 PR은 계속 보류한다.
