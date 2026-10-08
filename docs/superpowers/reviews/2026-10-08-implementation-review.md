# 독립 구현 검토와 수정 결과

검토 범위: 원본 `5ccb2bf` → 후보 `346ce95`. 설계 검토와 별도로, 읽기 전용 독립 심사자가 production 모듈 실행과 소스 대조로 검토했다. 이후 작성자가 지적을 재현하는 회귀 테스트를 먼저 실패시킨 뒤 한 차례 수정했다. 수정본에 대한 두 번째 독립 승인을 받은 것으로 주장하지 않는다.

초기 판정: 출시 준비 미완료. Critical 보안 발견은 없었으나 Important 6개가 확인됐고, I01은 오디오 안전성 출시 차단이었다. 보안 라이브러리 내부에 대한 전면 감사를 의미하지 않는다.

| ID | 등급 | 확인한 문제 | 수정 / 회귀 근거 |
| --- | --- | --- | --- |
| I01 | Important / 차단 | 분리·일시정지한 video의 모든 오디오 노드를 끊으면 재사용 시 무음 | 비가역적인 source에 dry 출력 경로를 남기고 wet graph와 관리 Set의 참조만 퇴역. off 상태 재사용 테스트 RED→GREEN |
| I02 | Important | sidebar 교체가 전역 generation을 바꿔 압축기를 off로 전환 | UI 소유권과 오디오 소유권 분리, route/layout/player/video identity로 UI 재연결. sidebar 교체·같은 video reparent 테스트 RED→GREEN |
| I03 | Important | preview anchor 제거·href 변경 뒤에도 기존 HLS가 실행됨 | active identity 상수 시간 검사, anchor/route/config 변경 시 abort·destroy·media 제거. 제거/href/livePreview off 3개 RED→GREEN |
| I04 | Important | 기존 controls의 자식만 교체하면 확장 버튼이 사라짐 | 관련 mutation.target도 검사하고 확장 자체 mutation은 제외. native controls 교체 후 자동 복원 RED→GREEN |
| I05 | Important | 기본 customPreview=false에서 native 썸네일 우클릭 음소거 해제가 누락됨 | 같은 origin의 live 카드 아래 단일 video만 별도 처리. 주 플레이어 제외·mute/volume 테스트 RED→GREEN |
| I06 | Important | chat controller 발견이 처음 timeout되면 영원히 재시도하지 않음 | DOM 설치와 controller 기록 분리, bounded retry 후 관련 변경/reconcile에서 재발견. 새 controller 교체 시 소유한 patch만 복원. 지연 2.15초/교체 RED→GREEN |
| M01 | Minor | previewDelay가 thumbnail 표시를 지연하지 않음 | 표시와 재생 시작을 취소 가능한 동일 hover timer로 묶음. hide가 예약 표시를 취소하는 테스트 RED→GREEN |
| M02 | Minor | 원본 live/VOD 시작 시각 hover tooltip 누락 | 확인된 원본 DOM/React 데이터 계약에 한해 복원. VOD 요청 5초 제한·100개 cache·route/href 검증. live/VOD 성공·stale/foreign 테스트 RED→GREEN. 현재 모든 카드 레이아웃 지원을 주장하지 않음 |
| M03 | Minor | timestamp 데이터 없는 log도 ready로 보고 | 읽을 수 있는 메시지를 실제로 처리한 때에만 ready. 처음은 pending. 데이터 없는 log→지원 row 테스트 RED→GREEN |

추가로 bfcache의 persisted pagehide에서 오디오 설정을 유지하는 테스트도 RED→GREEN 했다. 총 14개 새 회귀 테스트를 추가했고, 전체 47/47 PASS다. `createMediaElementSource`의 비가역성 때문에 사용 중인 document의 dry 경로를 무조건 해체하지 않는 것이 안전성 우선 결정이다. 실제 브라우저 GC·장시간 메모리 사용량을 검증했다고 해석하면 안 된다.

## 수정 후 확인 범위

- 통제된 실제 브라우저 음원: running AudioContext, source 1개, 압축 RMS 0.24234 / bypass RMS 0.34411, page error 0.
- 공개 방송: 별도 Chrome 155에서 native HLS 프레임 0→60 / 시간 0→1.898초, 별도 HLS.js/MSE 경로 프레임 4→64 / 시간 0.512→2.486초. hide 뒤 media 제거·panel 숨김·settling 후 2초 추가 미디어 요청 0.
- source/package 참조 검사와 dist build PASS. 설치된 확장의 실제 ISOLATED/MAIN bootstrap 성공과는 구분한다.

## 여전히 판단하지 않는 항목

설치한 Chrome에서 내장 키보드 중복, DVR 상태 유지, VOD native gesture 공존, 보호된/인증된 스트림의 오디오, context 자동 suspend/resume, 실제 bfcache/fullscreen/PIP/miniplayer, 후원 type 계약, 가상화된 chat row, 다양한 chat layout, sidebar 확장, popup iframe, 현재 stats 메뉴 위치는 사용자 페이지의 실제 검증이 필요하다. 삭제 채팅·sidebar 자동 갱신·비트레이트/지연시간은 여전히 명시적 제한이다. Chrome 121 및 Firefox 검증도 수행하지 않았다.

판정: 재현된 주요 구현 결함은 회귀 suite에서 해소했으나, 전체 기능 복구/출시 완료가 아닌 설치 검증용 후보다.
