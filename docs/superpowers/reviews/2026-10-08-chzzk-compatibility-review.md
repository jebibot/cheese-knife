# Cheese Knife 호환성 설계 공격적 검토

작성일: 2026-10-08 (Asia/Seoul)

대상: [복구 설계](../specs/2026-10-08-chzzk-compatibility-design.md), 원본 `5ccb2bf`, 포크 `4930117`, PR #70/#74/#76의 고정 SHA

방식: 소스 대조, 핵심 함수의 읽기 전용 재현, 브라우저 증거의 신뢰 범위 점검, 실패/경쟁 조건에 대한 자체 검토. 독립 심사자 또는 보안 침투 테스트를 수행한 것으로 주장하지 않는다.

## 1. 판정

초안과 참고 포크를 그대로 구현하면 회귀를 일으킬 수 있다. 특히 포크의 VOD 오분류는 실제 함수 실행으로 재현했다. 최신 설계는 아래 차단 조건을 반영했으며 구현을 구체화할 수 있는 상태다. 그러나 실제 MAIN world 진단, 오디오 안전성, HLS/CORS/CSP, 내장 키보드 공존은 검증 전이고 제품 호환성을 보장하지 않는다.

상태의 의미:

- `설계 반영`: 차단하는 규칙과 수용 시험을 문서에 추가했다. 구현이 고쳐졌다는 의미가 아니다.
- `실행 전 판정 필요`: 실제 페이지/API/미디어 조건을 확인해야 동작 여부를 판단할 수 있다.

## 2. 발견사항과 반영 결과

| ID | 우선순위 | 공격 시나리오 / 근거 | 초안의 실패 | 설계 조치 / 수용 검사 |
| --- | --- | --- | --- | --- |
| R01 | P1 | 읽기 전용 검사에서 page 전역/React expando가 전혀 안 보임. Chrome 격리 환경에서는 가능한 결과 | webpack/Vue 제거를 확정해 잘못된 원인을 고침 | §2 증거 정정, §12 D0 MAIN 진단. 실제 world와 단계가 확인된 결과만 원인 판단 |
| R02 | P1 | 원본 `web/inject.js:78` Promise executor를 window={}로 실행 | “스크립트 전체 즉시 중단” 설명이 Promise 의미와 다름 | §2 정정. optional promise rejection을 처리하고 feature 초기화 경로를 독립 시험 |
| R03 | P1 | 포크 `web/inject.js:695`의 분류에서 VOD + `.pzp-pc` | live 분기가 먼저 실행되어 VOD 기능 누락 | §5 URL 우선. 실제 함수 실행은 원본 `vod`, 포크 `live`. live/VOD/explore 표 기반 회귀 시험 |
| R04 | P1 | 컴프레서 UI만 삭제 후 같은 video를 재마운트. 포크 `:939`는 video expando source만 재사용 | 새 Context/graph와 오래된 source가 섞이거나 중복 생성 거부. 기존 context 누적 | §7 문서/frame AudioContext와 WeakMap entry 재사용. 같은 video/controls 교체 후 source 하나와 정상 소리 검사 |
| R05 | P1 | 기본 on 또는 연속 토글 중 `resume()`가 pending. 포크 `:935`는 완료를 기다리지 않음 | source가 정지 context로 이동해 무음. UI는 on | §7 running 확인 전 source 생성 금지, generation/1초 취소. pending/on 구분. 실제 신규 탭 autoplay 제한 시험 |
| R06 | P1 | MAIN HLS 요청에 페이지 CSP/서버 CORS 적용 | host permission이나 라이브러리 포함만으로 재생된다고 가정 | §8, D0에서 segment/manifest 실제 검증. 제한 시 thumbnail와 reason. 범용 proxy·권한 전체 확대 금지 |
| R07 | P1 | PR #70에는 vendor 폴더 추가, 기존 `package.json:7` build는 vendor 미복사 | 소스 폴더는 되지만 dist에서 파일 없음 | §4/§11 allowlist build와 모든 manifest 참조 검사. source/dist 각각 로드 |
| R08 | P1 | hover A의 fetch가 늦고 이미 B로 이동/hidden | 이전 결과가 hide 뒤 새 미리보기를 표시/재생 | §8 요청 generation + abort + await 후 재검사. 응답 순서 역전과 hide 직후 metadata 시험 |
| R09 | P1 | global `document.querySelector('video')` + 보조 player/preview; 포크 전역 `.pzp-pc` fallback | 잘못된 영상의 시간·오디오·속도 변경 | §5 route/콘텐츠 scope에서 후보 하나만 선택. 주/보조/미리보기 공존 시험 |
| R10 | P1 | SPA 화면에서 player 유지, video/controls만 교체. observer는 childList 일부만 관찰 | 기존 flag 때문에 버튼 재생성 누락, 이벤트/소스가 이전 video에 남음 | §5 video identity와 부분 UI mount 별도 추적, frame당 scope. §7 inactive graph 출력 연결/강한 참조 해제 및 재사용 정책. 교체/10회 재진입에서 누적 없음 |
| R11 | P1 | source 연결 뒤 context를 close하거나 CORS 제한 스트림에 연결 | DOM 정리로 원래 native audio가 되돌아온다고 가정. 계속 무음 가능 | §7 UI dispose는 bypass, context는 문서 수명 유지. eligibility 확인, 지원 밖 자동 on 금지, 무음이면 reload 안내. 실청취 필수 |
| R12 | P2 | 원본 `:808` / 포크 `:815` media.find에서 `m.mediaId = 'LLHLS'` 대입 | 통계 조회가 livePlayback media 객체를 수정 | §6 통계 읽기 전용. frozen fixture에서 mutation 없이 값 반환. 제한 값은 알 수 없음 |
| R13 | P1 | 사이트 기본 방향키 + 확장 방향키, contenteditable 자손/slider/IME | 한 번에 10초 이동, 채팅 입력·접근성 간섭 | §6 내장 처리 공존 정책 + 활성 주 player + 입력 guard. 실제 delta/입력 시험. 표준 API만으로 DVR 복구를 주장하지 않음 |
| R14 | P2 | VOD에서 500ms 전에 손을 떼거나 focus/route 변경. 원본 `:1104`는 무조건 원래 값 적용 | 아직 2배속을 시작하지 않아도 사용자 rate를 1로 덮어쓰거나 2배속 잔류 | §6 변경 소유권, pointercancel/blur/dispose. 빠른 release와 사용자 rate 변경 시험 |
| R15 | P2 | config listener 순서 반전, `message.data=null`, 오래된 응답, 부분/손상 설정 | i18n 빈 값·TypeError·잘못된 AudioParam·과거 설정 덮어쓰기 | §5 준비 이후 handshake, namespace/type/schema/revision, §7 수치 검증. 저장 데이터 정상화 시험 |
| R16 | P1 | getReactState를 못 찾는데 chatResize/미리보기/UI까지 선행 조건으로 묶음; fake DOM 테스트만 PASS | 일부 기능 지원 불가를 전체 복구로 포장 | §9 DOM resize 독립 및 기능별 상태. §11 실제 미디어/내부 기능은 별도 PASS 증거 필요 |

