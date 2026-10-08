# 스타일 복원 기준 및 설치본 검사

날짜: 2026-10-08. 제품 기준: `5c03f5c`, 문서 기준: `2829c3b`.

## 복원 기준

사용자가 첨부한 두 스타일 설정 이미지에서 25개 항목을 확인했다. ON 10개, OFF 15개이며 글꼴 숫자는 0이다. 아래 값은 이후 임시 설정 검사의 복원 기준이지 제품 기본값이 아니다. 이미지 자체와 개인 브라우저 자료는 저장소에 추가하지 않는다.

| 그룹 | 설정 키 | 화면 표시 | 원래 값 |
| --- | --- | --- | --- |
| 플레이어 | fit-player | 화면 채우기 | OFF |
| 플레이어 | volume-percentage | 볼륨 퍼센트 표시 | ON |
| 플레이어 | hide-ff | 빨리 감기 버튼 숨기기 | OFF |
| 플레이어 | hide-comp | 오디오 컴프레서 버튼 숨기기 | OFF |
| 채팅 | chat-resize | 채팅창 크기 조절 | ON |
| 채팅 | chat-font-size | 폰트 크기 조절 | OFF / 0 |
| 채팅 | chat-timestamp | 타임스탬프 표시 | ON |
| 채팅 | hide-ranking | 주간 랭킹 숨기기 | OFF |
| 채팅 | hide-mission | 진행 중인 미션 및 파티 숨기기 | OFF |
| 채팅 | left-chat | 왼쪽 배치 | ON |
| 사이드바 | hide-offline | 방송 중이 아닌 채널 숨기기 | OFF |
| 사이드바 | hide-recommended | 인기 카테고리 숨기기 | ON |
| 사이드바 | hide-schedule | 다가오는 방송 일정 숨기기 | OFF |
| 사이드바 | hide-sidebar-partner | 파트너 스트리머 숨기기 | ON |
| 사이드바 | hide-shortcut | 서비스 바로가기 숨기기 | ON |
| 사이드바 | right-sidebar | 오른쪽 배치 | OFF |
| 툴바 | static-logo | 정적 로고 | OFF |
| 툴바 | hide-topics | 주제 탭 숨기기 | OFF |
| 툴바 | hide-studio | 스튜디오 버튼 숨기기 | OFF |
| 툴바 | auto-hide-toolbar | 자동 숨기기 | ON |
| 홈 | hide-recommended-live | 추천 방송 숨기기 | ON |
| 탐색 | top-explore | 사이드바 메뉴 툴바에 표시 | ON |
| 탐색 | hide-blocked | 차단한 유저 방송 숨기기 | OFF |
| 기타 | hide-live-badge | 생방송 뱃지 숨기기 | OFF |
| 기타 | rectangle-profile | 사각 프로필 이미지 | OFF |

## 현재 저장 설정의 설치본 관찰

사용자 시청 탭 대신 동일한 연결 Chrome의 별도 라이브 탭에서 검사했다. 저장소/계정/사용자 탭은 변경하지 않았다. 임시 CSS 노드는 0이었다.

- 첫 로드에서 native `miniplayer` 클래스와 353px 플레이어를 관찰했다. 문서 스크롤은 0이고 원래 플레이어 wrapper는 1963px였다. 원인은 확정하지 않았으며 정상 주 플레이어 검사로 합산하지 않았다. 허용된 CDP는 문서 응답 대기 중 사용할 수 없었고 다른 제어 경로로 우회하지 않았다.
- 별도 검사 탭을 정상 재로딩한 뒤 `miniplayer=false`, 주 플레이어 폭 1963px, 왼쪽 채팅 x=240/폭=353px를 확인했다. 59px로 축소된 이전 결함은 이 관찰에서 재현되지 않았다. 모든 모드/초기 로드의 성공을 의미하지 않는다.
- 크기 조절 CSS 변수는 1, handle은 1개였다. 이번 턴에서는 실제 드래그를 하지 않았다. 이전 VOD 드래그 수용과 이번 live의 handle 존재를 구분한다.
- 시각 CSS 변수는 1이고, 실제 메시지 3개의 `data-timestamp`가 HH:mm 형식이며 `::before` 내용과 일치했다. 최초 검사에서 HH:mm:ss로 가정한 format probe는 false였으나 실제 문자열은 HH:mm였다. 제품 오류로 취급하거나 형식을 변경하지 않았다. 채팅 본문/작성자는 기록하지 않았다.
- 볼륨 slider의 `aria-valuetext`와 `::before` 내용이 모두 `100 퍼센트`였다. hide-ff/hide-comp OFF에서 해당 소유 제어가 모두 `display:flex`였다. 반대 설정 수용은 아직 남아 있다.
- native 사이드바 nav는 6개였다. 실제 제목을 제한적으로 확인하여 인기 카테고리/파트너 스트리머/서비스 바로가기만 `display:none`, 팔로잉 채널/다가오는 방송 일정은 `display:block`임을 확인했다. 섹션 수가 바뀌는 경우의 positional selector 안전성을 증명하지 않는다.
- 헤더 y=-45px로 자동 숨김이 적용되어 있었다. focus/hover와 responsive 조합은 기존 툴바 보고서의 제한 수용에 해당하며 이번 관찰로 전체 조합을 추가 수용하지 않는다.
- 최종 주 영상은 readyState=4/playing이었다. 검사 탭은 닫았다. 제품 코드/빌드/저장 설정 변경은 없었다.

## 타임머신 및 다음 검사 경계

사용자가 미결제 상태 때문에 타임머신을 사용할 수 없다고 설명했다. 추가 결제나 우회를 요구하지 않고, 허용 DVR의 실제 탐색 성공 사례는 환경 조건으로 **실사용 미검증** 처리한다. VOD에서 이미 확인한 방향키 성공과 혼동하지 않는다. PR에 해당 제한을 명시해야 하며, 이 제외는 다른 미완료 기능/스타일 검사를 생략하거나 지금 PR을 여는 승인이 아니다.

다음 수동 UI 적용 묶음은 플레이어 4개만 반전한다: 화면 채우기 ON, 볼륨 퍼센트 OFF, 빨리 감기 숨기기 ON, 컴프레서 숨기기 ON. 나머지 21개는 위 기준을 유지한다. 실제 설정 화면 접근은 여전히 도구 정책상 불가하므로 사용자 적용 후 검사하고, 이후 위 원래 값으로 복원한다. 페이지 적용용 새로고침만 필요하며 제품을 바꾸지 않았으므로 확장 자체 새로고침은 필요하지 않다.

전체 기능/스타일 수용 및 기여 PR은 아직 완료하지 않았다.

## 플레이어 반대 설정 적용 후 검사

사용자가 위 4개 설정 적용 완료를 알린 뒤, 별도 live/VOD 탭을 만들었다. 최초 live 대기와 정상 reload 직후에도 native `.pzp-pc`/video가 없어서 소유 버튼 대기가 실패했다. 그 상태의 player 진단은 false이고 채팅/설정 bridge는 존재했다. 문서 응답 대기 중 CDP 제한을 다시 확인했으며 다른 제어 경로로 우회하지 않았다. 이후 live/VOD 모두 native player/video가 생성된 것을 확인했다. 초기 timeout을 제품 결함 또는 성공으로 바꾸지 않았고, 제품 코드는 수정하지 않았다.

| 설정 | 실제 설치본 결과 | 경계 |
| --- | --- | --- |
| hide-ff ON | live 버튼 `display:none`, 크기 0×0 | VOD에는 원래 해당 live 버튼이 없어 VOD 숨김 PASS로 합산하지 않음 |
| hide-comp ON | live/VOD 컴프레서 컨테이너 `display:none`, 크기 0×0 | UI 숨김이며 오디오 graph 상태를 변경하거나 DSP 검증으로 합산하지 않음 |
| volume-percentage OFF | live/VOD slider `::before=none`, native aria값 `100 퍼센트` 보존 | 저장 UI 반대 설정 기본 수용. 원래 ON 복원 확인은 아직 남음 |
| fit-player ON | live 현행 `_player_` max-height=1245px(1305−60), 주 player=1963×1104.75 | 적용값 관찰이지 모든 화면/모드에서 실제 공간 증가 PASS가 아님 |

