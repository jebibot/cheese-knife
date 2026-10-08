# VOD 길게 누르기 후 native click 충돌 수정 검토

독립 읽기 전용 범위: `f27d7054af2ad3163f2c1b7092d0bc263ff1ba25..6de370ba4af981b12d9384577326b78ece6c4853` (`web/player.js`, `tests/player.test.cjs`). 검토자는 working tree/Git/사용자 브라우저를 변경하지 않았다.

요구: 500ms 이상 VOD hold는 일시적으로 2배속, 종료 시 원래 속도와 재생/정지 상태 복원. 짧은 클릭·keyboard click·다른 control은 사이트 동작 유지. 취소·blur·route dispose가 다음 동작에 영향을 주면 안 된다.

## 판정

Critical / Important / Minor correctness finding 없음. 완료된 hold의 matching pointerup에만 token을 만들고, window capture에서 후속 click을 제어하는 범위가 적절하다. 새 pointerdown/timeout/disposal에서 token을 제거해 나중의 정상 조작을 막지 않는다.

독립 실행 근거:

- 검토 commit의 player suite 9/9 PASS.
- foreign pointerup/click, blur 취소, token 만료, armed token 상태의 dispose, active hold 상태의 dispose: production source에 대한 읽기 전용 probe 5개 PASS.
- 실제 Chrome pointer capture와 native event targeting은 DOM fixture만으로 판정하지 않음. 실행자가 사용자 Chrome 재시험으로 확인해야 한다는 조건부 판정이었다.

추가 권고: foreign pointer, 만료, route dispose 시험을 저장된 suite에 보존. 실행자는 3개 characterization regression을 추가했고 전체 54/54 PASS. 이 추가는 제품 코드를 바꾸지 않아 다시 독립 검토를 반복하지 않았다.

## 실행자 실제 Chrome 확인

사용자가 수정본 확장을 새로고침한 뒤 VOD를 재로딩했다. 광고는 우회하지 않고 종료를 기다렸다.

| 시작 상태 | hold 중 | 해제 후 |
| --- | --- | --- |
| 재생 / 1x | 재생 / 2x | 재생 / 1x (반복 PASS) |
| 정지 / 1x | 재생 / 2x | 정지 / 1x |
| 재생 / 1.5x | 재생 / 2x | 재생 / 1.5x |

짧은 클릭은 재생→정지를 유지했다. 탐색 완료를 구분한 VOD 키 입력은 각각 ±5초였다. 임시 배속/음소거 설정은 복원하고 시험 탭을 닫았으며 원래 live 재생은 유지했다. 자세한 [검증 기록](../validation/2026-10-08-installed-chrome-acceptance.md).

범위 밖: 삭제 채팅·sidebar 갱신·내부 통계, 보호된 스트림, Firefox, 전 기능 출시 판정. 이번 문제 해결을 전체 복구로 확대하지 않는다.
