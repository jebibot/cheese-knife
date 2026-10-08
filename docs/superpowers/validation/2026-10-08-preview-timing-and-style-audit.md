# 설치본 미리보기 시간 측정과 스타일 점검

사용자 새로고침 후 `148aeae`의 hover-start 코드가 실제 탭에 적용된 것을 확인했다. 기존 live 페이지는 방송 종료 상태였다. 원래 페이지/채팅/저장 설정을 삭제하거나 방송을 다시 열지 않았다.

## 미리보기 지연 측정

탭 범위 CDP로 실제 mouseover를 입력하고 같은 MAIN의 performance.now로 API resource 완료, 메타데이터 DOM, 패널 표시, 첫 video frame callback을 측정했다. DOM은10ms 간격으로 관찰하므로 정밀한 compositor 최초 paint 측정은 아니다. 시간·단계·상태만 기록하며 signed URL/헤더/쿠키/채팅 본문은 저장하지 않는다.

| 검사 | 설정 지연 | API 완료 | 메타데이터 DOM | 패널 표시 | 첫 frame | 영상 표시 가능 시각 |
| --- | --- | --- | --- | --- | --- | --- |
| 실제 설정, 채널 A | 1000ms | 27ms | 33ms | 1024ms | 169ms | 1024ms |
| 실제 설정, 채널 B | 1000ms | 16ms | 23ms | 1019ms | 201ms | 1019ms |
| 임시0.1초 비교, 채널 A | 100ms | 21ms | 24ms | 115ms | 582ms | 582ms |

영상 표시 가능 시각은 패널 표시 관찰과 첫 frame callback 중 늦은 시각이다. 실제 설정1초의 대기가 두 검사에서 지배적이었다. 임시 비교의 썸네일은44ms, loadeddata/playing은384ms였다. 설정을 줄이면 패널은 빨리 나타나지만 첫 frame은 네트워크/코덱/미디어 로딩에 따라 달라지며 항상100ms라는 보장은 없다. 같은 프로필/연결/cache의 표본3개이지 모든 방송의 cold-start 상한은 아니다.

0.1초 비교는 MAIN 메모리만 일시 변경했다. 저장소에 쓰지 않고 원래1초로 복원했다. 진단 observer/listener/timer/frame callback/global을 제거하고 hover 해제 뒤 패널 숨김/media 제거를 확인했다. 사용자에게 팝업의 ‘영상 지연’을0.1초로 낮춰볼 것을 제안했으며 저장 설정을 대신 변경했다고 주장하지 않는다.

## 네 가지 스타일 불일치 보완

실제 타겟이 존재하는 화면에서 기존 studio/topic/offline/message 선택자가 각각0개를 잡았다. 모든0-match를 결함으로 합산하지 않았다.

| 기능 | 수정 범위 | 실제 DOM 임시 A/B |
| --- | --- | --- |
| 스튜디오 숨김 | #header studio.chzzk 링크, 기존 선택자 유지 | flex→none→복원flex |
| 주제 탭 숨김 | #header의 /home 링크를 가진 UL, 기존 선택자 유지 | flex→none→복원 |
| 오프라인 채널 숨김 | #sidebar profile/live marker와 외부 row | offline4개 숨김, live2개 flex유지; 복원 |
| 채팅 글자 크기 | #aside-chatting role=log message/nickname·이미지 | 14→22px(+8)→복원14px |

일반 콘텐츠의 링크/목록/profile/텍스트는 영향을 받지 않도록 scoping했다. donation/subscription/mission의 모든 세부 글꼴, VOD 새 DOM, 조합/responsive까지 통과했다고 주장하지 않는다.

`node scripts/check-styles.mjs --chrome`은 별도 임시 Chrome에서 합성 fixture를 실제 렌더링한다. 일반 Node suite에 Chrome 설치 의존성을 추가하지 않았다. 수정 전6개 중5개가 예상 display/font 오류로 RED, 수정 후6/6 GREEN. 기존 DOM 대상/foreign 요소 보존/offline 외부 row 제거/-6·0·+8 글자와 emoji 크기도 검사했다. 사용자 탭의 임시 CSS와8px 변수는 finally에서 원래 값/priority까지 복원했다. 저장 스타일은 변경하지 않았다.

전체 스타일25개를 현재 DOM과 읽기 전용 대조했다. 이 화면에 없는 pzp/mission/home/clip 타겟의0개는 미검증이다. right-sidebar/static-logo/rectangle-profile/live-badge 등은 추가 조사해야 한다. 단순 선택자 hit는 PASS가 아니다. 전체 기능 검증은 [계획](../plans/2026-10-08-full-feature-acceptance.md)의 미완료 항목이다.

후보 검사: Node70/70, native CSS6/6, build/source/dist package check PASS. 새 스타일의 실제 확장 등록/옵션 OFF·ON은 사용자 확장 새로고침 뒤 필요하다. 스크린샷은 ignored output/acceptance/preview-delay-100ms-test.png와 style-current-dom-probe.png에만 보존한다. 전체 완료/PR 승인이 아니며 필요한 새로고침을 직접 수행할 수 없어 해당 단계에서 중지한다.