VOD의 현행 `_player_` max-height는 `calc(100% - 84px)`였다. 1800×700의 실제 VOD viewport에서 container 폭1545/높이556, player 폭1189/높이556이었다. native 높이 제한이 남아 있어 화면 채우기 효과는 **판정 보류**한다. 원래 fit-player OFF로 돌린 동일 조건을 비교해야 선택자/우선순위 결함인지 판별할 수 있다. ON이라는 이유로 실제 채우기 성공을 주장하거나 현재 근거만으로 CSS를 수정하지 않는다.

같은 resize 호출 직후 live의 첫 읽기는 이전2560×1305 값이었으므로 live1800×700 검사로 합산하지 않았다. override reset 이후 live2560×1305와 VOD2560×1249의 기본 viewport를 확인했다. 두 탭의 기본 창 높이가 다르므로 동일 높이 비교로 취급하지 않는다. live/VOD의 주 영상은 readyState4/playing으로 시간이 증가했고 임시CSS는0이었다. native 초기 autoplay/mute 값은 검사자가 바꾸지 않았다.

하단의 채팅 제외 screenshot 요청은 `Page.captureScreenshot`5000ms timeout이었다. 저장된 성공 이미지가 없으며 다른 전송 방식으로 반복하지 않았다. 검사 탭을 모두 닫았고 사용자 탭/저장소/제품/build는 변경하지 않았다.

다음 단계는 플레이어 원래 값(화면 채우기OFF/볼륨 표시ON/빨리 감기 숨김OFF/컴프레서 숨김OFF)의 수동 복원과 실제 재검사다. 이 확인 전에는 플레이어 스타일 전체 수용/설정 복원 완료를 선언하지 않는다.

## 복원 확인 및 VOD 화면 채우기 결함 확정

사용자가 원래 4개 값으로 복원/페이지 적용 완료를 알렸다. 별도 VOD에서 컴프레서 `display:flex`, 볼륨 `::before="100 퍼센트"`를 확인했다. 별도 live는 다시 native player가 생기기 전 timeout이어서 이 관찰로 복원 성공을 주장하지 않았다. 대신 현재 목록에서 기존 사용자 live 탭을 정확한 URL/ID로 확인하고 **읽기 전용** DOM 검사만 수행했다. 해당 실제 player 폭1963px/빨리 감기flex/컴프레서flex/볼륨 `100 퍼센트`가 복원되어 있었다. 사용자 탭을 reload/탐색/클릭/음량 조절하지 않았으며 시청을 변경하지 않았다.

동일 VOD `/video/15573896`, 동일 viewport1800×700에서 OFF도 container1545×556/player1189×556/max-height `calc(100% - 84px)`였다. 앞선 ON과 값이 같으므로 현행 VOD의 화면 채우기는 **FAIL**이다. 라이브 화면 채우기 전체 모드는 별도이며, 이 결함을 전 기능 장애로 확대하지 않는다.

허용된 동일 VOD 탭의 DOM/CSS 진단으로 해당 DIV의 높이 제한이 **인라인 style**임을 확인했다. 기존 `[class^="vod_player__"]` 대상은0개이고 현재 `#player_layout.type_vod` 대상은1개다. 일반 `_player_` rule은 non-important이므로 인라인 max-height를 넘지 못한다. 기존 VOD important rule은 구형 선택자라 현행 요소에 적용되지 않는다. CSS 진단은 root depth0/정확한 player query/높이 속성만 사용했으며 전체 문서/개인 내용/React 객체/네트워크 payload를 기록하지 않았다.

이 제한된 결함의 in-chat 보완 설계는 **사용자 승인 대기**다: `styles/fit-player.css`의 legacy 규칙을 유지하고, `#layout-body` 내부에서 `#player_layout.type_vod`를 실제 포함하는 현행 `_player_` wrapper에만 `max-height:100% !important`를 추가한다. native fullscreen이 활성인 wrapper는 새 override에서 제외하고, live/iframe popup/foreign layout은 새 규칙에 매치하지 않도록 한다. 영상 크롭·속도·음량·설정 저장·권한·JS는 바꾸지 않는다. 인라인 제한을 가진 현행 VOD fixture에서 실패를 먼저 확인하고, legacy/live/foreign/fullscreen 보호와 CSS 제거 복원, 실제 낮은 높이 ON/OFF/wide/normal 검사를 수행할 예정이다. 이 구체안 승인 전 제품/검사 코드를 쓰거나 임시 후보 CSS를 적용하지 않았다.

뷰포트 override는 reset했고 기본 VOD2560×1249를 다시 확인했다. 허용된 CSS/DOM 진단 도메인은 disable하고 검사 탭은 닫았다. 이번에 확인한 원래 설정 복원은 플레이어4개에 해당하며 나머지 스타일을 변경하거나 전체25개를 재검증한 결과가 아니다. PR은 아직 열지 않았다.

## 승인된 VOD 화면 채우기 보완 후보

사용자가 위 bounded 설계를 승인했다. `styles/fit-player.css`에 현행 VOD override 한 규칙만 추가했다. HTML root/자손 어디든 fullscreen 상태가 있으면 새 규칙을 제외하고, root 안의 `#layout-body`/현행 `_player_`/`#player_layout.type_vod`를 모두 요구하며 `.knife-popup` 내부는 제외한다. legacy와 기존 live 규칙은 그대로 유지했다. 설정 키/JS/속도/음량/권한/의존성은 바꾸지 않았다.

`scripts/check-styles.mjs`의 실제 Chrome CSS 검사에 9개를 추가했다. 현재 VOD normal/wide의 인라인 제한 회귀 2개와 옵션 제거 복원 1개는 예상한556≠640으로 RED였고, 최소 수정 후 GREEN이었다. legacy/live/foreign/popup/root-fullscreen/player-fullscreen 6개는 기존 보호 characterization PASS이고 후보에서도 PASS다. fullscreen은 synthetic 새 프로필에서 실제 requestFullscreen/exitFullscreen을 사용했으며 설치된 사용자 Chrome의 모든 fullscreen 모드 검증은 아니다. 총49/49 PASS(Chrome155.0.8059.39), 전체 Node109/109 PASS였다.

실제 연결 Chrome의 별도 VOD에서 새 override만 임시 적용해 다음을 확인했다. 전체 source CSS의 설치본 수용과 구분한다.

| 1800×700 VOD | 규칙 OFF | 임시 규칙 ON | 다시 OFF |
| --- | --- | --- | --- |
| 일반 화면 container/player 높이 | 556px | 640px | 556px |
| 넓은 화면 높이 | 700px | 700px | 700px |

native 일반 모드 인라인 `calc(100% - 84px)`를 수정하지 않고 CSS 우선순위로만 넘었다. native 넓은 모드는 인라인 제한이 없어 높이가700px로 같았다. 넓은 모드 전환 직후 native 스크롤/사이드바 애니메이션 중 읽힌 좌표는 안정된 레이아웃 결과로 사용하지 않았다. 일반 모드로 돌린 뒤 실제 양수 scrollTop을 가진 검사 탭의 player/video/section만 상단으로 복원해 player y=15/높이640을 재확인했다. 검사자가 사용자 시청 탭을 조작하지 않았다.

검사 탭에서 중복 오디오를 피하려고 runtime이 선택한 주 video의 원래 muted값(false)을 보존하여 임시 mute했다. 마지막에 false로 복원했고 playing/readyState4/시간 진행/object-fit=contain을 확인했다. 새 override 제거 후556px, 임시CSS0/진단Symbol없음/일반모드/원래 expanded sidebar를 확인하고 탭을 닫았다. viewport reset 직후 읽기는 지연된1189×640였으므로 기본 크기 복원으로 주장하지 않았다. 새 별도 홈 탭에서2560×1305를 확인한 뒤 닫았다.

VOD 캡처는 이번에도 Page.captureScreenshot5000ms timeout으로 성공 이미지가 없다. 보안 정책을 우회하거나 다른 전송 방식을 쓰지 않았으며 실제 visual screenshot 검증은 미확인으로 유지한다.

