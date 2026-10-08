# 원복 후 설치본 기능 검사 — 진행 중

2026-10-08, 제품5a76d95/검증기록bdedd89, 설치Chrome155.0.8059.39. 사용자 검사8개 스타일 원복 완료 후 새 ownhome/live/VOD를 사용했다. 이번 단계에 제품/테스트/빌드 변경은 없다. 설정 원복의 상세는 [스타일 수용 기록](2026-10-08-style-baseline-and-acceptance.md)의 마지막 절에 이어진다.

## VOD 오디오 전환·화면 모드·SPA

초기 실제 VOD는 컴프레서OFF/Gain1.5,영상mutedtrue/playing/readyState4였다. 원래 Gain저장값을 쓰거나 영상mute/seek/play/pause를 직접 변경하지 않았다. 런타임 설정의 공개 leaf만 읽어 compressorDefaultfalse/threshold-50/knee40/ratio12/attack0/release0.25,선택된영상동일/eligibletrue를 확인했다. 토큰/영상URL/React객체/채팅을 읽거나 기록하지 않았다.

UI 버튼의 키보드Enter로20회 ON/OFF했다. 매번 해당상태 attached를 기다린 뒤 상태/Gain/재생만 읽었다. 20회모두번갈아on/off,Gain1.5,pausedfalse/ready4였고마지막OFF였다. 첫 활성화 전에 own문서 AudioContext의source/compressor factory2개만 임시계수 래퍼로 감쌌다. 관찰한source생성1회/compressor생성1회/source인자와선택영상동일을확인했다. finally에서원래propertydescriptor를복원하고probeSymbol을삭제했다. 이는20회전환구간의중복생성 방지/상태수용이지 실제스피커출력·음질·모든소스의보장이아니다. 이미mutedtrue인own영상을그대로검사했으며사용자방송음성은캡처하지않았다.

다시ON한뒤native‘넓은화면’→‘좁은화면’키보드왕복에서컴프레서1개/on/Gain1.5/playingready4와같은video/pzp/layout을확인했다. 넓은상태의버튼은‘좁은화면’,복귀뒤‘넓은화면’이었다. 이것은동일미디어 화면모드 변경이며실제video교체/remount나전체화면/PIP검사로합산하지않는다. OFF로복원하고modeprobe를삭제했다.

동일VOD에서ON→header공개home링크→홈현재카드의같은VOD링크로SPA왕복했다. 홈전환직후location만홈이고runtime/controls는이전값인중간상태였으므로PASS/FAIL로판정하지않았다. 정착뒤runtimeexplore/selectedPlayerfalse/oldaudioOFF/ownedcomp0,oldvideo는native미니영역에connected/playing/mutedtrue였다. VOD복귀뒤runtimevod/같은video/comp1/OFF/Gain1.5/playingready4를확인했다. 다시ON성공후OFF복원했다. 다른media생성·장시간GC·pauseddetached5초retirement경로는이실제사례로입증되지않으며기존별도회귀와구분한다.

모든임시audio probeSymbol3개부재/계수래퍼복원/원래OFF/Gain1.5/mutedtrue/일반화면을확인하고ownhome/live/VOD를닫았다. 사용자시청탭/확장저장소/viewport를변경하지않았다. 음질의toggle dip/customheadroom/실제청취등기존한계는유지한다.

## 영상 필터

실제런타임의원래값은밝기1/대비1/채도1/감마1/선명도0이었다. body knife-filter없음/knifeFilter자식0이었다. 이중립상태에서도nativePZP자체의SVG필터URL이영상computedfilter에남아있었다. 합성fixture의중립‘none’을실사이트의기대값으로잘못적용하지않는다.

기존`node scripts/check-video-filters.mjs --chrome`를새로실행해exit0/11checks/Chrome155.0.8059.39를확인했다. 별도합성profile에서productionconfig/mainJS/mainCSS로영상실제CSS필터pixels를검사했다. 각파라미터·합성5개·중립초기화11건이며로그는ignored `output/acceptance/final-filter-native.log`다. 마지막중립pixels100/80/60/자식0/filter none으로돌아왔다. 사용자설치확장이나방송pixels/사용자GPU수용으로합산하지않는다.

실제설치본의설정변경→SVG노드5개/영상필터반영→중립원복검사는남았다. 설정화면접근불가제한을유지하고확장isolated세계/Chrome storageAPI를통해우회변경하지않는다. 사용자에게설정UI에서시험값밝기1.5/대비1.1/채도0.5/감마0.8/선명도2적용을요청하고,검사뒤원래1/1/1/1/0으로복원확인해야한다. 확장자체새로고침은필요없다. 실제pixels/GPU확인은현재캡처제한과분리해미검증으로남긴다.

전체기능·특수메시지/타임머신권한/최종독립검토·PR게이트는아직완료되지않았다. 이전Node122/nativeCSS91기록을이번fresh실행으로주장하지않는다.

## 설치본 필터값 적용 후 native CSS 충돌 확인

사용자가시험값적용완료를알렸다. 새ownlive/VOD에서body knife-filterON/knifeFilter1개/자식5개를확인했다. RGB밝기slope1.5,대비slope1.1/intercept-0.05,감마exponent0.8,채도0.5,선명도kernel `0 -0.4 0 -0.4 2.6 -0.4 0 -0.4 0`이었다. 설정 bridge/SVG 생성은반영됐지만두문서의정착한주영상computedfilter는nativePZP URL이었다. 그러므로실제영상에확장필터적용은FAIL이며합성11PASS로덮지않는다.

VOD초기에는영상4개중native필터의paused720p1개/ready0인2개/knifeFilter의playing720p1개였다. 정착뒤native필터주영상1920×1080/playingready4와ready0영상2개로바뀌었다. 로딩중영상중하나에knifeFilter가보인것을주영상성공으로합산하지않는다. live정착주영상도1920×1080/playingready4/native필터였다. 미디어를seek/mute/play/pause하지않았다.

live주영상의matchedCSS에서기존 `.knife-filter video`와 native `.pzp-pc--<instance>.pzp-pc--filter .webplayer-internal-video`가둘다filter를선언하고둘다normalpriority였음을확인했다. 영상inlinefilter는없었다. native specificity가더높아확장선언을이긴다. CSS/DOM진단은허용된현재HTTP(S)탭에서depth0/document→주영상query→filter선언만반환하고끝에disable했다. 전체styleSheet/React/채팅/영상URL은수집하지않았다.

nativeSVG는GaussianBlur(stdDeviation1)→arithmetic Composite2개를사용하는기존보정파이프라인이었다. 두문서의 `.pzp-pc__video .webplayer-internal-source-wrapper`는DIV1개/directVIDEO1개/자체filter none이었다. 일반important로영상filter를교체하면기존native파이프라인을제거하므로그접근은추천하지않는다.