P1은 복구 결과·시청에 직접 영향을 주는 출시 차단 항목, P2는 해당 기능의 오류/품질/예외 처리를 우선 고쳐야 하는 항목이다. 심각도는 가상 보안 취약점이 아니라 프로그램 동작 영향 기준이다.

## 3. 수행한 최소 재현

작업 파일을 수정하지 않고 Node `vm`에서 실제 소스의 함수 조각을 실행했다. 이 probe는 분류/Promise 의미만 검사하며 사이트 전체를 재현한 테스트는 아니다.

### Promise executor 실패

조건: 원본 `getWebpackRequire` 블록, `window={}`. 뒤에 동기 marker와 rejection 관찰만 추가.

```json
{"afterOptionalInit":true,"failureName":"TypeError"}
```

결론: 전역 부재는 Promise rejection을 만든다. 뒤의 동기 코드까지 즉시 멈춘다는 이전 설명은 틀렸다. 실제 페이지에서 왜 플레이어 기능이 없는지는 별도 MAIN 진단으로 확인해야 한다.

### 포크의 VOD 분류

조건: 실제 `attachBodyObserver`의 init 함수, `location.pathname='/video/123456'`, section class=`_container_current_1`, `document.querySelector('.pzp-pc')`가 존재. attach 함수의 선택만 기록.

```json
{"implementation":"original","route":"/video/123456","pzpExists":true,"calls":["vod"]}
{"implementation":"scweeny","route":"/video/123456","pzpExists":true,"calls":["live"]}
```

결론: 포크의 selector 확장은 VOD 화면을 live로 오분류한다. URL 판별을 먼저 하는 요구사항은 선택 사항이 아니다.

## 4. 더 공격적으로 확인할 반례

구현 검증에서는 정상 화면 하나의 성공을 아래 반례로 깨뜨려야 한다.