빌드/패키지 v2.13.2·20 entry resources·diff check PASS. source/dist `fit-player.css` SHA256은 모두 `B2A56D16DC93EDC057BB059F28BDD7DDC39FA7E69AF0F07187C9DE4AF846EE89`다. 로그는 로컬 ignored `output/acceptance/vod-fill-css-red.log`, `vod-fill-css-green.log`, `vod-fill-node.log`에 남겼고 민감 payload는 추가하지 않았다.

아직 실제 저장 옵션 ON을 통한 전체 후보 CSS 등록/일반·넓은 화면/OFF 복원 수용은 남았다. 제품 변경으로 새 dist가 생겼으므로 사용자 확장 새로고침이 반드시 필요하다. 도구 정책상 이를 자율 수행할 수 없어 이 단계에서 중지한다. 기존 저장 설정은 화면 채우기OFF 등 사용자 원래 값 그대로이며, 새로고침 후 ON 테스트와 다시OFF 복원은 다음 단계다. 전체 기능/독립 최종 검토/PR 완료를 선언하지 않는다.

## aa6ad54 새 설치본의 저장 옵션 ON 수용

사용자가 확장을 새로고침하고 화면 채우기ON/페이지 적용 완료를 알렸다. source/dist hash는 위 값 그대로이고 제품 변경은 없었다. 별도 실제 VOD의1800×700 일반 모드에서 인라인 `calc(100% - 84px)`는 그대로이며 computed max-height100%/container와player 높이640px였다. 임시CSS는0개였다. native 넓은 화면으로 전환해700px/임시CSS0, 다시 일반 모드로 돌아와640px를 확인했다. 이는 새 설치본 저장 옵션ON의 기본 수용이다. OFF 복원/모든 화면 조건/visual screenshot 수용은 아직 남아 있다.

새 fullscreen 제외 규칙의 실제 모드 검사를 위해 일반 모드에서 native 전체화면 버튼을 한 번 클릭했으나 `document.fullscreenElement`가 없었다. 따라서 해당 자동 입력은 성공이 아니며 새 설치본 전체화면의 판정은 미확인이다. 이전 사용자의 기본 fullscreen/Esc 직접 PASS와 별도 synthetic native CSS fullscreen 보호 PASS를 유지하되, 이번 실패한 자동 진입을 제품 전체화면 결함 또는 현재 모드 성공으로 단정하지 않는다. 추가 우회 입력/추측 패치를 하지 않았다.

별도 검사 주video의 원래 muted=false를 보존해 임시true로 검사하고 끝에false로 복원했다. native 모드 전환이 변경한 검사 탭의 player/video/section scrollTop만 상단으로 돌렸다. 마지막 일반모드/비fullscreen/높이640/playing/ready4/시간진행/임시CSS0/진단Symbol없음을 확인한 뒤 닫았다. viewport override를 reset하고 새 별도 홈에서2560×1249를 확인한 뒤 닫았다. 사용자 시청 탭/저장소는 검사자가 변경하지 않았다.

다음 사용자 적용 묶음은 화면 채우기OFF 원복과 채팅6개 검사다. 채팅 크기 조절OFF, 폰트 숫자8, 타임스탬프OFF, 주간 랭킹 숨김ON, 진행 중 미션/파티 숨김ON, 왼쪽 배치OFF;나머지는 복원 기준 그대로다. 폰트 항목 checkbox는 disabled이고 숫자를 움직이면 자동 선택되므로 checkbox를 직접 켜라고 요구하지 않는다. 이후 실제font/handle/시각/배치/랭킹·미션 존재를 확인하고 채팅 원래 값(크기ON/font0/시각ON/랭킹OFF/미션OFF/왼쪽ON)으로 복원한다. 미션 이벤트가 없는 경우0개를 숨김 성공으로 표시하지 않는다. 제품을 바꾸지 않아 다음 단계는 확장 자체가 아니라 설정의 페이지 적용만 필요하다. 모든 기능/스타일 및 PR는 여전히 미완료다.

## 채팅 반대 설정 검사 및 배지 크기 결함

사용자가 위 묶음 적용 완료를 알렸다. 기존 사용자 시청 탭을 읽기 전용으로 확인했을 때 이전 문서의font0/14px/왼쪽채팅/handle1/시각ON/랭킹표시가 남아 있었다. 사용자 탭을 reload하거나 설정 저장 실패로 단정하지 않았다. 새 실제live/VOD 문서에는 새font8/설정OFF·ON이 적용되어 있었으므로 현재 설정 검사는 새 문서를 기준으로 했다.

| 항목 | 새 문서 실제 관찰 | 판정 범위 |
| --- | --- | --- |
| VOD 화면 채우기 OFF | 1800×700에서 인라인/계산 max-height `calc(100% - 84px)`/높이556 | 후보 저장ON640→원래OFF556 기본 원복 수용 |
| 채팅 크기 조절 OFF | live/VOD CSS변수없음/handle0 | OFF 기본 수용. live player는 handle 제거분3px만큼 증가해1966px |
| 타임스탬프 OFF | live/VOD 실제 message3개 `::before=none`/data-timestamp없음 | OFF 기본 수용 |
| 왼쪽 배치 OFF | live chat x2207/player x240, VOD1800px chat x1432 | 기본 오른쪽 배치 수용 |
| 폰트8 | live/VOD message·nickname22px | 일반 문자열 크기 수용. 아래 배지 결함으로 전체 글꼴 기능 PASS는 아님 |
| 주간 랭킹 숨김 ON | 실제live 대상1개 displaynone/높이0 | ON 기본 수용 |
| 미션/파티 숨김 ON | 실제live 해당 대상0개 | 이벤트가 없어 UNVERIFIED. 숨김 성공 또는 선택자 결함으로 단정하지 않음 |

VOD 처음 메시지 수0은 데이터가 아직 표시되지 않은 시점이었다. 이후 동일 문서 실제 message19개/본문·nickname22px를 확인했으므로0개를 글꼴 PASS/구조 불일치로 합산하지 않았다. 두 영상은 playing/readyState4/시간진행/임시CSS0이었다. 직접 재생·음량·속도·설정 저장은 바꾸지 않았다. 임시 viewport를 reset하고 별도 홈2560×1249를 확인한 뒤 탭을 닫았다. 채팅 내용/작성자/이미지 원문 URL은 저장하지 않았다.

추가 actuallive 배지 조사는 보완 필요 결함을 확인했다. 현재 일반 message 안의 실제 이미지6개는 제한적인 metadata 분류에서 badgeHint=true/emojiHint=false였다. `width`/`height` attribute는18인데, 현행 chat-font의 일반 image rule `24px+offset`가 important로 적용되어font8에서32×32px였다. 해당 이미지는 `_nickname_` 자손의 `_icon_` 안에 있고 아이콘과 바로 바깥 `_wrapper_`는 여전히18×18px였다. 따라서 닉네임 배지32px가18px 영역을 넘는다. 기존 legacy 배지 규칙의 의도는18px+offset(8일 때26px)이므로, 텍스트22px만으로 글꼴 전체 성공을 선언하지 않는다.

이 조사에서는 exact 채팅 image query/DOM depth0/해당 image의 width·height 규칙만 사용했고 src/alt/title 문자열은 출력하지 않고 분류 boolean만 남겼다. CSS/DOM 진단을 disable하고 추가 검사 탭을 닫았다. 제품/테스트/build/저장 설정을 변경하지 않았다.

**사용자 승인 대기 bounded 보완안:** `styles/chat-font-size.css`에서 실제 chat log/message/nickname/배지 icon 관계에만 배지 image와 icon·직접 외곽 wrapper 크기를18px+offset으로 맞춘다. 일반 이모지24px+offset과 문자열14px+offset, legacy 규칙은 유지한다. 임의 global `_icon_`/`_wrapper_` 요소까지 키우지 않는다. Native fixture에서 offset−6/0/8의 배지12/18/26px·이모지18/24/32px·텍스트8/14/22px 및 foreign/non-badge 경계 검사를 먼저 작성하고 실패→최소 수정→전체 회귀/실제 임시A/B를 수행한다. 승인 전에는 코드를 구현하지 않으며, 새 dist가 생기면 또 필수 수동 확장 새로고침 단계에서 중지한다. 현재 임시 저장값은 위 검사 묶음이고 최종 원래 채팅 값 복원은 보완 검증 후 남아 있다. 전체 기능/PR 조건은 미충족이다.

