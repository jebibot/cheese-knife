# 사용자 Chrome 설치 환경 테스트

대상: 초기 `f27d705`, 후속 수정 `6de370b`, 2.13.2 recovery preview. 사용자가 수정 후 로컬 확장을 새로고침했다고 확인한 뒤 VOD를 다시 로드해 검사했다. 실제 브라우저의 확장 ID/버전 화면은 내부 탭 접근 제한 때문에 조회하지 않았다. 대신 후보의 실제 DOM 구조와 ISOLATED→MAIN 상태 메시지, 조작 뒤 상태 변경을 확인했다. 다른 확장의 활성 여부를 별도로 검증하지 않았다.

이 기록은 실제 사용자 탭의 검사다. 이전의 별도 프로필/DevTools MAIN 주입 smoke 검사와 구분한다. 최초 테스트에서는 코드를 변경하지 않았고, 발견된 결함을 사용자가 수정 승인한 뒤 후속 수정을 검증했다.

| 검사 | 결과 | 관찰 |
| --- | --- | --- |
| 전체 자동 회귀 suite | PASS | 초기 47/47, 최종 54 passed / 0 failed. 핵심 재생/정지 복원 2개는 수정 전 RED→수정 후 GREEN |
| dist 참조 검사 | PASS | v2.13.2, 20 entry resources |
| 실제 후보 bootstrap/설정 bridge | PASS | `#knife-status`의 configuration ready, MAIN live/vod/player 진단. 새 `.knife-comp.knife-owned`와 버튼 존재 |
| live compressor off→on | PASS | data-state on→off→on, aria-pressed true→false→true. Gain 1.5 유지 |
| 실제 live 음성 | PASS (사용자 확인) | 사용자가 전환 뒤 “정상적으로 들림”이라고 확인. 자동 음압 측정은 하지 않음 |
| live 복귀 버튼 | PASS (해당 buffer) | 일시정지 중 currentTime 200.989859→264.95. stream edge 증가를 포함한 관찰이며 안정적 DVR 보장은 아님 |
| live 방향키 | 지원 조건 제한 | 입력 시 시간 변화 없음. 사용자는 해당 채널의 타임머신 미지원/비허용 조건을 설명함. seekable buffer 노출을 사이트 DVR 허용의 증거로 취급하지 않음 |
| VOD route 구분 | PASS | 홈페이지의 연령 제한 표시 없는 VOD 카드로 SPA 이동. diagnostics vod, player ready. live 전용 `.knife-ff` 0개 |
| VOD 광고/보조 media 구분 | PASS (관찰 범위) | adbreak에서 본영상과 광고 video 구분. 광고를 건너뛰지 않고 종료를 기다린 뒤 검사. 본영상 `.webplayer-internal-video` 기준 측정 |
| VOD 방향키 오른쪽/왼쪽 | PASS | 일시정지 상태: 33.204004→38.204004→33.204003초. 각 5초; 중복 10초 탐색 없음. 현재 후보는 VOD에 추가 키 처리를 하지 않으므로 사이트 기본 동작의 공존 검사 |
| VOD compressor on→off | PASS (UI/연결 상태) | on→off, Gain 1.5 유지. 테스트 탭은 원래 live와 소리가 겹치지 않도록 음소거; VOD의 실제 음성은 미검증 |
| VOD 일시정지 상태에서 길게 누르기 | PASS | paused=true/rate=1 → hold 중 paused=false/rate=2 및 ‘2배속’ → 해제 후 paused=true/rate=1 |
| VOD 재생 상태에서 길게 누르기 | FAIL→PASS | 초기 2회 해제 뒤 정지 재현. 수정 후 false/1→false/2→false/1, 반복 검사 PASS |
| VOD 비기본 속도에서 길게 누르기 | PASS | 실제 native 설정에서 1.5배속 선택: false/1.5→false/2→false/1.5. 종료 후 native 설정을 원래 1.0x로 복원 |
| 수정 뒤 짧은 클릭 / 일시정지 hold | PASS | 짧은 클릭으로 정지. 그 상태에서 hold 동안 재생·2배속, 해제 후 정지·1배속. 완료된 hold 외 클릭은 native 유지 |
| 수정 뒤 VOD 방향키 | PASS (탐색 완료 구분) | 일시정지 상태 158.746704→163.746704→158.746704초. 각 키를 별도 관찰 구간에서 확인 |

