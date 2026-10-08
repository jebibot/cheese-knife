# 설치본 남은 기능 검사 — 진행 중

2026-10-08. 제품 기준08ef30d/기록154a1e3,사용자 확장 새로고침 후. 홈 반응형 설치본 ON 수용은 [별도 기록](2026-10-08-home-recommendation-recovery.md)에 이어진다. 이번 단계에는 product code 변경이나 새 빌드가 없다.

## 전체 화면 — 사용자 직접 기본 동작 PASS

사용자 시청 탭과 별개인 라이브 검사 탭을 열었다. native 재생/1920×1080/owned controls4개를 관찰했고,중복 음향을 줄이기 위해 해당 검사 탭만 native 음소거했다. 전체 화면 버튼은1개,visible/flex/disabled=false/fullscreenEnabled=true였다. 키보드 Enter와 공개 native 버튼 click 이후에도 fullscreenElement=false/버튼 label‘전체 화면’이었다. 해당 입력을 성공으로 기록하지 않는다. 실제 사용자 클릭에서도 실패하는지 확인 전에는 자동 입력 한계와 사이트/확장 결함을 구분할 수 없어 추측 수정하지 않는다. 직접 전체 화면 진입/Esc 복귀 결과를 사용자에게 요청했다.

검사 탭은 재생을 유지했으며 마지막에 원래 muted=false/fullscreen=false/임시CSS0으로 복원하고 닫았다. 사용자의 기존 시청 탭을 탐색하거나 조작하지 않았다. native 음소거 버튼과 extension compressor 버튼의 공유 클래스 때문에 단일 locator가2개를 찾은 검사 오류는 aria-label로 한정해 해결했으며 오류를 PASS로 세지 않았다.

후속 사용자 답변은‘완료. 전체화면-esc 정상동작’이다. 사용자 직접 전체 화면 진입/Esc 복귀는PASS로 기록한다. agent 자동 입력 자체는 여전히 성공 미확인이다. 사용자 결과로도 실패하는 결함이 재현되지 않았으므로 전체 화면 관련 product patch를 만들지 않는다. 모든 viewport/스타일 조합의 전체 화면 수용은 별도 경계로 남긴다.

## 시작 시각 — 현행 live 연결점 불일치

production `bindStartTimes`는 `[class^="video_information_count__"], span[class^="video_card_item__"]`에 연결한다. 실제 live 화면의 해당 대상과 `data-knife-tooltip`은 각각0개다. 현재 정보 영역은 `strong._count_…` 시청자 수,`span._count_…` 스트리밍 경과시간,`p._count_…` 팔로워 수를 사용한다. 따라서 현행 정보 요소에 시작 시각 hover handler가 연결되지 않는 불일치는 확인됐다. 일반 `_count_` 전체를 선택하면 경과시간/팔로워 등 다른 요소까지 포함하므로 그대로 확장하지 않는다.

현재 live 탭에서는 도구가 문서 응답을 처리 중이어서 raw CDP 읽기가 거절됐다. DOM 전용 관찰로 계속 검사했으나,기존 adapter 기준의 `openDate` hook 구조 확인은 아직 미완료다. 다른 전송 경로나 extension origin으로 우회하지 않았다. 새 요소의 metadata를 검증하거나 공개 API fallback 계약을 설계한 뒤에만 수정한다. 기존 자동 메타데이터 검사의 PASS를 현행 installed live 수용으로 합산하지 않는다.

후속 새 agent 라이브 탭의 초기 로딩 단계에서는 동일한허용 CDP 읽기가 가능했다. 기존 adapter의 `stateOf(strong, array-with-openDate)`가 현재 시청자 수 요소에서 실제`openDate` 문자열을 반환하는 것을 확인했다. 옛 target0/new strong target1/live route였고,이후 문서 응답 처리 중 읽기 제한이 재발했을 때는 DOM 관찰만 사용했다. 관련 공개 DOM 경계는main 안의 `_data_…` 직접 자식`strong._count_…`;span 경과시간과p 팔로워도 같은 count 클래스이므로strong/부모 경계를 보존한다. 전체 React 객체·쿠키·토큰·signed URL을 출력/저장하지 않았다.