## 승인된 닉네임 배지 보완 후보

사용자가 위 설계를 승인했다. 추가 실제live 읽기 전용 관찰에서 native badge wrapper는 display:flex/gap4px이고 두 아이콘을 담은 wrapper도 있었다(18×2+4=40px). 따라서 외곽을 단일 배지26px로 고정하면 복수 배지를 깨뜨린다. 최소 보완은 실제 log/message/nickname 내부의 icon 및 그 image만18px+offset으로 맞추며, wrapper는 native flex의 자연 크기를 사용한다. 새 규칙 한 개를 `styles/chat-font-size.css`에 추가했고 legacy/이모지/문자열/JS/설정/권한/의존성은 바꾸지 않았다.

Native production CSS 검사9개를 추가했다. live/VOD 각각offset−6/0/8 배지·icon·복수 wrapper·이모지·텍스트 크기6개 및 옵션 제거1개는 기존 배지가 이모지 크기가 되는 실제 이유로7 RED였다. 수정 후7 GREEN. foreign/outside-log/비닉네임 icon 보호와 legacy 배지2개는 기존 characterization PASS이고 후보에서도 PASS였다. 복수 badge fixture의 expected wrapper width는28/40/56px(두 badge+기존4px gap)으로 고정 기대값이며 후보의 계산 함수를 거울로 쓰지 않았다. Chrome155.0.8059.39 native58/58, 전체Node109/109 PASS.

실제 Chrome 새 규칙 임시A/B 결과:

| font8 | 원래 설치본 | 새 규칙 임시 적용 | 새 규칙 제거 |
| --- | --- | --- | --- |
| live/VOD badge image | 32×32px | 26×26px | 32×32px |
| native icon | 18×18px | 26×26px | 18×18px |
| 한 badge wrapper | 18×18px | 26×26px | native 크기 |
| 두 badge wrapper | 40×18px | 56×26px | native 크기 |
| 일반 문자열 | 22px | 22px | 22px |

live 실제16개icon과VOD18개badge가 있는 문서에서 검사했고, viewport 안에 완전히 보인 live badge8개의 top/bottom이 message 범위 안에 있는 것도 확인했다. VOD 비닉네임 image20개 중 제한 metadata에서 실제 emojiHint=true인2개가32px를 유지했다. 나머지false hint를 이모지로 단정하지 않는다. 본문/작성자/이미지 URL·alt·title 원문은 출력/저장하지 않았다. 이 관찰은 새 추가 규칙만 임시 적용한 것이며 새 dist의 전체 CSS 등록/저장 옵션 수용은 아니다. 실제−6/0 조합은 native fixture 범위이며 현재 연결 문서의font8과 구분한다.

별도 live/VOD의 runtime 주 video만 원래 muted를 기록해 임시 mute하고 종료 때 각각 원래false/true로 복원했다. 재생/readyState4/시간진행을 확인했고 임시CSS0/진단Symbol없음을 확인한 뒤 두 탭을 닫았다. 사용자 탭/저장소와 viewport는 변경하지 않았다. 기존 screenshot 제한을 우회하거나 반복 요청하지 않았으며 visual 캡처 검증 미확인 경계는 유지한다.

build/package v2.13.2·20 entry resources·diff check PASS. source/dist `chat-font-size.css` SHA256은 모두 `E0D61E71845DA71AF0A0639B9E5C3AE02E47AB06C2037FCFB56D08997DD7BBF3`다. ignored 로컬 로그: `output/acceptance/chat-badge-css-red.log`, `chat-badge-css-green.log`, `chat-badge-node.log`.

새 dist의 등록 수용은 사용자 확장 새로고침이 필요한 필수 중지 단계다. 현재 테스트font8/채팅OFF·랭킹·미션ON 저장값을 그대로 두고 새로고침 및 치지직 페이지 reload 후 새 live/VOD 배지를 검증한다. 이후 원래font0/resizeON/timestampON/leftON/rankingOFF/missionOFF로 복원한다. 나머지 기능/스타일·최종 독립 검토·PR은 아직 미완료다.

## 79ef258 새 설치본 배지 수용

사용자가 확장과 치지직 페이지 새로고침 완료를 알렸다. 기존 사용자live 탭을 정확한 URL/ID로 확인하고 읽기 전용 검사만 수행했다. 이제font8/본문22px/배지image·icon26×26px/임시CSS0이었다. 실제icon13개와한배지wrapper26×26/두배지wrapper56×26을 확인했다. 사용자 탭을 reload/클릭/탐색/미디어 조작하지 않았다.

새 별도 실제 VOD도font8/본문22px/임시CSS0이었다. 실제badge25개 중3개 sample이26×26px였고, 두배지wrapper56×26/세배지wrapper86×26을 확인했다. 세배지 폭은3×26+기존gap4×2로 native flex의 자연 배치를 유지한다. 제한 metadata로 분류된 비닉네임 이모지6개 중2개 sample은32×32px였다. 주 영상은playing/readyState4/시간진행이었다. 내용/작성자/이미지 URL·alt·title 원문은 출력·저장하지 않았다. 별도 탭을 닫았고 이번 검사는 임시 CSS/음소거/viewport 조작 없이 수행했다.

source/dist hash는 위E0D61E...값 그대로다. 이는 현재 저장font8의 기본 설치본 수용이며 전체−6~16/특수후원·미션·삭제 메시지/모든 모드 수용을 뜻하지 않는다. 원래font0 등 채팅 설정 복원은 다음 단계다. 기존 screenshot/미션 이벤트 부재/전체기능·최종검토·PR 경계는 유지한다.

다음 수동 설정 묶음은 채팅 원복6개와 사이드바 반대설정6개다. 채팅은 크기조절ON/폰트0/시각ON/랭킹숨김OFF/미션숨김OFF/왼쪽ON으로 원복한다. 사이드바는 오프라인숨김ON/인기카테고리숨김OFF/일정숨김ON/파트너숨김OFF/바로가기숨김OFF/오른쪽ON으로 임시 반전한다. 다른 설정은 복원 기준을 유지한다. 현재 실제 sidebar native nav6개에서 팔로잉·일정은표시,인기·파트너·바로가기는숨김이었고 profile49개 중offline39/live10을 확인해 다음 OFF/ON 검사 입력 존재를 확인했다. 계정의 채널 이름/ID는 기록하지 않았다. 실제 수량은 서비스 상태에 따라 변하므로 다음 검사의 숫자 기대값으로 고정하지 않는다.

새 제품/build 변경이 없으므로 다음 단계는 확장 새로고침 없이 페이지 적용만 필요하다. 사이드바 검사 뒤 original offlineOFF/popularON/scheduleOFF/partnerON/shortcutON/rightOFF로 다시 복원해야 한다. 전체25개 스타일 완료/PR 준비로 선언하지 않는다.

## 사이드바 반대 설정 설치본 검사

사용자가 채팅 원복/사이드바6개 반전 적용 완료를 알렸다. 기존 사용자live 문서는 이전font8/오른쪽채팅/왼쪽sidebar/기존숨김을 유지하고 있어 읽기 전용 관찰로만 남겼다. 사용자 탭을 reload/탐색/클릭하지 않았으며 저장 실패로 단정하지 않았다. 새 실제home/live에는 새 사이드바 설정과 채팅 resize/timestamp/left/ranking 복원이 적용되어 있었다.