bounded보완안: `web/main.css`의필터규칙만조정해current PZP의직접VIDEO를감싼영상전용sourcewrapper에knifeFilter를적용하고,그directVIDEO는기존genericvideo선택자에서제외해중복적용을막는다. native영상filter/다른legacy·preview영상의기존적용/중립OFF동작을보존한다. JS/권한/저장값/observer는바꾸지않는다. 실제wrapper+강한native규칙을사용한회귀를먼저RED로재현하고native필터보존/한번적용/중립원복/legacy보존/실제pixels와재생검사후새dist를검증한다. 구현에는사용자짧은설계승인이필요하며승인전제품/테스트/후보CSS/build를변경하지않았다.

own탭2개를닫았고user탭/확장저장소/viewport/미디어를변경하지않았다. 현재필터시험값은그대로유지하며보완설치수용후1/1/1/1/0으로원복해야한다. 다음필수확장새로고침게이트와전체검증/최종검토/PR미완료조건은유지한다.

## 승인된 source-wrapper 필터 보완 후보

사용자가짧은CSS보완설계를승인했다. 먼저기존`check-video-filters.mjs`에현재PZP처럼더구체적인native영상filter규칙/sourcewrapper/directVIDEO와독립적인native반밝기SVG를사용한6사례를추가했다. source RGB100/80/60에native sRGB반밝기는50/40/30,확장밝기0은0/0/0인literal기대값이다. live/VOD wrapper적용2개,기본필터가없는wrapper의한번적용1개,중립복원1개가모두wrapper none으로4RED였다. native중립보존과non-PZP wrapper의기존video적용2개는수정전부터PASS인보호characterization이다. 기존11개는그대로통과했다. 계측함수의기대값을제품helper로계산하지않으며CSS적용후실제합성영상pixels를읽는다.

`web/main.css`의필터규칙만변경했다. 기존genericvideo규칙에서 `.pzp-pc__video .webplayer-internal-source-wrapper > video`를제외하고,현재영상sourcewrapper에동일한knifeFilter선언을추가했다. native영상filter는건드리지않는다. currentwrapper에native필터가없어도childvideo와중복적용되지않고,non-PZP/legacy영상과preview의기존generic경로는보존한다. JS/설정/권한/의존성/observer는바꾸지않았다.

최종검증:Node122/122,별도Chrome155.0.8059.39 native스타일91/91,필터17/17(4RED→GREEN+2보호+기존11) PASS. 수정후픽셀은active0/0/0,neutralnative50/40/30으로복원됐다. 현재fullCSS/MAINconfig+filter로검사하며합성profile결과를사용자GPU/실제스피커/설치수용으로합산하지않는다. ignored로그는 `filter-wrapper-red.log`, `filter-wrapper-green.log`, `filter-wrapper-node.log`, `filter-wrapper-styles.log`다.

실제A/B도시도했다. 최초VOD탐색timeout뒤선택browser5가명시적으로unavailable이되어지원troubleshooting을읽고inventory를확인했다. 같은Chrome extensionInstance가browser6으로재연결되어fresh binding/documentation을사용했다. 이전own탭2개를정확한owned ID로닫고새ownlive/VOD로검사를재개했다. stale탭/빈목록만으로browser를다시선택한것이아니다.

새live의rawCDP는paused document response처리중제한으로적용명령을거절했다. 다른전송경로/isolated세계/ChromeAPI로우회하거나재시도루프를만들지않았다. live임시CSS0/wrappernone을DOM으로확인했으므로 **실제live A/B는미검증**이다. VOD의해당탭origin CDP는허용돼새wrapper규칙만임시적용했다. wrapper none→knifeFilter→none/nativevideo computedfilter동일/wrapper크기동일/playingready4를확인했고finally에서style과probeSymbol을삭제했다. 임시CSS0을확인하고새own탭2개도닫았다. 이A/B는제외selector까지포함한새전체CSS설치수용이아니며영상pixels캡처수용도아니다. 사용자시청탭/확장저장소/viewport/미디어를직접변경하지않았다.

build/package v2.13.2·20 entry resources·diff check PASS,source/dist `web/main.css` SHA256 모두 `1BD89AAAC3225DCCCB63BA3A0A4DC0B405A238390D2BE2FF96FC3ED60589B9C7`다. 기존build경로검증/symlink거부를유지했다. 새dist에는필수수동확장새로고침이필요하므로여기서중지한다. 필터시험값1.5/1.1/0.5/0.8/2는유지한다. 새설치본live/VOD wrapper+native보존/재생검사후original1/1/1/1/0으로원복확인이남아있다. 모든기능/최종독립검토/PR는아직완료되지않았다.

## accf43c 필터 보완 설치본 기본 수용

사용자가확장새로고침완료를알렸다. 새ownlive/VOD를열어sourcewrapper/directVIDEO attached를기다렸다. 두문서bodyactive/knifeFilter1/자식5/임시probeCSS0을확인했다. 실제wrapper1개의computedfilter는knifeFilter이고directVIDEO는nativePZPfilter를유지하며knifeFilter를받지않았다. 임시CSS/설정주입이아닌새전체CSS설치본의한번적용·native보존수용이다. livewrapper1963×1104.75/VODwrapper1949×1096.3125였다.

live주영상은1920×1080/playingready4였다. VOD초기wrapper영상은1280×720/pausedtrue/ready4였으므로재생PASS로세지않았다. 같은문서의정착을추가읽기로확인한뒤주영상1920×1080/playingready4/같은wrapper필터·native보존을확인했다. visible native일시정지버튼과duration22976초의VOD재생상태를관찰했으며버튼입력/play/pause/seek/mute/광고skip을실행하지않았다. 초기정지의원인을추측하거나모든구간무중단재생으로주장하지않는다.

두own탭을닫았고user시청탭/확장저장소/viewport/미디어를변경하지않았다. source/distmainCSShash는위1BD89A...동일이다. 이번에는제품/build나suite를다시실행하지않아앞선122/91/17을fresh실행으로주장하지않는다. 사용자GPU/pixels와시각적변화확인은별도이며현재필터시험값은그대로다. 원래밝기1/대비1/채도1/감마1/선명도0을수동설정UI로복원하고새문서의bodyOFF/자식0/wrappernone/native영상filter보존을확인하는것이다음단계다. 전체기능/최종독립검토/PR은남아있다.

## 원래 필터 복원 및 실제 bfcache 후속 검사

사용자가필터원복완료를알렸다. 새ownlive/VOD에서body knife-filterOFF/knifeFilter자식0/임시CSS0/sourcewrapperfilter none/direct영상nativefilter보존·knifeFilter미적용을확인했다. 이읽기는video ready0/pausedtrue라서새재생PASS로합산하지않는다. own2개를닫았다. 별도home의허용MAIN읽기로설정leaf밝기1/대비1/채도1/감마1/선명도0을확인했다. 미리보기기존설정preview/livePreview/rightClicktrue/customfalse/폭400/지연0.1/음량5도유지됐다. 사용자시각변화확인답변은없어GPU/실제pixels수용을추측하지않는다.

