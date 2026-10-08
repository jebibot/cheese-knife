# 전체 브랜치 독립 검토와 보완

검토일2026-10-08. 원본 `5ccb2bfdb660534c6fb64ceda511124ae3784416`→후보 `d985167e5245e5757a5d1d1ca939038ecb1bc2a9`. 새 문맥의 읽기 전용 검토자1명,작업 트리 수정/추가 위임 없음. 독립적으로 관련 Node68개 통과. vendor 전체/보조 진단 스크립트 전체를 읽었다고 주장하지 않았다.

강점: Vue 선행 조건 제거,기능별 수명/설정 분리,미리보기 취소·hover 기준 지연·보호 영상 거부,Gain 재사용/초기화/평활화,VOD hold 복원의 제품 모듈 회귀 검사. 알 수 없는 통계/삭제 채팅 제한을 숨기지 않음. 실제 chat row로 한정된 왼쪽 배치 선택자.

## 발견 사항 및 한 번의 보완 패스

Critical 확인 없음. 아래4개 Important(P2)는 검토자의 production-module probe 후 구현자가 별도 회귀 RED→GREEN으로 재확인·보완했다.

| 원인(검토 SHA 기준) | 사용자 영향 | 보완 / 검사 |
| --- | --- | --- |
| preview.js:104,181–184 — active surface를 기억하지 않고 두 옵션을 함께 검사 | 한쪽 미리보기 OFF,다른 쪽 ON이면 진행 중 요청/영상/해제된 소리가 남음 | surface permission 보관. sidebar/custom×fetch/preload/display6개 RED→GREEN |
| background.js:32–42,104–106 — queue 호출 순서만 보장,초기 snapshot 나이는 모름;이관 중 listener 제거 | 최신 저장 스타일과 다음 문서의 CSS 등록이 불일치 | storage revision으로 stale startup 제외,listener 유지,늦은 legacy read의 스타일/설정 덮어쓰기 방지. startup/migration4개 RED→GREEN |
| main.js:35–39,66–67 — 초기 config만 보호하고 styleParameters는 덮음 | 최신 font8px가 오래된값으로 돌아감 | 독립 style-parameter 최신 변경 추적. 값 변경/초기화2개 RED→GREEN |
| inject.js:55–83 — document mouseup만 종료,gesture cleanup 누적 | blur/문서 밖 해제 후에도 popup 이동·iframe pointer 차단 지속 | gesture별 종료/리스너 제거,blur/pagehide/dispose/buttons=0 정리.3개 RED→GREEN |

검토자의 Minor(P3) 상태 표시 지적도 재현했다. 같은 controller를 다시 patch하지 않는 빠른 return이 hideDonation/showDeleted의 새 옵션을 상태에 반영하지 않았다. 후원 필터는 ON인데 disabled로 보이고 삭제 표시의 지원 제한도 숨었다.

**Ruling:** 지원 제한을 숨겨 전체 복구 여부를 사용자가 오판하게 하는 상태 계약 위반이므로 Important로 재분류 — 같은 controller의 상태만 독립 갱신,중첩 patch 금지 회귀 RED→GREEN — 틀렸다면 작은 상태 갱신/회귀 검사 비용이 추가됨.

전체 suite98/98,native CSS16/16. 추가 보완은 검토자 재검토 대신 원인 회귀와 전체 suite로 검증했다. 새 후보의 실제 설치본 수용은 별도 단계로 남음. 검토자의 원래 결론은 **merge 불가**(4개 결함+미완료 수용)였으며,이를 새 후보의 전체 merge 승인으로 바꾸지 않는다.

## 판단 유보와 실행자의 처리

