# 기여 준비 상태와 검증 범위

2026-10-08. 제품 변경 기준 `a994241`(미션/차단 CSS 및 후속 삭제 소유권 보완 포함), 설치본 기록 기준 `e0914e2` 이후. Chrome155.0.8059.39/Node24.x. 이 문서는 누적 기록의 최신 진입점이며 전체 기능 정상·출시·병합 승인서가 아니다. 원본/포크의 기존 이력과 라이선스를 유지한다.

## 판정 읽는 방법

- **기본 수용:** 기록한 실제 설치본 사례가 통과했다. 모든 방송·광고·화면 모드·설정 조합의 보장이 아니다.
- **자동 계약:** 실제 제품 모듈을 실행한 Node 또는 별도 합성 Chrome 검사다. 사용자 설치본/실제 이벤트를 대신하지 않는다.
- **미검증/제한:** 환경·대상 부재 또는 연결 계약 제한을 명시한다. 대상0을 정상으로 세거나 이벤트·결제·차단을 제조하지 않는다.

## 설정 기능 전체 범위

25개 leaf의 실제 설정 HTML/번역/저장 계약을 자동 검사했다. 아래 표는 각 설정의 동작 증거를 별도로 분류한다. Gain은 기존 localStorage `knifeGain`이며 이25개와 별도다.

| 설정 | 확인한 증거 | 남은 경계 |
| --- | --- | --- |
| preview, livePreview | 실제 사이드바 hover 재생·이탈 정리, URL 재사용, 사용자 지연 정상 확인, 홈 bfcache 복귀 후 재생 | 모든 스트림/CSP/CORS·codec/보호소스 미검증 |
| previewWidth, previewDelay, previewVolume | 실제400×225 및 지연 측정, main thumbnail600px/image-only, 음량0.05/0.07 관찰 | 모든 저장값·cold-start 상한/음질 보장 아님 |
| rightClickToUnmute, customPreview | 실제 사이드바/메인 thumbnail 음소거 해제·이탈, runtime 옵션 OFF 정리 | 일부 검사에서 runtime 임시 설정 사용; 모든 실제 저장 옵션 조합 아님 |
| updateSidebar, expandFollowings | 실제30초 갱신6회 및 팔로잉5→42, native 버튼/동적 섹션 자동 회귀 | 모든 사용자 목록 변형/사이트 변경 미검증 |
| popupPlayer | 실제 iframe 생성640×360/이동+60,+50/닫기, 드래그 해제 회귀 | 모든 frame/bfcache/미디어 조합 미검증 |
| arrowSeek | 실제 VOD ±5초 및 편집 입력 무간섭 | live DVR은 사용자 미결제로 실사용 불가; 광고 탐색 성공을 주장하지 않음 |
| pressToFastForward | 실제 VOD hold·속도/정지 복원, trusted pending/active OFF·지연 release 및 후속 native click | live DVR과 모든 취소·포인터·모드 조합의 실제 입력 미검증 |
| brightness, contrast, saturation, gamma, sharpness | 합성 영상 필터 pixels17개, 실제 live/VOD source-wrapper 한 번 적용·native 필터 보존·중립 원복 | 사용자 GPU/실제 방송 pixels·선명도 품질 미검증 |
| compressorDefault, compressorThreshold, compressorKnee, compressorRatio, compressorAttack, compressorRelease | 실제 기본 파라미터/ON-OFF20회/Gain150%/동일 video 모드·SPA 재사용, 합성 DSP·설정 검증 | 모든 개별 파라미터의 실제 청취·보호소스·새 media·장기 GC 미검증; 아래 음질 제한 유지 |
| hideDonation | 실제 controller 구조와 공개 앱 코드의 DONATION=10, 자동 filter/복원 계약 | 자연 발생 후원 이벤트 숨김 미검증; 후원하지 않음 |
| showDeleted | 새 live 일반 type1 삭제용 guarded native listener/상태/표지 구현, 자동29개, 소유권 보완 설치본 팝업 준비됨→원래 OFF/끔 사용자 확인·일반1080p 재생/채팅/marker0 | 자연 발생 삭제/취소선·label 및 외부 writer 실제 이벤트 미검증; 과거 숨김·cleanbot·VOD를 복구하지 않음; unknown/readonly/once/ambiguous 연결은 limited |