실제ownhome의scope한정pagehide/pageshow listener로persisted만계측했다. 사이드바hover에서처음panel1/visible/영상ready0·pausedtrue를관찰했다. 이후status stream-playback-unavailable/limited이고fatalHLS진단은없었다. 최초대상의stream실패원인은확정하지않아정상재생/제품결함으로합산하지않는다. 해당상태에서정상문서탐색 `/lives`→back를실행했다. 계측pagehide.persistedtrue/pageshow.persistedtrue,같은probe/runtime인실제bfcache복원을확인했다. 복귀configurationready/미리보기hidden/video0이었다.

복귀후첫hoverpoint는native배치변화로stale이었다. elementFromPoint에서실제sidebar/livehit가아님을확인해제품실패로세지않았다. 현재liveanchor의center를실제hit와대조한뒤입력했고hoveredlink1을확인했다. 이후panel1/visible/영상mutedplaying/time29.982771·ready2→39.961153·ready4로재연결·시간진행을확인했다. 이탈후video0/hidden,임시listener2개와probeSymbol을제거하고ownhome을닫았다. 이것은해당홈미리보기bfcache의기본수용이지모든route/스트림/미디어교체/팝업bfcache보장이아니다. 채널·채팅본문/미디어URL을수집하지않았고user탭/확장저장소/미디어/viewport를변경하지않았다.

현재후보전체Node122/122/nativeCSS91/91/필터17/17을새로실행해PASS,source·distpackage각v2.13.2·20resources/diffcheck/mainCSSsource-disthash동일을확인했다. dist를다시빌드하지않았다. ignored로그 `readiness-node.log`, `readiness-styles.log`, `readiness-filters.log`다.

합성무음오디오측정도현재모듈로재실행해exit0/Chrome155.0.8059.39/source1/기본14case의fullscale초과sample0,Gain전환12개가각자의settledendpoint최대step을넘지않음을확인했다. 실제스피커에는0을출력했다. 기존toggle dip(250Hz약0.1447 대baseline0.2632,750Hz약0.1472 대0.2844)와별도stress peak1.95944/초과16000은유지되며해결/주관적음질보장으로주장하지않는다. ignored로그 `final-audio-native.log`와기존 `output/audio-quality/report.json`에기록됐다.

새문맥전체readiness독립검토에서중요2건/경미1건을발견했다. [후속 검토 기록](../reviews/2026-10-08-final-readiness-review.md)에원인/재현/미검증/짧은보완설계승인게이트를남겼다. 승인전제품/회귀파일/build는변경하지않는다. 전체기능완료/PR는아직아니다.

## 89b54c7 설치본: 승인된 세 수정의 수용

사용자가 확장 새로고침 완료를 알린 후 새 own home/VOD 탭에서 검사했다. 원래 preview=true/pressToFastForward=true/필터1·1·1·1·0/configuration ready를 확인했다. 제품 코드나 설정 저장소를 변경하지 않고 설치된 모듈을 사용했다. 아래는 통제된 DOM 전환/실제 포인터 검사이며, 실제 채널의 방송 시작이나 사이트 카드 재사용 발생 빈도를 증명하지 않는다.

| 수정 | 실제 설치본 증거 | 판정 범위 |
| --- | --- | --- |
| sidebar href 재사용 | 기존 sidebar 아래 owned 시험 anchor를 실제 공개 live 링크의 offline 경로로 추가. 초기 custom drag payload 없음 → 같은 노드의 href만 live로 전환 → payload 현재 URL 일치. 현재 rect와 elementFromPoint hit를 확인한 trusted hover 후 panel visible/video1/preview ready. leave hidden/video0. 이후 offline/foreign URL 모두 custom payload 없음 | 설치본 이벤트 연결·유효 주소·hover 표시 PASS. DataTransfer는 실제 DOM의 합성 dragstart 경계이고 native OS 드래그 중복 횟수/새 스트림 프레임 진행까지 측정하지 않음 |
| VOD tooltip 재사용 | 실제 홈 VOD 카드의 동일 날짜 노드/링크 A→B→A. A annotation 성공, B 전환 즉시 old annotation 제거·조회2, B annotation 성공/서로 다른 날짜, A 복귀 첫 text 일치·조회2 유지. foreign URL old annotation 제거, 외부 writer 표지 보존 | 실제 metadata API/동일 노드 재조회·cache·owned marker 처리 PASS. mouseover는 합성 이벤트, pending 경쟁/legacy/끊기지 않은 hover 모든 변형은 이 installed 검사로 보장하지 않음 |
| hold OFF | 광고가 아닌 settled 주 VOD 1920×1080/ready4/playing/rate1에서 trusted CDP mouse input. playing·paused 각각 pending OFF(23.4ms/16ms) 후 500ms 넘게 유지해도 rate1/indicator0, native 완료 클릭은 pause/play 유지. active에서는 rate2/indicator1 확인 후 OFF 즉시 rate1/indicator0/원래 playing 또는 paused 복원. OFF 뒤 약8.7초/32.7초 지나 matching release해도 재생 토글 없음. 다음 일반 short click은 native pause 정상 | pending/active 및 playing/paused 설치본 기본 수용 PASS. foreign pointer/새 사용자 rate/취소/기타 모드 경계는 별도 Node 회귀 증거이지 모두 실제 입력 PASS는 아님 |

sidebar anchor의 draggable은 HTML anchor 기본값도 true이므로 처음 읽은 false인 `offlineInitially` 값을 연결 실패 증거로 쓰지 않았다. 초기 잘못된 hover y=160은 실제 반환 rect y=200의 중심 y=220으로 수정하고 hit를 검증했다. 최초 빈 panel은 준비 중 관찰이지 제품 FAIL이나 재생 PASS가 아니다. 첫 tooltip 준비 expression의 undefined는 정규식 문자열 escape 문제이며 상태 생성 전에 실패했다. 단순 prefix 계측으로 준비 성공을 확인한 뒤 실제 API 결과만 수용했다.

owned anchor 제거, tooltip의 원래 href/속성 및 fetch 원본 identity 복원, 모든 probe Symbol/listener 제거를 확인했다. VOD의 원래 hold 옵션=true/rate1/pausedfalse/mutedfalse를 복원했다. mute/paused 변화는 own 검사 탭에만 적용했으며 사용자 시청 탭/확장 저장소/viewport는 바꾸지 않았다. own home/VOD를 닫았다. live 추가 조사 탭에는 DOM/미디어 mutation을 실행하지 않았다.

최신 전체 Node136/136/실패0/skip0, source·dist package 각 v2.13.2/20 entry resources 및 diff check PASS. inject source/dist SHA256 `7B674AAA712D9B7267BE1090C56F829FBCAC6728C52277DDB9E4FA281CE9CAAF`, player `1A891BF5718011978060B288D4FBE62232964EFB09FD1FABDFB66874FF07900A`가 일치한다. 로그는 ignored `readiness-installed-node.log`. 제품/build/CSS/오디오 변경이 없으므로 이전 CSS91/filter17/audio 측정치를 이번 fresh 실행으로 재표기하지 않는다.

### 여전히 열린 조건