| 새 문서 항목 | 실제 결과 | 범위 |
| --- | --- | --- |
| 오프라인 숨김ON | home 실제offline39개 모두displaynone/live10개 모두표시 | 수량은 당시값이며 향후 고정 기대값 아님 |
| 일정 숨김ON | 실제 제목 확인 대상nav displaynone/높이0 | native nav6개 현재 상태의 기본 수용 |
| 인기/파트너/바로가기 숨김OFF | 각 native 제목 대상displayblock/높이존재 | 기존ON과 반대 설정 수용;동적 section 수 변경은 별도 |
| 오른쪽sidebar ON | home2560에서x2305/폭240, live2560에서x2320/폭240 | home root scrollbar15px 차이를 구분;body padding left0/right240 |
| 채팅 resize/timestamp/left 복원 | 새live handle1/변수1/실제시각before·attribute/채팅x0·폭353 | playerx356/폭1963 보존 |
| 랭킹 숨김OFF 복원 | 새live 실제대상displayflex | 기본OFF 수용 |
| 폰트0 원복 | 새home/live/reset홈 모두8px, actuallive본문22px | 원복 미완료. 설정 화면 숫자0/8을 사용자에게 확인 요청;저장/bridge 결함 원인 미확정 |

미션/파티는 실제 이벤트가 없어 이전 미검증 경계를 유지한다. 위 검사에 임시CSS가 없었다. source/dist badge CSS hash는 기존E0D61E...그대로며 제품 변경은 없었다.

오른쪽sidebar+top-explore+auto-hide 조합의 메뉴/검색과 폭 검사를 진행했다. 처음 여러 검사 탭 중 현재 선택된 탭이live였으므로 home에 요청한 resize가 home에 적용되지 않았고, RAF 조건 조회도5000ms timeout이었다. 선택탭ID와대상ID를 확인했으며 이 실패를 반응형 PASS/제품 결함으로 합산하지 않았다. 같은 브라우저의 전용 선택home 탭으로 이어가 실제 viewport를 확인하며 검사했다.

| 실제 viewport | 첫nav | 검색·메뉴 기본 결과 |
| --- | --- | --- |
| 2560×1305 | absolute/header row | headerY0/nav right895.53125/search left1709, 수평 겹침없음 |
| 1800×900 | absolute/header row | headerY약0/nav right895.53125/search left949, 간격53.46875px |
| 1200×900 | static/right sidebar | 첫navx965/폭200,searchx410/폭365,기본sidebar 메뉴로복귀 |

검색 포커스 및 메뉴 버튼으로 헤더를 표시했고, native 접기/확장 상태 변경도 확인했다. 접힌 상태의 읽기는sidebar폭82/body padding-right78이었다. 이 관찰로 모든 접힘 안정 치수/모든 클릭 영역의 무침범을 선언하지 않으며, 전체 모드 검증을 자동으로 닫지 않는다. 원래 nativeexpanded 상태로 되돌려 rawDOM에서폭240/expandedtrue를 확인했다. 1200폭에서도bodyright240/side240이었다. 계정 버튼/모든 mode조합/visual screenshot 수용으로 확대하지 않는다.

ownhome 검색은 빈 필드에 focus만 했고 입력/전송하지 않았다. 최근검색/계정 내용을 기록하지 않았다. 마지막 focus를blur/포인터를헤더에서이동/viewport override reset/own탭을정리했다. 새 별도home2560×1249를 확인한 뒤 닫았다. 사용자 설정 저장과 사용자 시청 탭 조작은 하지 않았다.

다음은 사이드바6개 원래값(offlineOFF/popularON/scheduleOFF/partnerON/shortcutON/rightOFF)의 수동 복원과 폰트 슬라이더0 확인·적용이다. 채팅 다른 항목은 이번 새live 기본복원 관찰을 유지한다. 제품을 바꾸지 않아 확장 자체 새로고침은 필요 없고 페이지 적용만 필요하다. 모든 스타일/전체기능/PR 완료 조건은 아직 미충족이다.

## 원래 설정 복원 확인 및 초기 메뉴 오숨김

사용자가 폰트0 재조정과 나머지 원복 완료를 알렸다. 새home/live에서 rootfont0px, 실제본문14px/닉네임배지18px/live시각attribute/handle1/왼쪽채팅x240·폭353/player폭1963을 확인했다. font 원복 때문에 제품을 수정하지 않았다. sidebarx0/폭240/body left240/right0,offline36개가모두표시,nav6 정착 후 팔로잉·일정표시/인기·파트너·바로가기숨김도 확인했다. 수량은 당시 관찰값이며 사용자 채널 목록은 저장하지 않았다.

그러나 같은 새home 초기 읽기에서는 native nav가2개만 있고 **일반 첫 메뉴와 서비스 메뉴 모두displaynone**이었다. 데이터 정착 뒤 nav6이 되자 일반 메뉴가block으로 돌아왔다. 초기 일반 메뉴는 native 고유 숨김 대상이 아니며 현재 `hide-sidebar-partner.css`의 `aside[aria-label="사이드바"] nav:nth-last-of-type(2)`가 nav2의첫 메뉴를 선택한다. 이 기본 기능은 섹션 수와 로딩에 따라 잘못된 대상을 숨길 수 있으므로 이전 nav6 상태만으로 전체 사이드바 수용을 닫지 않는다. hide-recommended/schedule/shortcut에도 같은 ordinal 방식이 있다.

고유 descriptor 확인은 직접 native 제목/aria/공개 링크만 사용했다. 일반 메뉴에는 직접 header제목과aria가 없고, 팔로잉 nav는aria팔로우,인기 nav는aria인기카테고리다. 파트너의 직접header에relative `/partner` 링크가 있었다. 서비스 nav의 공개 링크는 NAVER Game 홈/esports/original_series/pcgame/CHZZK lounge다. 일정은 직접 strong제목이확장 때‘다가오는 방송 일정’,접힘 때‘방송일정’이었다. 일정 항목은 현재 일반type_profile이며 `_type_schedule_`는0개여서 그 구형 marker를 일정 식별로 쓰지 않는다. 버튼/직접제목이 접힘 때 비거나 없어질 수 있으므로 표시 순서나 새로고침 버튼 하나로 분류하지 않는다.

잘못 닫힌 조회 표현식 한 번은 실행 전에 거부되었고 수정 후 read-only 결과만 증거로 사용했다. 추가 새 문서의 최초nav0 읽기도 메뉴 문제 재현으로 합산하지 않았다. 실제 핵심 재현은 위 첫 새home의nav2 none→정착nav6 block이다. 근거 없는 지속 장애/guest 실제 성공을 주장하지 않는다.

**사용자 승인 대기 bounded 보완:** 기존 `web/inject.js` sidebar 관찰/수명 관리에 실제 섹션 descriptor를 분류하는 소유표지를 추가하고 숨김4개 CSS를 이표지로 연결한다. 실제aria/직접header/공개링크 및 접힘일정 제목을 사용하며 일반메뉴·팔로잉·알 수 없는 섹션은 숨김 대상으로 추측하지 않는다. 기존 observer를 재사용하고 필요한 제목/descriptor 변경만 관찰한다. 새observer/타이머/네트워크 요청/권한/설정키는 만들지 않는다. Current DOM의 ordinal 선택자는 제거하고 별도 구형class 경계의 legacy CSS는 유지한다. scope 해제/section 제거·재사용에서 표지를 정리하고 다른 주체가 바꾼 값을 덮어쓰지 않는다. Bootstrap/metadata가없으면 순서fallback으로 다른메뉴를숨기지 않고 기본표시로 둔다.

승인 후 초기2→6/섹션누락·순서변경/접힘·확장/같은노드 제목변경/외부 표지변경/SPA·sidebar-root 교체 정리의 production 회귀와 native CSS 보호·legacy·옵션제거 검사를 먼저 실패로 재현한다. 모든 suite와build/package/hash를 확인하고 필요한 새dist 수용은 필수 수동 확장 새로고침 단계에서 중지한다. 아직 구현/테스트/후보CSS를 작성·적용하지 않았다. 나머지 툴바/탐색/프로필 검사 및 전체 기능/PR 완료도 남아 있다.

진단 과정의 own메뉴 접힘/확장은 끝에expandedtrue로 복원했고 검색focus를blur/포인터를옮긴 뒤 모든 own탭을닫았다. 사용자 시청 탭/저장소/viewport/제품/build는 변경하지 않았다. 원래 스타일 기준은 유지된다.

## 승인된 사이드바 섹션 식별 보완 후보