설정 외 기능: 통계의 실제 해상도/측정FPS/코덱 기본 수용, 비트레이트·지연시간은 알 수 없음. live/VOD 시작 시각·metadata cache/URL 재사용 기본 수용. 채널 채팅 버튼은 실제 live URL 이동을 확인했지만 당시 대상 종료 화면이므로 활성 방송 채팅 연결 전체 PASS가 아니다. 실제 PIP 기본 사례와 사용자 전체화면/Esc 정상 보고가 있으며 모든 조합은 미검증이다.

## 스타일25개

원래 저장 기준은 [사용자 제공 스타일 상태](2026-10-08-style-baseline-and-acceptance.md)의 ON10/OFF15/font0이다. 반대 옵션 검사와 수동 복원을 기록했고 마지막 미션·차단 옵션도 사용자 OFF 복원 완료 보고를 받았다.

| 스타일 | 실제 설치본/자동 증거와 한계 |
| --- | --- |
| fit-player, volume-percentage, hide-ff, hide-comp | 저장 ON/OFF·원래 값 복원 기본 수용. VOD 일반556→640/넓은700 유지. 모든 fullscreen/PIP 조합 아님 |
| chat-resize, chat-font-size, chat-timestamp, hide-ranking, left-chat | live/VOD 실제 배치·handle·시각/랭킹, VOD drag353→394→353, font8 텍스트22/배지26/원래font0 텍스트14/배지18 및 복원. 모든 특수 메시지/접힘 조합 아님 |
| hide-mission | 현행 header 구조 CSS 및 legacy 보존, 미션/파티 펼침·접힘 자동 회귀. 실제 미션 펼침 ON display none/h0→OFF block/h141, 채팅·정상 카드·후속1080p 재생 보존. 실제 파티는 대상 없음 |
| hide-offline, hide-recommended, hide-schedule, hide-sidebar-partner, hide-shortcut, right-sidebar | 실제 반대 설정·원래 값 복원, partial loading 일반 메뉴 보존·expanded/compact·reload/SPA 기본 수용. 위치 추정 대신 owned identity 사용. 모든 목록 변형 아님 |
| static-logo, hide-topics, hide-studio, auto-hide-toolbar, top-explore | 실제 반대 설정·원복, focus/hover·작은 화면 native 배치·1800px 이상 검색 분리 기본 수용. 모든 접근성/모드 조합 아님 |
| hide-recommended-live | 실제2560/1200 일반 추천 숨김·팔로잉/VOD 보존, SPA 정리·재적용 및 OFF/ON 복원 |
| hide-blocked | 현행 blocked modifier/direct-thumbnail와 direct LI/DIV item·legacy/popup 예외 자동 회귀. 저장 ON 적용/원래 OFF 복원은 사용자 보고. 실제 차단 대상 없어 숨김·grid gap 실사용 미검증; 계정 차단을 만들지 않음 |
| hide-live-badge, rectangle-profile | 실제 badge와 home/sidebar/channel-info profile ON/OFF·크기 및 다른 thumbnail 보존·원복. 모든 요소 변형 아님 |

## 음질과 환경 제한

사용자는 컴프레서 ON/OFF 뒤 소리가 정상적으로 들린다고 확인했다. 합성 기본14사례 full-scale 초과0·Gain 전환12사례의 연속성 검사를 별도로 기록했다. 다만250/750Hz toggle dip과 극단 설정 stress peak1.95944/full-scale 초과16000샘플은 해결됐다고 주장하지 않는다. 방송 음성을 녹음하거나 GPU·주관적 음질을 자동 시험 통과로 대체하지 않았다. Gain UI48px/우측8px와10ms 평활화는 확인한 범위다.

유료 DVR·자연 삭제/후원·활성 파티/차단 대상·보호된 소스·실제 GPU·장기 heap/GC·모든 광고/fullscreen/PIP/bfcache/설정 조합·Firefox 전체 검증은 남는다. 제한된 CDP를 우회하거나 계정 변경·결제로 시험을 만들지 않는다.

## 현재 코드·패키지 증거