- 삭제된 채팅 표시는 production에서 `jsx-adapter-unavailable` 제한으로 처리하며 구현되지 않았다. 새 own live의 player/chat root는 읽기 전용 DOM에서 확인했으나 MAIN controller 추가 조회는 문서 응답 대기 제한으로 거부됐다. 연결점 존재/현재 deleted 옵션 상태를 이 실패한 조회로 단정하지 않는다. 다른 transport로 우회하지 않고 이 조사 탭만 사용자 페이지 새로고침을 요청했다. 확장 재빌드/새로고침은 필요 없다. 새로고침으로 제한 해소가 보장되는 것도 아니다.
- hideDonation type10 실이벤트 의미, mission/party/blocked 대상, 광고/보호소스, 전체 모드·조합·교체/장기 GC와 실제 GPU/청취 경계는 앞선 미검증 상태를 유지한다. 채팅/후원/moderation/차단·결제 등을 실행해 시험을 제조하지 않는다.
- 허용 DVR은 사용자 미결제로 실사용 불가이며 기존 명시적 환경 제외를 유지한다. 이번 세 수정의 수용이나 green suite를 전체 기능 복구로 합산하지 않는다. 기여 PR은 아직 열지 않는다.

사용자가 조사용 live 페이지 새로고침을 완료했다. 같은 탭의 동일한 제한 진단을 한 번 재시도했지만 같은 문서 응답 대기 제한이 유지됐다. controller 조회는 실행되지 않았고 사이트 함수/채팅/계정/설정에 mutation을 하지 않았다. 공식 browser-troubleshooting 문서에도 이 상태의 별도 해제 방법은 없었다. 새 탭·다른 transport·browser 재선택으로 같은 제한을 우회하거나 사용자 새로고침을 반복 요청하지 않는다. 대기 중인 브라우저 제어 확인 요청이 사용자에게 보이는지 확인이 필요한 상태다. 제품 결함의 원인으로 이 도구 제한을 혼동하지 않는다.

## Chrome 재시작 후 삭제 표시 연결점 조사 — 구현 전

사용자는 대기 요청 없음과 Chrome 재시작 완료를 알렸다. 현재 인벤토리는 이전 browser6 대신 browser7의 같은 extensionInstanceId였다. 공식 recovery 안내에 따라 이 재연결을 선택하고 전체 API/cdp 계약을 읽었다. 새 own HTTP live 탭의 MAIN 조회가 실행됐고 runtime/configReady/live route를 확인했다. 재시작으로 관찰된 조회 제한 해소이며, 앞선 제한의 정확한 원인을 확정한 것은 아니다.

채팅 controller와 messageList 배열/메서드가 발견됐다. 실제 저장 옵션 hideDonation/showDeleted는 둘 다 false, 해당 statuses disabled였다. 알려진 webpack 전역은 없었다. 채팅 본문·닉네임·user/time 값·토큰·전체 React 객체는 출력하거나 저장하지 않았다. 제한된 메서드 소스와 렌더링 자료형/상수/수만 조사했다.

- native `notiBlindListener`는 현재 목록에서 event의 messageTime/userId에 해당하는 항목을 찾는다. CANCEL은 native makeMessage로 복구하고, 그 외에는 기존 항목의 content를 유지하며 status를 blindType으로 교체한 뒤 목록 갱신을 요청한다. 원문을 새 API로 조회할 필요가 없다는 근거다. renderer는 NORMAL에서 원래 content를 사용하고 다른 status에서는 안내 문구를 선택한다. emptyMessage의 defaultStatus 및 관측한 일반 row의 status는 NORMAL이었다.
- renderer의 현재 native text에는 문자열뿐 아니라 이미 처리된 React child가 올 수 있다. 관측 row는 string, 실제 child element의 symbol은 react.element였다. 이는 새로운 React element/JSX factory를 만들어도 된다는 승인이 아니다. JSX 없이 native content 자체를 보존하고 별도 DOM 표시 표지를 쓰는 후보를 우선 검토한다.
- controller.connect가 client.on('notiBlind', controller.notiBlindListener)로 함수 참조를 등록한다. 현재 `_events.notiBlind`에는 정확히 native 함수와 같은 listener1개/once=false가 있었다. emitter dispatch는 record의 listener를 호출하며, addListener/removeListener/getListeners 구현도 읽기 전용 확인했다. 따라서 controller 함수 필드만 바꾸는 후보는 이미 등록된 callback을 바꾸지 못한다. 다른 listener 제거나 이벤트 일괄 재등록을 후보로 삼지 않는다.
- 현행 `[class^="_chatting_message_"] > span[class^="_text_"]`는 실제 text target35개였다. 삭제 상태 row는0이어서 실제 삭제 이벤트 처리 성공은 미검증이다. native listener를 호출하거나 client 이벤트를 emit하지 않았고, 채팅/후원/삭제/차단/계정 변경을 실행하지 않았다.

own 탭을 닫았다. 제품/테스트/CSS/dist/저장 설정/사용자 탭/미디어/viewport에 mutation을 하지 않았다. 아래 bounded 후보는 디자인 승인 전이며 구현되지 않았다. 기존 삭제 표시 미지원/전체 PR 게이트는 유지한다.

### 제한된 후보 계약

기존 attachChat 안에서 live+showDeleted ON이며 확인한 native NORMAL·blind callback·event record 계약이 모두 맞을 때만 연결한다. 다른 listener의 순서/once 설정은 유지하고 자신의 callback identity만 교체·복원한다. 원래 native 삭제/CANCEL 처리 자체는 호출한다. 새로 관측된 삭제에서 직전 일반 메시지의 기존 content를 유지해 로컬에 표시하되, 삭제 표지는 현행 text DOM의 owned attribute와 기존 번역 문구/CSS로 표현한다. JSX 생성/외부 원문 조회/별도 채팅 저장/과거 삭제 내역 복구는 하지 않는다. 기존 cleanbot/이미 숨겨진 항목은 새로 공개하지 않고, OFF·CANCEL·route dispose 시 자신의 표시/상태/연결만 되돌린다. 현재 목록 밖으로 밀려난 메시지나 다른 writer의 변경은 복원하지 않는다. 연결 계약이 바뀌면 해당 기능만 limited다.

controller/client 재사용·교체, 동일 이벤트 반복, CANCEL, OFF, native/다른 callback identity 변경, 외부 표지, 일반 text/처리된 emote 보존을 production-module 회귀 RED→GREEN으로 검증할 계획이다. 실서비스 listener 연결/해제는 별도 설치본 검사이며 실제 삭제 이벤트를 보내거나 제조하지 않는다. 설계가 승인되기 전에는 구현 skill/새 제품 의존성/제품 코드/회귀 테스트를 추가하지 않는다.

## 승인된 삭제 표시 보완 후보 — 설치본 새로고침 대기

사용자가 bounded 설계를 승인하고 개입이 불필요하면 계속 진행하도록 했다. 기존 attachChat에 live 한정 manager를 연결하고 observer/config notify를 재사용했다. 일반 type1/이전 NORMAL/현재 callback·writable event record 계약이 맞을 때만 연결한다. 같은 copied listener slot을 바꾸므로 다른 listener의 순서·once 설정과 emitter 함수는 건드리지 않는다. native callback은 원래 receiver/arguments로 호출하고 반환값을 유지한다. native 처리 뒤 같은 key/user/time/type/content이며 새로운 blind status인 경우만 기존 content를 유지한 NORMAL 사본을 현재 목록에 놓는다. JSX 생성/외부 원문 조회/별도 채팅 저장/과거 삭제 내역 복구는 없고 metadata는 WeakMap이다.