사용자가 위 bounded 설계를 승인했다. `web/inject.js`의 기존 sidebar observer와 route scope를 재사용해 current `nav[class^="_section_"]`에 `data-knife-sidebar-section`을 붙인다. 현재 DOM 숨김4개는 popular/schedule/partner/shortcut 표지를 소비하며, 별도 legacy class/ordinal 규칙은 그대로 유지한다. 새 observer·타이머·요청·권한·설정키·의존성은 추가하지 않았다. 기존 팔로잉 자동 확장/갱신 회귀도 전체 suite에서 유지한다.

식별은 nav의 aria-label 또는 직접 header/strong의 직접 text만 읽는다. 팔로우/팔로잉은 보호하고 row 내부 제목·nested nav는 대상에서 제외한다. 접힘으로 제목이 비었을 때 파트너는 직접 header의 same-origin `/partner`, 서비스는 직접 ul의 NAVER Game root와 `/esports` 공개 링크 조합을 사용한다. Game root의 raw URL 끝 slash에 의존하지 않는다. 일정은 직접 제목 ‘다가오는 방송 일정’/접힘 ‘방송일정’을 사용하며 구형 `_type_schedule_` row를 추측 근거로 사용하지 않는다. 알려지지 않은 제목이나 metadata 없는 초기 상태는 표지를 붙이지 않아 기본 표시한다. 다른 주체가 미리 붙이거나 변경한 표지는 덮어쓰지 않는다. 제거·동일 노드 재사용·root 교체·excluded route·문서 최종 해제에서 자신이 붙인 표지만 정리한다. bfcache와 일반 SPA 전환에서는 유지/재분류한다.

검증 기록:

- 수정 전 기존 전체 Node109/109 PASS로 기준을 확인했다.
- `tests/sidebar-sections.test.cjs` 최초10개 중 표지 부재를 검출한9개 RED→GREEN. 행·일반메뉴·팔로잉·nested nav 보호1개는 수정 전부터 PASS인 characterization이다. 초기2→6, 섹션 누락/재정렬, 접힘, text node/aria/href만 변경, 제거/재사용, 외부 marker, root 교체, SPA/bfcache/최종해제를 포함한다. 마지막 코드 점검에서 class만 바꾸는 동일 노드 section/header 재사용의 stale 표지1개도 추가 RED→GREEN으로 보완했다. 기존 observer의 attributeFilter에 class를 추가해 제거/재분류하며 새 observer는 없다. 총11개 중10개 RED→GREEN+1 characterization이다.
- native CSS25개 추가 중 섹션16개 부분집합과 미식별 상태의 일반 메뉴 오숨김17개 RED→GREEN. 개별 옵션ON/OFF 및 legacy8개는 기존 PASS를 유지하는 characterization이다. 수정 후 production JS+CSS 통합1개를 추가해 config-unready→초기2→6/접힘/재사용/해제를 함께 검사했다. 이 통합 검사는 추가 수용 검사이며 RED 증거로 합산하지 않는다.
- 통합 fixture의 첫 실패는 HTML Content-Type의 UTF-8 누락으로 한글 제목/aria가 깨진 입력 때문이었다. 제한 configReady/status/DOM 경계로 원인을 확인하고 fixture에 charset=utf-8을 지정했다. 그 실패를 제품 회귀나 성공으로 합산하지 않는다. 실제 서비스 페이지에는 이 fixture를 사용하지 않는다.
- 최종 전체 Node120/120, Chrome155.0.8059.39 native84/84 PASS. native 브라우저는 별도 합성 프로필이며 설치 확장/사용자 방송 검증이 아니다. 모든 synthetic URL 요청을 로컬 응답으로 처리했다.
- 새 별도 실제home 읽기 전용으로 첫nav2→다음nav6, `_section_` class·직접header/title·직접ul 관계와 제목/aria/파트너header 링크·Game root/esports 링크를 확인했다. 이것은 식별 입력 근거이지 새 설치본 수용이 아니다. 저장 설정/사용자 시청 탭/미디어/viewport를 변경하지 않았고 own탭을 닫았다. 채널/채팅 본문은 수집하지 않았다.
- 기본 sandbox 빌드는 realpath EPERM으로 실행 전에 중단됐다. 기존 경로 안전장치를 바꾸지 않고 승인된 검증 권한으로 실행해 build/package v2.13.2·20 entry resources PASS. 변경 소스5개와 dist의 SHA256이 모두 일치했다. `git diff --check` PASS.

| 파일 | source/dist SHA256 |
| --- | --- |
| web/inject.js | 64A89F871A95E36DB0D0C7C7CFE34F176BDB19A2AB33BC3431DD07AA05668826 |
| styles/hide-recommended.css | A6C68B29792C1B856E9D690038AC01C4706026DC8897FCFE6B53CAD51D1FC894 |
| styles/hide-schedule.css | DE231C66025B887C60AB06B8D3751855D074D3984B3D65776AFCC610847418D6 |
| styles/hide-sidebar-partner.css | 3D17641E6F40637A8354805FA2BA0373A4C1D9C4BD912912235174B8CF7467A1 |
| styles/hide-shortcut.css | 87D97504E26C42159FE3423DD6C66513CCE74A4842D6390D775A68BE12222B78 |

로컬 ignored 로그는 `output/acceptance/sidebar-sections-baseline.log`, `sidebar-sections-node-red.log`, `sidebar-sections-class-red.log`, `sidebar-sections-css-red.log`, `sidebar-sections-node-green.log`, `sidebar-sections-css-green.log`다. 사용자 계정의 실제 섹션 개수를 회귀 기대값으로 고정하지 않는다. 현재 확인하지 않은 언어/미래 native descriptor는 보수적으로 기본 표시하며 전체 variant 지원을 보장하지 않는다.

새 dist의 실제 등록/기본 설정 숨김·메뉴 보존/접힘·동적 전환 수용은 **사용자 수동 확장 새로고침이 필요한 필수 중지 단계**다. original25개 설정은 그대로 유지한다. 확인 후 나머지 툴바/탐색/프로필·전체 기능 검증 및 최종 독립 검토를 이어간다. 아직 전체 기능 수용/PR 생성 조건은 충족하지 않았으며 PR을 열지 않았다.

## 834da32 설치본 수용 및 실제 접힘 보완

사용자가 확장 새로고침 완료를 알렸다. 새 별도home 최초nav2에서 일반메뉴displayblock/marker없음,서비스displaynone/shortcut표지/rootfont0px/임시probeCSS0을 확인했다. 이전 초기 일반메뉴 오숨김은 이 실제 입력에서 재발하지 않았다. 다음 읽기nav6에서는 일반·팔로잉표시/인기·파트너·서비스숨김/일정표시로 original 저장 설정 적용을 확인했다.

그러나 native ‘메뉴 접기’ 키보드 Enter 후 service만marker없음/displayblock이 됐다. 인기·파트너 숨김과 일정표지/기본표시는 유지됐고 일정 직접제목은‘방송일정’이었다. 추가 공개 DOM 조사 결과 **서비스의 직접 header/strong 자체가 없어져 직접 blind span+ul만 남는다**. 같은 ul에 NAVER Game root/esports/original_series/pcgame/lounge 공개링크는 남아 있었다. 기존 구현은 `!title`에서 반환하므로 링크 fallback까지 도달하지 못한다. synthetic fixture는 빈 제목 strong을 남기는 불완전한 접힘 입력이어서 이 현상을 놓쳤다. 이 실서비스 실패를 synthetic PASS로 덮거나 전체 접힘 PASS로 기록하지 않는다.

검사 중 메뉴를 원래expandedtrue로 복원한 뒤 실제 일반 메뉴 링크로 홈→`/lives`→header home링크→홈의 SPA 전환을 했다. 일반·팔로잉 보존/숨김3개·일정표시, home-only 표지1→없음→1을 확인했다. 마지막expandedtrue/임시probeCSS0을 확인하고 own탭을 닫았다. 사용자 시청 탭·저장 확장 설정·미디어·viewport를 조작하지 않았고 채널 목록/채팅 내용을 기록하지 않았다. 저장 옵션OFF·전체variant·bfcache 실제 동작 등은 별도 미검증 범위다.

