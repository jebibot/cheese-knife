# 새 삭제 채팅 연결·스타일 독립 검토와 보완

2026-10-08. 읽기 전용 새문맥 검토자1명. Immutable range `2ce23a249644334428d0fb72bf3c4d4e5eaa3530`→`c1c29fa572ed5fed0e3025946733eeb1656b2a57`. 이 범위에서 새로 추가된 삭제 채팅 manager/표지 CSS·미션/차단 CSS·회귀만 검토했다. 앞서 해결한 sidebar/tooltip/hold나 전체 출시 여부의 재검토가 아니다. 검토자는 파일/index/HEAD/dist/사용자 브라우저를 변경하지 않았고 추가 위임을 하지 않았다.

## 결과

native callback의 this/arguments/return과 다른 ordered listener records 보존, WeakMap/owned DOM marker로 JSX·서버/과거 내역 조회를 피한 구조, CSS의 제한된 native 관계·legacy·목록 칸 보호가 확인됐다. 독립 실행은 삭제 채팅22/22와 별도 Chrome CSS108/108 PASS다. 자동검사만으로 실제 자연 이벤트나 전체 정상 판정을 하지 않았다.

Critical0/Important1/Minor0. 검토 verdict는 **With fixes**였다.

**Important — 보관 객체의 외부 in-place 변경 뒤 stale 소유권 재사용:** immutable HEAD `web/inject.js:258-261`의 `(before.status === 'NORMAL' || previous)`가 이전 WeakMap 기록만 있어도 숨김 객체를 허용한다. 실제 제품 runtime/site-adapter/inject를 실행한 in-memory diagnostic에서 BLIND→owned NORMAL, 외부 writer가 같은 객체의 status를 CBOTBLIND로 변경, reconcile로 표지 제거, 다음 native BLIND→잘못된 NORMAL/marker1을 재현했다. 직전 이미 숨겨진/cleanbot 메시지를 다시 공개하지 않는 승인 조건에 어긋난다. 객체 교체·native CANCEL 보호는 정상이며 이번 결함은 같은 객체의 직접 변경이다.

## 구현자 확인 및 한 번의 보완 패스

구현자가 해당 branch와 paint/rehide 경계를 직접 읽었다. 현재 paint는 status/content 일부만 확인해 표지를 지워도 metadata를 폐기하지 않았고 key/user/time/type 변화의 표지 소유권도 검사하지 않았다. 새 production-module 회귀7개를 먼저 추가해 실제 예상7RED와 기존22PASS를 확인했다.

- in-place CBOTBLIND→native BLIND/RESTRICT의 reconcile 있음/없음2개: 직전 숨김은 native 숨김 상태로 남아야 한다.
- in-place key/user/time/type 변화4개: 이전 삭제 표지를 제거하고 OFF가 외부 NORMAL 객체를 예전 status로 덮어쓰지 않아야 한다.
- in-place content 변화 직후 native blind1개: 옛 metadata로 외부 rewrite를 공개해서는 안 된다.

`ownsMessage`는 현재 NORMAL/type1/key/user/time/content가 보관 metadata와 같을 때만 true다. paint에서 불일치 metadata를 폐기한다. event 처리에서도 불일치 이전 기록을 폐기하고, 바로 전 NORMAL 및 소유권 일치 조건을 요구한다. native callback 호출/다른 listener·이미 숨김 거부·repeated BLIND/RESTRICT·CANCEL·OFF 복원·controller/client 교체 계약은 유지한다. 새 API/JSX/서버 조회/설정/권한/observer/타이머는 없다.

7RED→GREEN, focused29/29, 전체Node165/165/실패0/skip0, Chrome155.0.8059.39 CSS108/108/필터17/17, inject 구문/build/source 및 dist package 각v2.13.2/20 entry resources/diff check PASS. inject source/dist SHA256 `717424F10B48737ED3B82715B0ED40B15E1A3C8457AEC9960CF2947AFBECFAEB` 일치. ignored 로그 `deleted-ownership-red/green/full-node/full-css/full-filter.log`. 추가 reviewer/수정 범위 재검토는 하지 않았다. 독립 검토 결과와 구현자의 보완 검증을 구분한다.

## 판단 보류 범위와 Ruling

| 검토자가 판단하지 않은 범위 | 실행자 판단 / 잘못 판단할 비용 |
| --- | --- |
| 실제 자연 삭제·후원 렌더링 | 실제 이벤트가 없었으므로 미검증 유지, 이벤트/후원/삭제를 만들지 않음 / 현행 backend·renderer의 드문 차이를 놓칠 수 있음 |
| 실제 파티·차단 card | 실제 target 부재를 정상으로 세지 않고 fixture와 분리 / 서비스 variant·grid 차이를 놓칠 수 있음 |
| 미관측 popup sibling 배치 | 현행 관계 증거 없는 구체적 결함을 만들지 않고 기존 popup 예외·fixture 보존 / 다른 sibling 배치에서 빈 칸이 남을 수 있음 |
| VOD 및 unknown/readonly/once/ambiguous adapter | 승인된 limited 경계를 유지해 추측 연결하지 않음 / 해당 환경에서는 삭제 표시를 제공하지 못함 |
| 이전 모듈·전체 PR 수용 | 이전 검토/수용 기록은 유지하되 이번 범위의 verdict로 전체 출시를 승인하지 않음 / 전체 환경·설정 조합의 미검증이 남음 |

Ruling: 이 수정은 새 기능/범위가 아니라 이미 승인된 ‘외부 writer 보존·직전 이미 숨긴 메시지 비공개’ 계약의 결함 보완이므로 사용자의 개입 불필요 시 계속 진행 지시에 따라 한 패스에서 처리했다 — 잘못 판단할 비용은 변형된 native 객체에서 삭제 표시가 보수적으로 제한될 수 있는 점이며, current ownership 가드와 repeated/native callback 회귀로 범위를 제한했다.

현재 원래 showDeleted/hideDonation은 OFF이고 다른 스타일·필터도 복원 기준을 유지한다. 실제 수정본 listener 연결/OFF 설치본 검사는 새 dist의 필수 수동 확장 새로고침 뒤 진행한다. 자연 이벤트와 환경 공백은 남으며 기여 PR/전체 복구/출시 완료가 아니다.

후속 사용자 새로고침 뒤 소유권 수정본a994241의 팝업 준비됨→원래 OFF/끔을 사용자 확인으로 수용했고, 별도 own live의1920×1080/ready4/playing/일반 채팅/marker0·원래 미션 표시를 확인한 뒤 탭을 닫았다. 외부 writer/native 삭제를 실제 서비스에서 실행한 검증은 아니다. 최종 fresh165/108/17/build/package/source-dist 일치와 전체 제한은 [기여 준비 상태](../validation/2026-10-08-contribution-readiness.md)에 이어진다. 독립 검토 및 보완은 기록한 범위의 결과이며 전체 정상·출시 인증으로 바꾸지 않는다.