표지는 현행 text span의 `data-knife-deleted="1"`이다. 기존 번역 문구/취소선 CSS를 text 자체에도 적용하되 native inline 색상만 owned selector에서 덮어쓴다. 글꼴·이미지 크기·legacy `.knife-deleted`는 유지한다. OFF/CANCEL/dispose/controller 변경에서 현재 목록의 자신이 만든 항목만 native blind status로 되돌리고 표지와 자기 callback identity를 복원한다. 외부 callback/메시지/표지 변경은 덮어쓰지 않는다. client reconnect는 자기 copied callback만 풀고 새 verified slot에 연결한다. chat root의 단일 disposer가 최신 manager만 소유해 이전 controller의 closure를 scope에 계속 쌓지 않는다.

처음 신규 Node19개 중9개 예상 RED와10개 기존 보호 PASS를 확인한 뒤19개 GREEN을 확인했다. React props만 갱신하고 DOM mutation을 만들지 않는 경우의 표지 누락1개도 추가 RED로 재현했다. 같은 현재 메시지 key/user/time/content와 row NORMAL을 확인해 polling 없이 표시한다. 이 보완 중 기존 controller 교체 검사가 같은 synthetic identity의 이전 BLIND row를 잘못 표시해 FAIL했고, row NORMAL 가드로 GREEN을 확인했다. readonly callback slot/field2개도 잘못 ready/교체되는 RED를 먼저 확인하고 writable descriptor 가드로 GREEN을 만들었다. 신규 총22개는12RED→GREEN+10보호 characterization이다. 실제 production classic scripts/DOM을 실행했으며 외부 사이트 controller/emitter/렌더링 경계만 모델링했다. 제품 소스 문자열 변형이나 테스트용 내부 API는 없다.

별도 Chrome CSS 신규3개는 owned text 색상/취소선·label2RED→GREEN 및 OFF/일반 text/legacy label 보호1개이다. source label placeholder 검사는 설치된 확장의 번역·실제 삭제 이벤트 성공을 대신하지 않는다. 처리된 emote content 참조 보존은 Node 계약 검사, native CSS 이미지24px 유지도 통제 fixture다. 실제 채팅 renderer의 모든 특수 메시지/이모티콘을 검증했다고 주장하지 않는다.

일반 type1 근거는 새 own live에서 content/user/time 값 없이 NORMAL row33개와 type code 집합[1]만 추가 확인한 뒤 탭을 닫았다. 기존 설치본에 새 제품 모듈을 강제로 재주입하지 않았다. 실제 채팅/후원/삭제/차단/계정/저장 설정·사용자 시청 탭/미디어/viewport를 변경하지 않았다.

최종 전체 `node --test tests/*.test.cjs`158/158/실패0/skip0, Chrome155.0.8059.39 CSS94/94/필터17/17 PASS. 최초 npm test는 shell PATH에 npm이 없어 실행되지 않았다. PowerShell LASTEXITCODE가 이를 반영하지 않아 command wrapper exit0였지만 PASS로 세지 않았다. package.json의 test와 동일한 Node 명령을 직접 실행한 실제158건 결과만 수용한다. syntax/build/source·dist package 각v2.13.2/20 entry resources/diff check PASS. DSP 변경·새 청취 검사는 없다.

| 파일 | source/dist SHA256 |
| --- | --- |
| web/inject.js | 68B94AAB12B79092A99DA4441E8ABA12011691D155AE4EC147A91E3EE8D96907 |
| web/main.css | 3CD4AA2F5E463D04786E7C95D4CDEF1248C77EFFBF517DB1822195FCF7A7D99D |

ignored 로그는 deleted-chat-red/props-red/readonly-red/focused-green/full-node/css-red/css-green/filter-green이다. 추가 reviewer나 해결된 whole-branch 범위 재검토는 하지 않았다. 새 dist 설치본 listener 연결/OFF/cleanup, 실제 자연 발생 삭제 이벤트와 다른 미검증 경계는 남았다. showDeleted/hideDonation은 둘 다 OFF인 원래 저장값이고 나머지 설정도 변경하지 않았다. 직접 확장 새로고침이 불가능한 필수 단계에서 중지한다. 기여 PR/전체 기능 복구 완료를 선언하지 않는다.

### 304f0ff 사용자 새로고침 이후 초기 검사

사용자가 확장 새로고침을 완료했다. 같은 browser7의 새 own live에서 최초 허용 MAIN 조회는 configuration ready/live route/showDeleted=false/hideDonation=false를 확인했다. 이후 controller 원본 참조를 보존하고 임시 showDeleted ON을 적용하려던 명령은 문서 응답 대기 제한으로 실행 전에 거부됐다. probe Symbol/설정/handler mutation은 실행되지 않았다. 같은 제한을 다른 transport로 우회하거나 반복 Chrome 재시작을 요청하지 않았다.

일반 read-only DOM 조회는 가능했고 주 live video1920/ready4/playing,chat root 존재/삭제 표지0을 관찰했다. 이는 OFF/일반 재생 관찰이며 삭제 표시 성공/새 callback 연결 PASS가 아니다. 설치본의 실제 설정 UI를 통한 ON 및 팝업의 해당 탭 capability 문구 확인을 사용자에게 요청했고 own 탭은 handoff로 보존했다. 정확한 기존 옵션명은 ‘블라인드된 메시지 보기’, 상태 feature명은 ‘삭제된 채팅 표시’다. 원래 OFF를 보존 기준으로 기록했고 시험 후 원복할 예정이다. 이번에는 제품/build/추가 suite/PR를 변경하거나 기존158/94/17을 fresh 실행으로 재표기하지 않았다.

### 설치본 저장 옵션 ON의 사용자 상태 확인

사용자가 삭제 메시지가 없어 확인하기 어렵다고 알렸다. 채팅 내용이 아니라 확장 팝업의 readiness 문구를 요청한 것임을 설명했고, 이어서 사용자가 ‘준비됨’을 보고했다. 이는 저장 옵션 ON 및 설치본의 검증된 native 연결 계약 수용에 대한 사용자 보고다. 자동 raw controller identity 측정이나 실제 삭제 처리/취소선·label 렌더링 성공으로 환산하지 않는다.

새 own live를 일반 DOM API로만 검사했다. 최초 player/chat 없는 로딩 상태는 수용에서 제외하고, player video attached 후 chat 존재/videoWidth1920/ready4/playing/삭제 marker0을 관찰했다. height는 이번 조회에서 읽지 않았으므로 새 해상도 전체 확인이라고 하지 않는다. 표지 스타일 표본은 비어 있었다. 원문/사용자 정보/이벤트 payload를 읽거나 삭제 이벤트를 emit하지 않았으며, 자연 발생 삭제 표시 사례는 미검증이다. 새 own 탭을 닫았고 제품·저장 설정·미디어를 agent가 변경하지 않았다.