승인된 public-link 기반 접힘/초기 로딩 설계 범위 안에서 조치했다. 서비스 fallback의 선행 `!title` 조건만 제거하고, 알 수 없는 비어 있지 않은 직접 제목은 계속 기본 표시한다. native section/direct ul의 Game root+esports 두 링크 signature는 유지하며 마지막 순서나 과거 expanded 표지에 의존하지 않는다. 새observer/타이머/권한/설정/CSS 변경은 없다.

- 실제와 같은 header 전체 제거→blind span+ul을 사용하는 Node2개를 먼저 작성해 두 경우 모두 null≠shortcut으로 RED 확인했다. 일반메뉴 보존과 Game링크 하나만 남을 때 unknown으로 돌아가는 경계도 포함한다. 두 경우는 기존expanded→collapsed 및 cold compact 초기화다.
- 기존 productionJS/CSS 통합 fixture를 header 전체 제거 입력으로 수정해 ‘shortcut collapsed’ block≠none RED 확인했다. 제품의 최소 조건 수정 후 GREEN.
- 최종 전체 Node122/122, 별도 synthetic Chrome155.0.8059.39 native84/84 PASS. build/package v2.13.2·20 entry resources·diff check PASS. source/dist inject SHA256 모두 `B3C2045FFF367801285CC2A255F889D7232F4232EEED787B2D9DEFF3E953517C`다. 로컬 ignored 로그 `output/acceptance/sidebar-compact-node-red.log`, `sidebar-compact-css-red.log`, `sidebar-compact-node-green.log`, `sidebar-compact-css-green.log`.

새 보완본의 실제 설치 검증에는 다시 수동 확장 새로고침이 필요하므로 필수 중지한다. original 설정은 그대로 유지한다. 834da32의 초기/expanded/기본SPA 관찰과 새 보완본의 synthetic 결과를 구분하며 **새 설치본 접힘 수용/나머지 전체 검사/최종 독립 검토/PR은 미완료**다.

## 6d333f0 실제 접힘 보완본 수용

사용자가 새로고침 완료를 알렸다. 새 별도home의 첫nav2 일반메뉴block/서비스shortcut표지·none/임시probeCSS0을 확인했다. 데이터 정착nav6에서 original 메뉴/팔로잉block,인기/파트너/서비스none,일정block도 확인했다. 실제 메뉴 접기 후 서비스의 header가 없어졌지만 **shortcut 표지와displaynone이 유지**됐다. 인기 역시header없음/aria표지로none,파트너header링크로none,일정header/방송일정 표지로block이었다. 일반메뉴·팔로잉은표시했다. 이 사례는 새 설치본이며 임시 CSS/marker를 추가하지 않았다.

own페이지를 접힌 상태에서 reload했다. 첫 렌더nav2는expandedtrue였고, 다음에는native 접힘 설정이 늦게 복원되어collapsed/nav6/서비스header없음·shortcutnone이었다. 그 사이 stale ‘메뉴 접기’ locator의 no-match timeout1회가 있었다. 상태를 새로 읽어 실제 ‘메뉴 확장’/collapsed를 확인한 뒤 중복 접기를 시도하지 않았다. 최초렌더부터 compact였다고 주장하지 않으며, reload 후native 접힘 복원으로 범위를 제한한다.

접힌 상태의 실제 일반메뉴 링크로 home→`/lives`→header home링크→home SPA 전환에서도 일반·팔로잉 표시/인기·파트너·서비스숨김/일정표시가 유지됐다. 홈 복귀 직후 route는`/`였지만 home표지가 아직없었고, 이후 메뉴확장 동작 후 정착에서 home표지1을 확인했다. 중간표지값을 정착PASS/제품FAIL로 합산하지 않는다. 끝에original expandedtrue로 복원하고 임시probeCSS0을 확인했다.

남은스타일 original 기준의 실제 대상도 읽기전용으로 확인했다. header logo85px/mask없음,Studioflex/주제탭flex,첫navabsolute(topExploreON),live배지5개중숨김0,main프로필20개중sample3개radius50%였다. 수량은 당시값이며 실제 공개채널/계정 내용을 기록하지 않는다. legacy blocked target은0개여서 실제차단 숨김을PASS로 선언하지 않는다. 차단계정을 만들거나채널을차단하지 않는다.

own탭을닫았고 사용자 시청 탭·확장저장소·미디어·viewport는변경하지 않았다. source/dist inject hash는위B3C204...동일이며 제품/build를새로변경하지않았다. 이전Node122/native84 기록은 유지하되 이번실제DOM검사와fresh suite를혼동하지않는다. 새 독립검토/전체수용/PR은아직남아있다.

다음수동style묶음은 original과반대로 static-logo/hide-topics/hide-studio/hide-live-badge/rectangle-profile/hide-blocked ON,auto-hide-toolbar/top-explore OFF다. 적용페이지새로고침만필요하며 확장자체새로고침은불필요하다. 이묶음검사후 모두original(앞6OFF/뒤2ON)로복원해야한다. hide-blocked에실제대상이없으면 등록확인과실제숨김미검증을분리한다.

## 툴바·탐색·기타 8개 반대 설정 검사와 방송 정보 프로필 누락

사용자가 위8개 반대설정 적용 완료를 알렸다. 새home 초기main대상0/Studio·주제탭없음은 로딩 중 입력으로 남겼고 정착한 다음 실제 대상에서 검사했다. 임시probeCSS0이었다.

| 저장 옵션 | 정착한 실제 결과 | 판정 범위 |
| --- | --- | --- |
| 정적 로고ON | mask있음/padding-right80px/rect80px | nativeborder-box라computedwidth80px이고image내용폭0;syntheticcontent-box의computed0 기대값을 잘못 적용하지 않음. 실제pixels캡처 수용과구분 |
| 주제탭 숨김ON | 실제header대상1개none | 이전OFF flex와반전 기본수용 |
| 스튜디오 숨김ON | 실제header대상1개none | 이전OFF flex와반전 기본수용 |
| 자동 숨김OFF | hover/focus없음 headerY0 | 2560·1200·1800 실제폭에서고정 확인 |
| topExploreOFF | 첫navstatic/사이드바x20·폭200 | 1200·1800에서도static/이전ON absolute와반전 기본수용 |
| 생방송 배지 숨김ON | home live배지5개 모두none/다른배지31개숨김0 | 실제현재카드의기본수용;수량을향후고정기대값으로쓰지않음 |
| 사각 프로필ON | home프로필25개·sidebar49개·계정button/image radius0 | 이범위는수용했지만아래live/VOD방송정보프로필FAIL 때문에전체옵션PASS아님 |
| 차단방송 숨김ON | 실제legacy blocked target0 | 사용자적용완료와대상부재를구분.실제숨김미검증;Chrome확장저장소/등록API 우회조회나채널차단을하지않음 |

반응형 실제viewport1200×900/headerY0/navx20w200/searchx427w307/accountx1125w40、scrollWidth=clientWidth1185,1800×900/headerY0/navx20w200/searchx709.5w342/accountx1725w40、scrollWidth=clientWidth1785를 확인했다. 검색·계정 영역 겹침과가로넘침없음. viewport reset 직후read는1800이남는중간값이었고 다음읽기에서home2560×1305 원복을확인했다. 새ownlive/VOD는default2560×1249였다. 폭설정은own검사탭에만했으며user시청탭을조작하지않았다.

실제home의공개live/VOD링크로별도탭을열었다. 라이브·다시보기모두Studio/주제탭none/staticlogo mask/임시probeCSS0과mainvideo playing/readyState4/1920×1080을확인했다. 라이브player폭1963을보존했다. 미디어를mute/seek/toggle/음량변경하지않았다. 초기VOD프로필0은PASS로합산하지않았고데이터정착뒤대상을확인했다.

두화면의방송정보 채널프로필은 **a._thumbnail_17x81_109 > img(emptyclass)** 였고wrapper와image 모두radius50%였다. image60×60/wrapper70×70인native프로필이며current `rectangle-profile.css`의main `_image_` 선택자와legacy 이름에해당하지않는다. 홈/계정/sidebar의사각화가이미적용되어저장실패가아니라선택자누락임을확인했다. profile옆row에direct `_inner_` > `_channel_` 메타데이터와 `_control_`이있고상위direct `_container_` 관계가두화면에서같았다. 이미지URL/alt/채널이름/ID/본문/React객체는출력·저장하지않았다.