## 새로 발견한 문제: 길게 누르기와 native click 공존

재생 중 VOD의 영상을 1.5초 또는 3초 길게 누르면 후보의 ‘2배속’ indicator와 rate=2가 확인된다. 해제 뒤 rate=1로 복원되지만 영상이 일시정지된다. 정지 상태에서 시작한 hold는 원래 정지 상태로 복원된다.

소스 대조: 기존 `stopHold`는 hold가 직접 재생을 시작한 경우에만 pause한다. 재생 중 시작한 경우에는 `startedPlaying`이 설정되지 않아 종료 pause를 이 직접 호출로 설명할 수 없었다. 완료된 hold의 후속 click 처리 누락을 재현했고, 후속 click 제어 수정으로 실제 증상이 해소됐다. native 내부 이벤트 전체를 계측했다고 주장하지 않는다.

수정은 active hold의 matching pointerup에만 1회 click token을 만들고, window capture에서 해당 video 영역의 matching pointer click만 소비한다. 짧은/keyboard click과 다른 pointer·control은 유지한다. token은 새 pointerdown/1초 timeout/route dispose에서 제거한다. pointer capture 해제 뒤에도 click이 발생할 수 있다는 [Pointer Events 표준](https://www.w3.org/TR/pointerevents/latest/)의 계약을 고려했다.

독립 검토: `f27d705..6de370b` 읽기 전용 검토에서 Critical/Important/Minor 발견 없음. production 모듈에 대한 5개 추가 경계 probe가 통과했다. [검토 기록](../reviews/2026-10-08-vod-hold-review.md). 권고한 foreign pointer/expiry/disposal 사례 3개는 추가 regression으로 보존했으며 제품 코드는 검토 SHA와 동일하다.

비포커스 영상 div에 대한 최초 locator key 입력은 timeout이었다. 이후 포커스 가능한 버튼 입력과 VOD의 실제 ±5초 변화로 입력 전달을 확인했다. 좌표 재사용 중 영상이 scroll되어 hold가 시작되지 않은 시도는 성공/실패 증거에 포함하지 않았다.

빠르게 오른쪽/왼쪽 키를 같은 호출에서 연속 보낸 한 시도는 즉시 읽은 media 시간에 -10초처럼 보이는 차이가 있었다. native 탐색 완료와 UI 표시가 분리되는 구간이므로 성공 증거로 사용하지 않았다. 이후 호출을 구분해 각각 ±5초를 재확인했다. 빠른 반대 방향 연속 탐색의 세부 native 정합성을 전면 검증했다고 주장하지 않는다.

## 종료 상태와 남은 검사

기존 사용자 live 탭은 compressor on / Gain 150% / 음소거 해제 / 재생 상태로 유지했다. 별도 VOD 시험 탭의 임시 음소거와 1.5배속을 원래대로 해제/1.0x 복원한 뒤 일시정지하고 닫았다. 원본 확장과 설정을 삭제하거나 새로 설치하지 않았다. 수정본 확장 새로고침은 사용자가 직접 수행했다.

사용자 화면의 screenshot은 ignored `output/acceptance/`에만 저장하며 GitHub에 게시하지 않는다. 이번 VOD 결함의 수정·재검증은 완료했으나 전체 복구/출시 완료로 판정하지 않는다. 타임머신 허용 live, PIP/fullscreen/bfcache, 실제 hover preview, 스타일·채팅 전환, Firefox 등은 추가 검사가 필요하다.