| 반례 | 기대 결과 | 검증 층 |
| --- | --- | --- |
| 버퍼 없음/1개 구간 30ms/2개 구간 사이 빈 시간 | 범위 밖 seek 없음, 빈 범위 무동작 | Node + 실제 영상 |
| live duration이 finite, 또는 사이트가 자체 time-machine 사용 | live를 놓치지 않으며 사이트 기능과 중복 제어 없음 | 실제 Chrome |
| 컨트롤만 교체, video는 동일 | UI 복구, AudioContext/source 추가 생성 없음 | Node + 실제 소리 |
| video 교체, 컨트롤은 동일 | 새 video에만 제어 연결, 이전 video의 rate/graph 정리 | Node + 실제 소리 |
| 컴프레서 20회 토글 중 resume 순서 역전 | 마지막 요청 상태 유지, 증폭/무음 없음 | fake graph + 실제 Chrome |
| 서로 다른 스트림의 cross-origin/보호 영상 | 지원 전 경로 가로채지 않음, 제한 표기 | 실제 Chrome |
| 시작 후 숨김/화면 전환/뒤로 가기/bfcache | 요청·timer 정리, 복귀 후 다시 작동, audio 끊김 없음 | Node + 실제 Chrome |
| 같은 anchor의 채널 URL이 변경 | 오래된 응답 거부 | Node |
| 첫 요청 timeout 후 재hover | 취소된 in-flight promise 재사용 없음 | Node |
| 401/403/429/깨진 JSON/HLS가 LLHLS만 존재 | 제한 상태, 유한 재시도, 썸네일 동작 유지 | fixtures + 실제 접근 가능 스트림 |
| webpack 후보에 타 제품 chunk 또는 throwing getter 포함 | 전체 window 탐색/임의 코드 실행 없이 optional 제한 | Node |
| 10회 route 변경/동일 초기화/확장 개발 reload | scope 중복 없음. 새 코드 적용에는 page reload 필요함을 명시 | Node + 실제 Chrome |
| 광고/미니플레이어/iframe/fullscreen/PIP | 주 video 오인 없이 시청 유지 | 실제 Chrome |
| 통계 조회 대상을 freeze | 입력 객체 변경 없이 가용 정보만 표시 | Node |
| Chrome 정상, Firefox 미실행 | Chrome 검증만 PASS, Firefox UNVERIFIED | 릴리스 검증표 |

## 5. 남은 판정과 구현 착수 조건

1. MAIN world에서 실제 의존성 및 실패 지점을 확인해야 한다. 현재 증거는 특정 전역/프레임워크 제거를 확정하지 않는다.
2. 컴프레서는 irreversible한 source 연결 이전의 eligibility 검증과 실제 소리 확인이 필요하다. Web Audio API 예외를 catch하는 것만으로 무음 복구를 보장할 수 없다.
3. HLS fallback은 라이브 API 응답과 manifest/segment 접근을 실제 브라우저에서 확인해야 한다. 모든 로그인/보호/성인 방송의 미리보기 지원을 약속하지 않는다.
4. live 탐색은 사이트 엔진이 원래 위치로 돌리는 경우와 기본 키보드 공존을 확인해야 한다. 확인되지 않은 HLS 내부 함수를 덮어쓰거나 버퍼를 1000배 늘리지 않는다.
5. 삭제된 채팅/후원 filter/사이드바 갱신/통계에는 표준 DOM API로 대체할 수 없는 정보가 있다. 관련 상태를 찾지 못하면 전체 완료를 주장할 수 없다.
6. 새 dependency를 선택할 때 정확한 버전·hash·라이선스·보안/브라우저 적합성을 기록해야 한다. 비교 PR의 파일을 최신·안전한 배포물로 가정하지 않는다.

위 조건을 구현의 D0에 배치한 이유는 큰 수정 후에야 불가능성을 발견하는 일을 줄이기 위해서다. D0에서 확인된 추가 제약은 기능별 설계를 수정하며, 이번 검토의 “설계 반영”을 구현 완료의 증거로 사용하지 않는다.

## 6. 검토 후 범위 점검

- 복구에 필요한 runtime·player·audio·preview·adapter 분리만 포함하고 제품 전체 재작성은 제외했다.
- 기존 Manifest V3, Chrome 최소 121, 저장 키, 번역과 CSS 스타일 호환을 유지하는 조건을 넣었다.
- source와 dist 패키지의 차이, 프레임과 탭 구분, 오디오와 DOM의 서로 다른 수명을 명시했다.
- 반복 polling/전역 fallback/오래된 응답/광고 video/누락된 수치/손상 설정의 실패 기준과 검증 방법을 추가했다.
- 독립 리뷰나 실서비스 시험이 완료됐다는 주장 없이 자체 검토 및 최소 재현의 범위를 명시했다.

현재 변경은 설계와 검토 문서 두 개뿐이며, 제품 코드 수정·확장 설치·스토어 배포를 수행하지 않았다. 사용자 추가 요청에 따라 공개 포크/작업 브랜치를 준비하고 이 문서들을 첫 commit으로 게시하는 단계는 허용된 작업 범위에 포함한다.