**bounded 보완안/승인 대기:** `styles/rectangle-profile.css`에 `#layout-body` 내부의direct container→row 관계이면서 sibling inner→channel 관계를가진채널정보thumbnail anchor와그direct classlessimg만radius0으로만드는선택자2개를추가한다. 기존home/sidebar/header/legacy규칙과크기·배치·JS·권한·설정키는유지한다. generic `_thumbnail_` 전체를사각화하지않는다. 읽기전용candidatequery는home0/live1/VOD1을선택했고,home의다른thumbnail anchor25개와live의다른5개는선택하지않았다. 후보CSS를쓰거나적용한결과가아니라범위입력검사다.

승인후실제구조를사용한native live/VOD회귀를먼저RED로재현하고,비채널썸네일/foreign/metadata관계불일치/옵션OFF원복/legacy보존경계를검사한다. 최소CSS추가후wholeNode/native/build/package/hash와실제검사를진행한다. 새dist가생기면필수수동확장새로고침단계에서중지한다. 승인전제품/테스트/build/후보CSS를변경하지않았다.

검사8개설정은현재임시반대값그대로이며 프로필보완검사후original로복원할예정이다. 모든ownhome/live/VOD탭을닫고viewport원복을확인했다. usertab/확장설정/ChromeAPI/미디어/계정차단은직접변경하지않았다. 제품변경없는조사이며전체옵션원복·나머지기능검증·최종독립검토·PR은남아있다.

## 승인된 방송 정보 사각 프로필 보완 후보

사용자가 위 bounded CSS 보완안을 승인했다. `styles/rectangle-profile.css`에 선택자2개만 추가했다. `#layout-body` 내부 direct container→row와 direct inner→channel 메타데이터 관계를 가진 thumbnail anchor 및 직접 classlessimg의radius를0으로만든다. 기존home/sidebar/header/legacy규칙·선언과70pxwrapper/60pximage 크기는그대로다. JS·권한·설정·의존성은바꾸지않았다.

`scripts/check-styles.mjs` native7개를추가했다. 실제live/VOD와같은채널정보구조의wrapper/image 사각화2개와옵션제거원복1개는기존radius50% 때문에3RED였다. generic video썸네일/직접metadata불일치·nestedrow,foreign본문,클래스가있는비프로필image,legacy보존4개는기존PASS인보호characterization이다. CSS 추가후3GREEN/보호4PASS,전체native91/91(Chrome155.0.8059.39),전체Node122/122 PASS. 새기대값은literalradius0/50%와wrapper70×70/image60×60이고제품선택자로expected를계산하지않았다.

실제A/B는별도ownlive/VOD에서current원본규칙에새규칙만임시추가했다. 두문서모두profile1개의wrapper/image반경50%→0px→50%였고wrapper70×70/image60×60크기를유지했다. live의다른thumbnail anchor5개와VOD의다른thumbnail element31개는관찰한반경변화0이었다. 이수량은당시값이다. 실제검사에유저이름/채널ID/이미지URL·alt/본문을출력하거나저장하지않았다. 사용자시청탭/확장저장소/ChromeAPI/viewport를변경하지않았다.

live 임시적용에서는video playing/readyState4였다. VOD최초적용읽기는pausedtrue/readyState4였고제거직전·직후는둘다pausedfalse/readyState4였다. CSS/진단코드로미디어상태를설정하지않았지만이관찰만으로전체구간무중단재생을보장하지않는다. 정지상태를해제하기위해play/seek/mute/toggle하지않았다. 임시style0/probeSymbol없음/원래반경50%를확인한뒤두own탭을닫았다. 실제A/B는새전체CSS의설치등록수용과구분한다. 기존스크린샷전송제한을우회/반복하지않았으며metrics범위로기록한다.

build/package v2.13.2·20 entry resources·diff check PASS. source/dist rectangle-profile SHA256 모두 `4E515030F77B12339D8D7A8A7CE48B38FD248275C7C1927AEC2FA7022A185EDC`다. local ignored로그 `output/acceptance/channel-profile-css-red.log`, `channel-profile-css-green.log`, `channel-profile-node.log`에기록했다.

새dist의실제등록수용에는 **필수수동확장새로고침** 이필요해중지한다. 현재8개임시반대설정은유지하고새설치본의profile/radius·썸네일보호를확인한후original(정적로고/주제숨김/Studio숨김/live배지숨김/사각profile/차단숨김OFF,자동숨김/topExploreON)로원복해야한다. 차단방송실제대상부재·기타메시지/모드·전체기능/최종독립검토/PR조건은아직미완료다.

## 5a76d95 사각 프로필 설치본 기본 수용

사용자가 확장 새로고침 완료를 알렸다. 이전 실제 home에서 확인한 공개 live/VOD 경로의 새 별도 문서를 열어 읽기 전용 검사했다. live 첫 읽기의 profile0은 로딩 중 값으로 제외하고 실제 대상 attached 후 검사했다. 두 문서 모두 채널 정보 profile1개의 wrapper/image radius0px, wrapper70×70/image60×60을 확인했다. 임시 probe style은0이며 후보 CSS를 추가하지 않은 설치본 결과다.

live 다른 thumbnail anchor5개의 native radius12px/child image13px, VOD 다른 thumbnail element31개 중 native DIV30개의 radius8px와 SPAN1개의 radius0px를 확인했다. 일반 썸네일을 전부 사각화하지 않았다. 두 문서 관찰 시 주영상 pausedfalse/readyState4/1920×1080이었다. 이는 관찰 시점의 상태이며 장시간 재생/음질/모든 모드의 수용을 뜻하지 않는다. 사용자 시청 탭·확장 저장소·미디어·viewport를 변경하지 않았고 own탭2개를 닫았다. 이미지URL/alt/채널ID/본문을 수집하지 않았다. 픽셀 캡처 미검증 제한은 유지한다.

현재 source/dist rectangle-profile hash는 위4E5150...와 일치한다. 이번에는 제품/테스트/build를 변경하거나 suite를 다시 실행하지 않았으므로 이전122/91 결과를 fresh 실행으로 주장하지 않는다. 검사8개 임시 설정의 original 복원(앞6OFF/뒤2ON)은 수동 설정 화면 접근이 필요한 다음 단계다. 원복 확인·나머지 기능/모드 검증·최종 독립 검토·PR은 남아 있다.

## 검사8개 original 설정 복원 확인

사용자가 원복 완료를 알렸다. 새 ownhome 정착에서 logo85px/masknone/padding0,Studio·주제탭flex,live배지5개숨김0,homeprofile25개radius50%,header focus/hover없음 margin/y-45px와첫navabsolute를 확인했다. 새 ownlive/VOD에서도 Studio·주제탭flex/header margin-45px/첫navabsolute 및 방송정보wrapper/image50%를 확인했다. 임시CSS0이므로 사각profileOFF의 설치본 원복도 수용한다. 실제 차단방송 대상부재는 여전히 미검증이며 이를 설정원복 실패/성공으로 추측하지 않는다.

세 문서 모두fontoffset0px/resize변수1/timestamp변수1,sidebar 일반·팔로잉block/일정block/인기·파트너·서비스none이었다. live/VOD의채팅row-reverse/handle1을확인했다. 원래25개 기준 중 이번에 건드린8개와기존채팅/sidebar 유지의 관찰 범위다. 전체모드·모든특수메시지 PASS로확대하지 않는다. 처음live컨트롤부재는정착후comp1/ff1로확인했고로딩중0을FAIL/PASS로사용하지않았다.

이후 별도VOD의오디오 전환/SPA 검사와필터후속단계는 [원복 후 기능 검사](2026-10-08-restored-settings-and-runtime-checks.md)에기록한다. 모든own탭을닫고사용자탭/확장저장소/viewport를변경하지않았다. 제품·build변경없고전체검증/최종독립검토/PR은남아있다.