원래 OFF 복원을 위해 사용자에게 옵션을 다시 끄고 해당 live 팝업 상태가 ‘끔’인지 확인해 달라고 요청했다. OFF 복원은 아직 사용자 응답 전이다. 별도 자동검사158/94/17은 이전 결과로 유지하며, 이번 사용자 준비 상태/marker0 관찰을 전체 복구 또는 기여 PR 승인으로 바꾸지 않는다.

### OFF 복원 및 남은 스타일의 공개 코드 비교

사용자가 요청된 OFF·팝업 ‘끔’ 확인에 ‘복원 완료’라고 응답했다. 원래 showDeleted OFF 복원은 사용자 보고로 수용한다. 직접 raw callback identity를 확인한 것으로 확대하지 않는다. 삭제 이벤트/취소선의 실제 발생은 계속 미검증이다.

일반 DOM 자산 인벤토리에서 관측된 [공개 앱 코드](https://ssl.pstatic.net/static/nng/glive/resource/p/static/js/index-VdvK-ysl.js)는 query가 없는 pstatic 정적 파일이다. pageAssets는 script export를 지원하지 않고 web reader도 이 JS를 읽지 못했다. 브라우저의 차단된 MAIN 진단 대신 내부 상태를 다른 도구로 읽은 것이 아니다. 인증/쿠키 없이 공개 HTTPS 파일만 독립적으로 읽었고 원격 코드를 실행하거나 파일로 저장하지 않았다. 현재 payload UTF-8 SHA256은 `895AA5E054F7A80936DB80D47FB20CB98485657D3DDAD1A752FDCE8EA6778668`, 길이5,394,916자다. 상수는 TEXT1/DONATION10을 확인해 기존 후원 filter의 type 의미를 뒷받침한다. 실제 후원 이벤트 숨김 PASS는 아니다.

구형 hide-mission/hide-blocked 선택자는 현행 entry의 CSS module 이름과 맞지 않는다. 고정 미션은 container→header→mission_button(icon_mission), 파티는 container→header button(aria-controls=party-wrapper) 구조이며 접힘에서도 header가 남는다. 차단 video card는 container의 is_block modifier와 direct thumbnail이고, 다른 block widget과 구분된다. 해시 suffix 자체를 제품에 고정하지 않는 selector 후보를 검토한다. 이 내용은 정적 renderer 근거이며 실제 활성 미션/차단 UI 관찰은 아니다.

own 페이지의 DOM에서 정상 card3개는 DIV container/direct thumbnail과 LI item direct parent를 확인했다. 현재 chat ID/미션/파티/차단 후보는0이어서 해당 상태의 실사용 검사로 세지 않는다. aside body 경계는 앞선 chat controller 조사와 기존 coordinator 소비 경계를 기준으로 삼으며, 이번 문서의 chat ID0을 정상/결함으로 단정하지 않는다. own 탭을 닫았고 사용자 탭/설정/채팅/후원/차단/미디어에는 mutation을 하지 않았다. 임시 artifact나 signed URL을 배포하지 않는다.

**Bounded 후보(승인 전):** hide-mission.css에 현재 layout-body의 비사이드바 aside 안 고정 미션 header/button 및 파티 aria-controls/header 관계를 추가한다. hide-blocked.css는 현재 body 안의 차단 card 자체 및 직접 바깥 item을 함께 숨겨 빈 목록 칸을 남기지 않는다. 일반 카드/다른 block widget/상위 목록을 보존하고 기존 floating-popup 예외와 legacy 선택자는 유지한다. 새 JS/observer/설정키/권한은 없다. source-derived native fixture의 접힘·펼침/blocked grid·standalone/정상·foreign widget·popup·OFF·legacy를 RED→GREEN으로 검사할 계획이다. 활성 미션/파티 공개 URL을 사용자에게 요청했으며 실제 차단을 만들어 검증하지 않는다. 제품/테스트/build 수정 전 디자인 승인 단계에서 중지한다. 전체 검증/기여 PR 게이트는 유지한다.

사용자가 실제 미션이 있는 공개 방송 주소를 제공했다. 새 own 탭에서 초기 target0은 로딩으로 제외했다. native mission/fold button attached 후 미션1/legacy panel0을 확인했다. current container는 layout-body의 aside-chatting(비aria-label aside) 안에 있고 direct header/div→mission button→icon_mission svg 관계가 맞았다. visible display block/h141/expandedtrue였다. native 접기 버튼으로 h32/expandedfalse에서도 같은 관계1/legacyfalse를 확인하고 펼침 h141/true로 복원했다. 주영상width1920/ready4/playing을 관찰했고 own 탭을 닫았다. CSS/설정·후원·참여·채팅·계정·미디어를 변경하지 않았다. 실제 파티는0이며 이 관찰을 파티/차단/숨김ON의 전체 수용으로 확대하지 않는다. 후보 구현·TDD·설치본 수용 전 승인을 기다린다. 사용자 제공 채널 식별자는 공개 이력에 불필요하게 남기지 않는다.

### 승인된 미션·차단 방송 CSS 보완 — 설치본 새로고침 대기

사용자가 bounded 후보를 승인하고 필요한 개입 외에는 계속 진행하도록 했다. hide-mission.css에 layout-body의 비사이드바 aside와 native header/button/icon 관계를 사용하는 미션·파티 선택자2개를 추가했다. 접힘에서도 남는 header를 기준으로 하고 legacy 선택자는 보존한다. hide-blocked.css에는 is_block modifier와 direct thumbnail을 함께 요구하는 card 및 direct LI/DIV item 선택자2개를 추가했다. card와 목록 칸을 함께 숨기되 상위 목록·정상 카드·다른 block widget·외부 화면·기존 floating-popup 예외는 보존한다. 해시 suffix 고정, 중첩 :has, 새 JS/observer/설정키/권한은 없다.

공개 renderer 구조에 기반한 native fixture14개를 먼저 추가했다. 미션/파티 각각 접힘·펼침4개 및 차단 card LI/DIV wrapper·standalone3개는 기존 CSS에서 예상한7RED였다. OFF·legacy·일반 요소·외부 widget·popup 보호7개는 기존에도 PASS인 characterization이다. 두 CSS 파일만 보완한 뒤7RED→GREEN을 확인했다. 현재 fixture를 실제 설치본 파티/차단 계정 상태의 검증으로 바꾸지 않는다.

커밋 전 fresh 전체 Node158/158/실패0/skip0, Chrome155.0.8059.39 native CSS108/108/필터17/17/실패0, build 및 source/dist package 각v2.13.2/20 entry resources PASS. ignored 로그는 mission-blocked-css-red/css-green/node/filter와 mission-blocked-final-node/css/filter다. source/dist SHA256은 hide-mission.css `E139E91BCCE10E91D37626A05D6193DA32D10C86F064867E35EA36167A15289F`, hide-blocked.css `3980981F2D38DE792D524DC9D0F4D1EDF820BC349021C232A42666B074E60C38`로 각각 일치한다. DSP 변경·새 청취 검사·추가 reviewer·해결된 전체 범위 재검토는 없다.

실제 미션 구조 관찰은 위의 수정 전 자료이며 새 dist의 숨김 ON/OFF 검사는 수동 확장 새로고침 이후에 진행한다. 두 저장 옵션의 원래 값은 모두 OFF이고 agent가 설정·계정·차단·후원·참여·채팅·사용자 탭·미디어를 변경하지 않았다. 실제 파티/차단 대상은 아직 없으며 삭제·후원 자연 발생 이벤트와 다른 환경별 공백도 유지한다. 필수 수동 새로고침 단계에서 중지하고 전체 기능 복구 완료 또는 기여 PR 완료를 선언하지 않는다.

### 52d95d3 사용자 새로고침 이후 — 저장 스타일 ON 적용 확인 필요

사용자가 요청에 ‘완료’라고 응답했다. 같은 browser7의 새 own live에서 처음 chat/mission0은 로딩으로 제외했다. mission button attached 뒤 실제 미션1이 새 선택자의 구조와 일치하지만 display block/h141/expandedtrue였다. chat log 존재/h1096, aside width353, 주영상1920×1080/ready4/playing/rate1을 관찰했다. 파티/차단 target0은 실제 기능 PASS로 합산하지 않는다.

허용된 page-origin CDP DOM/CSS 읽기로 해당 미션 container의 matched styles를 확인했다. mission을 포함한 일치 규칙0, inline display0이었다. DOM/CSS domain을 비활성화했다. 이 자료는 현재 문서에 숨김 규칙이 일치하지 않는다는 관찰이지 CSS 우선순위 결함·설정 OFF·background 등록 실패 중 어느 원인인지 확정한 것은 아니다. 브라우저 제한 URL의 확장 UI나 저장값을 우회 조회하지 않는다. 두 옵션의 실제 체크 및 페이지 적용 상태를 사용자에게 확인해야 한다.

제품/CSS/dist/설정/계정/미디어/viewport를 변경하지 않았고 임시 CSS를 넣지 않았다. own 검사 탭은 수동 설정 적용 후 재검사를 위해 handoff로 보존한다. 원래 두 옵션 OFF의 복원 기준은 유지한다. 이번 관찰을 이전 자동158/108/17의 fresh 재실행 또는 실제 미션 숨김 성공으로 표기하지 않으며 PR는 아직 열지 않는다.

### 사용자 저장 스타일 적용 후 실제 미션 숨김 ON 수용

사용자가 두 옵션이 적용되지 않았던 것을 확인하고 다시 적용 완료했다고 알렸다. own handoff live를 reload했다. 초기 chat/mission0은 로딩으로 제외했고 native mission button attached 뒤 선택자와 일치하는 실제 미션1의 display none/height0/expandedtrue를 확인했다. 임시 probe/test/candidate style0이며 제품 CSS를 재주입하거나 저장 설정을 agent가 변경하지 않았다. chat log 존재/height1040/aside width353, main layout width1964를 관찰했고 정상 native card5개는 card display block/direct LI parent list-item으로 보존됐다. 파티와 차단 대상0은 계속 실제 미검증이다.

이번 reload에서는 초기 pzp main video가 없었다. 재생 가능한 영상1개는1280×720/ready4/playing/표시폭1963이며 ancestor에 vod_player_wrap이 있었고 다른 video는 ready0였다. 광고/본영상 전환 경계일 가능성이 있지만 그 원인을 확정하지 않았고 해당 영상을 본방송 정상 재생 PASS로 합산하지 않는다. 광고 건너뛰기·play/pause/seek/mute·계정 조작을 하지 않았다. 이전 정상 주영상1920×1080 재생 관찰은 별도 자료로 유지한다.

숨김 규칙의 CDP matched style 추가 확인은 첫 DOM.enable 명령에서 문서 응답 대기 제한으로 거부됐다. 명령 실행 전 거부이므로 이번 추가 domain enable/설정/DOM mutation은 없었다. 일반 read-only DOM의 display none 관찰은 수용하되 원본 rule identity 자동 확인으로 확대하지 않는다. 같은 차단을 다른 transport/브라우저 재시작/임시 스타일로 우회하지 않는다.

후속 최종 DOM 조회에서는 native pzp main video가 생성돼1920×1080/ready4/playing/rate1/표시폭1963을 확인했다. 실제 미션 display none/height0과 chat log 존재도 유지됐다. 앞선 alternative video/주영상 없음 상태를 정상 주영상으로 소급 분류하지 않고 이 후속 관찰만 주영상 기본 재생 수용으로 기록한다. 전환의 정확한 원인이나 모든 광고 조합 검증은 아니다.

새 미션 숨김의 실제 펼침 상태 ON 기본 동작 및 후속 주영상 재생은 수용했고, 저장 OFF 복원 및 정상 패널 표시는 다음 수동 단계다. 원래 두 옵션은 모두 OFF이며 own 탭은 복원 후 검사에 사용하도록 handoff로 남긴다. 새 제품/build/자동 전체 suite/추가 review/기여 PR는 이번 관찰로 수행 또는 완료 처리하지 않는다.

### 미션·차단 두 옵션 OFF 복원 완료

사용자가 원래 두 옵션 OFF 복원 완료를 알렸다. 같은 own handoff live를 reload하고 초기 target0은 로딩으로 제외했다. mission button attached 뒤 display block/h141/expandedtrue,chat log 존재/aside353/임시 CSS0을 확인했다. 초기 pzp 영상 없는 상태는 재생 PASS로 세지 않았다. 후속 DOM에서는 native pzp main1920×1080/ready4/playing/rate1/표시폭1963,미션 block/h141 유지,chat log 존재 및 정상 card5개 block/direct LI parent list-item을 확인했다. own 검사 탭을 닫았다. 제품·저장 설정·계정·미디어·viewport를 agent가 변경하지 않았다.

새 미션 CSS의 저장 ON 숨김→원래 OFF 표시 기본 수용은 완료했다. 파티/차단 대상은 없으므로 실제 숨김 PASS는 아니다. 차단 옵션 OFF 복원은 사용자 보고이며 내부 저장값 직접 조회를 우회하지 않는다. 모든 임시 설정 복원 기준을 유지한다. 최신 범위는 [기여 준비 상태](2026-10-08-contribution-readiness.md)에서 이전 후보/대기 기록과 구분한다.

이전 readiness 검토 이후 새로 작성한 삭제 채팅 연결·표지와 미션/차단 CSS는 독립 검토를 받지 않았다. 따라서 code-review skill에 따라 immutable `2ce23a249644334428d0fb72bf3c4d4e5eaa3530`→`c1c29fa572ed5fed0e3025946733eeb1656b2a57`의 새 변경만 fresh-context 읽기 전용 검토1명에게 요청했다. 해결된 sidebar/tooltip/hold 범위의 재검토·추가 위임·제품/사용자 브라우저 변경은 금지했다. 진행 중 결과를 전체 검토 완료·PR 승인으로 바꾸지 않는다.

### 새 소유권 검토 발견과 수정 후보 — 설치본 새로고침 대기

검토자가 Important1을 확정했다. 이전 보관 객체를 다른 writer가 CBOTBLIND로 바꾸면 paint가 표지만 제거하고 retained metadata를 남겨, 다음 native BLIND에서 다시 NORMAL로 공개했다. 구체적 생산 모듈 재현과 구현자 확인은 [새 범위 검토와 한 번의 보완](../reviews/2026-10-08-deleted-chat-and-style-review.md)에 기록했다. 새 기능이 아니라 기존 승인된 외부 writer/이미 숨김 보호 조건의 결함 수정으로 계속 진행했다.

새 회귀7개를 먼저 실행해7예상RED/기존22PASS를 확인했다. current NORMAL/type1/key/user/time/content 검증과 불일치 metadata 폐기만 보완했다. 이후focused29/29,전체Node165/165/실패0/skip0,별도Chrome155 CSS108/108/필터17/17,syntax/build/source와distpackage각v2.13.2/20resources/diffcheck PASS. source/dist inject SHA256 `717424F10B48737ED3B82715B0ED40B15E1A3C8457AEC9960CF2947AFBECFAEB` 일치다. 기존 listener/native CANCEL/repeated blind/외부 callback·표지 보호와 helper 경계는 green suite로 확인했으며 실제 자연 이벤트 검증은 아니다.

추가 reviewer·수정 범위 재검토·새 API/권한/JSX/원문 조회/observer/타이머는 없다. 사용자 스타일/필터/Gain/showDeleted·hideDonation OFF 원복 기준을 유지하며 own 탭도 정리됐다. README의 예전 미구현/새로고침 대기 문구를 최신 진입점과 구분하고25개 설정·25개 스타일의 기본 수용/자동 계약/미검증을 한 표로 정리했다. 새 JS 설치본 준비 상태/OFF 복원 검사에는 필수 수동 확장 새로고침이 필요하므로 이 단계에서 중지한다. PR/전체 기능 복구 완료를 선언하지 않는다.

### a994241 사용자 설치본 준비 상태 확인

확장 새로고침 및 실제 ‘블라인드된 메시지 보기’ ON 적용을 요청한 뒤 사용자가 팝업 상태 ‘준비됨’을 보고했다. 새 소유권 보완 설치본의 native 계약 연결 준비는 사용자 확인으로 수용한다. 자동 raw callback identity나 외부 in-place writer/자연 삭제 이벤트를 실제 서비스에서 실행한 결과로 확대하지 않는다.

같은 browser7에서 새 own live를 일반 read-only DOM으로만 검사했다. 첫 chat/player 없음은 로딩으로 제외했고 chat log attached 뒤 aside353, native pzp main1920×1080/ready4/playing/rate1, 삭제 marker0 및 원래 OFF 미션 display block/h141을 확인했다. 본문·작성자·메시지 identity/payload를 읽거나 이벤트를 emit/삭제/후원/차단하지 않았다. 제품·설정·미디어·viewport·사용자 탭에는 agent mutation이 없다. marker0은 실제 삭제 표시 성공이 아니며 이번 단계에는 CDP를 사용하지 않았다.

own 탭을 원래 설정 복원 후 확인에 사용하도록 handoff로 보존했다. showDeleted 원래 OFF 및 팝업 ‘끔’으로 돌리는 사용자 수동 단계가 남는다. hideDonation/스타일/필터/Gain 복원 기준은 유지한다. 새 suite/build/review/PR는 이번 사용자 보고로 수행한 것으로 표기하지 않는다.

### 소유권 보완 설치본 OFF 복원 및 최종 기여 준비 검증

사용자가 팝업 ‘끔’을 보고했다. 원래 showDeleted OFF 복원을 사용자 확인으로 수용한다. own handoff live를 reload하고 첫 chat/video0은 로딩으로 제외했다. chat log attached 뒤 marker0, 미션 원래OFF block/h141, native pzp main1920×1080/ready4/playing/rate1/표시폭1963을 확인하고 own 탭을 닫았다. 실제 원본 callback identity·자연 삭제 이벤트 검증으로 확대하지 않는다. agent는 config/storage/사용자 탭/미디어/계정/viewport를 변경하지 않았다.

제품 a994241의 변경 없이 final 전체 Node165/165/실패0/skip0,별도Chrome155.0.8059.39 CSS108/108/필터17/17,build/source 및 dist package 각v2.13.2/20resources/diffcheck PASS를 새로 확인했다. ignored로그 contribution-final-node/css/filter.log다. source/dist inject717424F10B48737ED3B82715B0ED40B15E1A3C8457AEC9960CF2947AFBECFAEB,hide-mission E139E91BCCE10E91D37626A05D6193DA32D10C86F064867E35EA36167A15289F,hide-blocked3980981F2D38DE792D524DC9D0F4D1EDF820BC349021C232A42666B074E60C38은각각일치한다. 동일 제품 파일 재빌드이지 새로운 설치 후보/새 청취·GPU 검사는 아니다.

GitHub CLI의 read-only metadata로 upstream jebibot/cheese-knife default branch main, Do-hyeon/cheese-knife isFork true/parent jebibot, 해당 작업 branch의 기존 PR0을 확인했다. PR을 만들거나 원본/main/스토어를 변경하지 않았다. 원복 단계는 끝났고 known Important 보완의7RED→GREEN/전체suite와 설치본 준비/OFF 복원이 기록됐다. 그러나 자연 삭제·후원/활성 파티·차단 대상/유료 DVR 및 다른 환경별 공백은 남는다. 이를 명시한 복구 시험판 기여 PR로 진행할지 사용자에게 범위 판단을 요청한다. 전면 정상·전체 검증 완료 조건을 묵시적으로 면제하지 않는다.

### 사용자 범위 승인 후 한글 기여 PR 제출

사용자는 미검증을 명시한 복구 시험판 기여 PR에 ‘진행’이라고 승인했다. 최초 제출head7a54d10429ac95544e2c6959269e3cb9358d707d의fresh Node165/CSS108/filter17/build/packageboth20/diff check,양쪽 main5ccb2bfdb660534c6fb64ceda511124ae3784416을 확인했다. [한글 PR #81](https://github.com/jebibot/cheese-knife/pull/81)을 Do-hyeon feature→jebibot main으로 생성해 이 채팅에 attach했다. author/headowner Do-hyeon/base main/head codex/chzzk-compatibility-recovery/stateOPEN/notDraft,서버의본문과작성한한글본문동일을 확인했다. status checks0은CI PASS가아니다.

실제 이벤트/대상·유료DVR·GPU/청취·보호소스·장기GC/전체조합·Firefox 및 synthetic toggle dip/극단설정 clipping·Date.now deferredMinor를 본문에 명시했다. 제품 코드·설정·사용자 브라우저를 바꾸거나 병합/스토어 배포를 하지 않았고, 마지막 변경은 제출URL·문서 상태 기록만이다. 승인된 기여 제출은 완료됐지만 실제 전체환경검증/출시승인으로 확대하지 않는다. 브랜치와 로컬 checkout을 보존한다.