홈의 현재 VOD 카드에서도 legacy `video_card_item__`는0개였다. 기존 모듈이 사용하는VOD API를 실제 카드에서 관찰한video ID로1회 읽어HTTP200/code200/문자열`liveOpenDate` 계약을 확인했다. 날짜 요소는`_information_…`의 직접 자식last-child `span._item_…`였고,기존 parent.parent의첫 anchor 조회와area/title anchor 조회 모두동일한`/video/<id>`를 반환했다. API 응답 전체와미디어 URL은기록하지 않았다. 조회 검사용live/home 탭은닫고사용자 설정은직접쓰지 않았다.

제안은bounded 변경이다:현재live 시청자 수와VOD 카드 날짜 선택자를기존`bindStartTimes`에추가하고,기존React openDate/VOD API·캐시·취소·same-origin/VOD URL 검증을유지한다. legacy도보존하고시각정보가없는경우limited를유지한다. 현재VOD/live 성공,경과시간/팔로워/외부 요소보존,잘못된URL·늦은응답·scope정리·캐시회귀를검증한다. 새API fallback/권한/설정/통계 계산은추가하지 않는다. 설계승인전product code와테스트를수정하지 않았고새dist도만들지 않았다.

## 스타일 연결점 관찰과 남은 경계

- 실제 sidebar에는6개 native nav가 있었다:탐색,팔로잉,인기 카테고리,다가오는 일정,파트너,바로가기. 이번 화면에서 display는각각 block/block/none/block/none/none이었다. 저장 옵션별 ON/OFF 검사나 positional selector의 동적 섹션 수 안전성을 확인한 결과는 아니다.
- ranking 스타일의 현행 대상1개/display flex를 관찰했다. 저장 hide-ranking OFF/ON 수용은 아직 남음.
- 고정 mission/party 대상은0개였다. 해당 이벤트/화면이 없으므로 이를 정상이나 selector 결함으로 단정하지 않는다.
- media seekable range1개를 관찰했지만 채널의 DVR 허용 여부와 실제 native 탐색은 검사하지 않았다. range 존재만으로 타임머신 허용/탐색 성공을 주장하지 않는다.
- 통계 메뉴1개를 확인했으나이번 단계에서 다시 열어 비트레이트/지연시간 제한을 해결했다고 주장하지 않는다.

전체 기능/25스타일 수용,삭제 채팅·내부 통계 지원 제한,광고/허용DVR/기타 조합은 기존 전체 계획에 남는다. PR은 열지 않았다.

## 후속 시작 시각 수용과 다음 입력

시작 시각의승인된선택자수정/수동새로고침후기본live/VOD 표시·정리·cache 수용은[새기록](2026-10-08-start-time-selector-recovery.md)에이어진다. 여기의연결점불일치·메타데이터읽기제한은조사당시기록이며신규수정의installed FAIL로재사용하지 않는다.

현재시청방송의기존공개live-detail API를제한적으로읽어HTTP200/code200/statusOPEN/boolean timeMachineActive=false를확인했다. 그러므로이방송은허용DVR 방향키성공검사에쓸수없다. seekable range가있다는관찰로플랫폼DVR 허용을추정하지 않는다. 사용자에게허용방송URL을요청했다.

남은스타일검사를위해원래25옵션선택과채팅글꼴숫자값이필요하다. 확장설정페이지에직접접근할수없는제한을유지하며,복원가능한원래상태확보를위해사용자에게전체설정캡처를요청했다. 사용자저장값을추측해OFF/ON으로덮어쓰지 않고새dist도필요하지 않다. 전체기능/지원제한/PR 게이트는계속미완료다.