| 검토 경계 | 처리 / 잘못 판단할 때의 비용 |
| --- | --- |
| miniplayer 이동 | 실제 이동 증거 없음.353px transient를 mini로 단정하지 않음.실제 scope/소리 연속성 확인 전 PASS 금지 / 전환 중 기능 유실을 놓칠 수 있음 |
| 광고 | 별도 광고 표면에는pzp가 없었음.공유-video 광고는 입증 안 됨 / 광고를 주 영상으로 조작할 수 있어 수용 검사 필요 |
| 허용-DVR·native live seek | unit ranges는 실제 DVR/snap-back 증명이 아님.금지 채널은 성공 사례로 쓰지 않음 / 탐색 실패·중복 이동 가능 |
| 삭제 표시·비트레이트·latency | 선언된 지원 미완료 유지.전체 원래 기능 복구 주장 차단 / 누락 기능을 정상으로 오판할 수 있음 |
| 시작 시각·후원 종류·채널 버튼·실제 필터/GPU·popup 배치 | 필요한 실제 화면/이벤트 증거를 더 모으기.필터는 아래 별도 native 진단을 추가했으나 GPU 보장 없음 / 연결점 변화 미검출 |
| resize/fold/portrait/left 조합 | 후속 실제 VOD left drag353→394/저장/353·null 복원,재생 유지 확인.다른 조합은 남음 / 드래그 방향·작은 화면 문제 |
| CSS25개·focus·작은 화면·fullscreen | 16 fixture를25개 옵션 조합 PASS로 환산하지 않음 / 선택자/레이아웃 회귀 |
| fullscreen·확장 설정 UI | 미검증/브라우저 정책 제한 유지.다른 표면으로 우회하지 않음 / 실제 적용과 구분 필요 |
| audio 장기GC·보호 소스·여러 실제SPA | standard graph와 합성 검사만으로 보장하지 않음 / 누적 자원·소리 손실 위험 |
| preview card 조합·route/bfcache·segment stop | 기존 사례와 새 unit surface6개만큼만 증거 반영.전체 설치본 수용 남음 / 취소 뒤 영상/네트워크 잔류 |
| package/vendor/보조 진단 | 검토 범위를 과장하지 않음.실행자가 build/source·dist check를 별도 재실행 / 패키지·재현 도구 미검토 영역 |

## 보류 Minor

Date.now 기반 hover deadline은 시스템 시각 변경 영향을 받을 수 있다.현재 보완 패스에서는 바꾸지 않았다.캐시/uptime/표시 지연의 시간 기준을 함께 설계·검사할 때 검토할 항목이며 일반 hover 검사 PASS가 이 경계까지 증명하지 않는다.

## 추가 실제 / native 진단

- d985 설치본: live hotfix 없음,영상1963px,chat353px/왼쪽,parent row-reverse/안쪽 main column,재생 유지.초기353px 관측은 이후 같은 문서에서1963px여서 지속 결함이나 mini 이동으로 판정하지 않음.
- 실제 VOD: left row-reverse,timestamp34개,handle1개.드래그353→394px와 저장394,영상재생/프레임3011→4356 확인.웹 저장chatWidth를원래null,root 변수/폭353/inline width없음으로 복원.
- 별도 system Chrome155.0.8059.39,실제 config/main/main.css와 가짜 Chrome API 경계,합성Canvas stream→video.실제 CSS-filtered video의64×64 screenshot 픽셀을 재디코딩해11개 사례 통과.사용자 프로필/방송을 사용하거나 녹음하지 않음.
- 픽셀:neutral100/80/60,brightness0=0/0/0,brightness1.5=150/120/90,contrast0=127/127/127,contrast2=72/32/0,gamma0=255/255/255,gamma2=39/25/14,saturation0=83/83/83,sharpness5 균일 내부100/80/60,5개 조합155/140/124,reset100/80/60.
- 진단 첫 버전은Canvas2D에 필터를 재적용했고 contrast의 이론적188 기대가 틀렸다.측정 경계를 실제video screenshot으로 바꾸었으며 실제값127을 관찰했다.기록은 현재Chrome 출력이지 모든 색 공간/브라우저 보장이 아니다.첫 합성 stream 대기를 중단한 뒤 paint 생산과5초 시작 timeout을 추가했다.제품 DSP/필터 수식은 이 진단에서 수정하지 않았다.샤프닝은 kernel/균일 내부만 검사해 실제 edge/GPU 품질은 미검증이다.
- 재현: `node scripts/check-video-filters.mjs --chrome`.표준 Node suite와 별도 브라우저 검사다.일반 CLI npx 부재로 기존 저장소의 Node/Playwright native 진단 방식 사용;사용자브라우저·차단된 확장 UI의 대체 제어가 아니다.