소유권 보완 및 설치본 OFF 복원 이후 fresh 최종 실행 결과는 전체 Node165/165, 별도 Chrome 스타일108/108·영상 필터17/17, build/source 및 dist 패키지v2.13.2/20 entry resources PASS다. 로그 contribution-final-node/css/filter.log와 최신 source/dist SHA256는 [설치본/최종 검증 기록](2026-10-08-restored-settings-and-runtime-checks.md)에 있고 RED→GREEN 근거는 [새 변경 검토와 보완](../reviews/2026-10-08-deleted-chat-and-style-review.md)에 있다. 이전158/108/17과 별도이며 문서 변경만으로 결과를 새 실행으로 표기하지 않는다.

이전 전체 브랜치 독립 검토의 Important2와 사용자 선택 Minor1은 한 패스에서 수정·회귀·설치본 검증했다. 이후 새 삭제 표시·미션/차단 CSS의 별도 읽기 전용 검토에서 Important1(외부 in-place 숨김 변경 뒤 오래된 소유권 재사용)을 확인했다. 구현자는7RED→GREEN/전체165건으로 보완했고 새 설치본 준비됨→원래 OFF/끔 사용자 확인·일반 재생/채팅 유지까지 기록했다. 이전 해결 범위의 재검토나 현재 전체 출시 인증이 아니다.

## PR 게이트

설치본 미션 OFF와 소유권 보완 설치본 준비됨→원래 OFF/끔 복원은 완료했다. upstream default main·정상 포크 parent·같은 작업 브랜치의 기존 PR0을 읽기 전용 확인했다. 위 실제 대상/환경 공백이 남으므로 ‘전체 기능 정상’ 조건이 충족됐다고 간주하지 않는다. 제한을 명시한 복구 시험판 기여 PR로 진행할지 사용자에게 범위 판단을 요청한다. 원래 PR 방향은 유지하되 미검증을 묵시적으로 정상 처리하지 않는다. PR/스토어 배포/원본 main 병합은 아직 하지 않았다.

사용자는 이 한계를 명시하고 ‘전체 정상’이 아닌 복구 시험판 기여 PR을 한글로 여는 방향에 ‘진행’이라고 승인했다. 실제 대상·환경의 미검증을 정상으로 재분류하지 않고 공개한다. 이 추가 승인에 따라 `Do-hyeon:codex/chzzk-compatibility-recovery`→`jebibot:main`의 PR 제출을 준비한다. 자동 병합/스토어 게시/계정·moderation 변경은 승인 범위가 아니다. PR 실제 생성 여부는 생성 후 별도로 확인하고 URL을 기록한다.

## PR 제출 완료

[한글 PR #81 — 치지직 현행 UI 대응 및 기능 복구 시험판 (2.13.2)](https://github.com/jebibot/cheese-knife/pull/81)을 생성하고 이 채팅에 연결했다. GitHub readback에서 author/head owner Do-hyeon, base main/head codex/chzzk-compatibility-recovery, state OPEN/isDraft false 및 제출한 한글 본문 일치를 확인했다. 생성 직후 status checks는0개였으므로 원격 CI 통과로 주장하지 않는다. 병합·출시·스토어 배포는 하지 않았다.

제출 직전 현재 제품/트리의 Node165/165·native CSS108/108·필터17/17·build/source 및 dist package 각v2.13.2/20resources/diff check를 재확인했다. 로그는 pr-submit-node/css/filter.log다. 양쪽 main SHA는5ccb2bfdb660534c6fb64ceda511124ae3784416, 최초 PR 제출 head는7a54d10429ac95544e2c6959269e3cb9358d707d였다. 이후 제출 URL/문서 상태만 같은 브랜치에 기록한다. 제품 코드와 설치본 설정은 변경하지 않는다.

PR에는 위 실제 이벤트·대상·DVR·음질/환경 제한 및 deferred Minor(시스템 시각 변경의 hover deadline 영향)를 포함했다. 사용자 승인된 제한 명시 기여 제출은 완료됐으며, 전체 기능 수용·병합·배포 승인이나 실제 환경 공백의 해소를 의미하지 않는다. 작업 브랜치/원본 체크아웃은 PR 피드백 대응을 위해 보존한다.
