# 시작 시각 선택자 복구 — 기본 설치본 수용

2026-10-08. 사용자가 현행 live/VOD 연결점만 추가하고 기존 조회·캐시·취소·URL 검증을 유지하는 제한 수정을 승인했다. 기준76cc0af, 시험판v2.13.2다. [실제 연결점 조사](2026-10-08-installed-remaining-function-checks.md)에 근거하며, 전체 기능/PR 완료 판정이 아니다.

## 원인과 최소 변경

현재 live/VOD 페이지의 옛 `video_information_count__`/`video_card_item__` 연결점은0개였다. 공개 DOM에서 live 시청자 수는main 안의data 직접 자식strong/count, VOD 날짜는area/information 직접 자식의 마지막span/item을 확인했다. live의 기존React adapter가openDate를 반환했고, VOD의 기존API HTTP200/code200/liveOpenDate 계약과 기존parent.parent anchor의 동일VOD URL을 확인했다. 원문React 객체나응답 전체를 기록하지 않았다.

`web/inject.js`의`bindStartTimes`에 두 선택자를 추가했다. 현재live 선택자는route=live에서만 기존React 날짜 조회로 분기하고, span 경과시간/p 팔로워/일반count는 선택하지 않는다. VOD는현재area/information/direct last-span으로 한정한다. legacy 선택자·기존cache/5초timeout/pending 중복억제·scope abort·같은origin/video 경로확인·응답 시href/연결/scope 검증·limited 보고를 유지한다. 새API fallback, 타이머/observer, 권한, 저장설정, 통계계산은 추가하지 않는다.

## 테스트와 빌드

production listener/adapter 검사8개를 추가하고, 원격HTTP 경계만 대체했다. 수정 전8개 중6개가 원인에 맞게FAIL했다(tooltip/state undefined, request0). 비live/외부URL 보호2개는 기존동작 characterization으로PASS했다.

- 현재live viewer/count의ancestor metadata 읽기, 네트워크fallback 없음, 경과시간/팔로워/다른count 보존, route정리.
- live metadata 부재의limited 보고와 비live route 보존.
- 현재VOD 날짜 표시/조회수 항목보존/새카드의 동일VOD cache 사용.
- foreign/nonvideo URL 거부, 늦은href변경 응답거부, route변경 abort+응답거부, metadata부재limited.

최소수정 후 신규8개+기존legacy3개11/11, 전체Node109/109 PASS. nativeCSS40/40도 재실행PASS했다. build/source+dist package v2.13.2/20 entry resources, diff check PASS. source/dist inject.js SHA256은`FE42B7CD63446B97390A1FEFBEBF3398551D9590C7AA1BA95C38ACD02E27A85A`로 동일하다. generated dist만 재생성했고 새dependency나도구를 설치하지 않았다.

재현: `node --test tests/*.test.cjs`, `node scripts/check-styles.mjs --chrome`, `node scripts/build.mjs`, `node scripts/check-package.mjs`.

## 독립 읽기 전용 검토

범위76cc0af..5c03f5c의 검토1회: Critical/Important/Minor 없음. 검토자가 시작시각11/11, immutable diff check, source/dist SHA256 일치를 독립 확인했고 checkout은 변경하지 않았다. 실제 설치본 검사 단계로 진행 가능하다는 판정이며 merge/전체 기능/PR 승인서는 아니다.

검토자의 sandbox 전체suite는107PASS/2FAIL이었다. `portable build contains referenced vendor and its license but not backups`, `build refuses a target outside its repository dist directory`가Windows TEMP realpath EPERM으로 본래package assertion 전에 실패했다. 이 실행을PASS로 표시하지 않는다. 작성자의 같은현재후보 전체suite는 앞서 문서화한 경로권한 제한 밖에서109/109 PASS했고, 검토자도 해당현재 로그를 읽었다. product의경로검증을약화하거나sandbox 회피용변경을추가하지 않았다.

검토 제외 범위에 대한 작성자 판단: 실제hover 위치/클리핑·SPA·cache는 수동새로고침 후 필수 수용 항목으로 유지한다. 미래DOM/동일구조 충돌은 현재 재현 결함이 아닌사이트 변경 위험으로 남긴다. 이미주석된DOM 노드의다른VOD 재사용·기존timeout/cache상한·React 메타데이터 모호성은 이번패치의새회귀로확인되지 않았으나실제설치본 검사에서관찰할 경계로 남기고PASS로 합산하지 않는다. 기존조회계약을 추측으로 바꾸지 않으며, 전체브랜치/모든기능/PR 준비 여부는 원래계획의미완료 조건을 유지한다.

## 실제 설치본 수용 — 사용자 새로고침 후

사용자가5c03f5c 제품 코드/eaaeac6 기록 후보의 확장 새로고침을 완료했다. 별도 검사 탭에서임시product JS/CSS 없이 실제native hover를 검사했다.

- 라이브 시청자 수에서 한국어‘라이브 시작’과 이전에 확인한openDate가 표시됐고,pseudo-element content/visibility/hover 및캡처에서 실제표시를 확인했다. 경과시간span에는주석이없었다. 초기player 생성에따른generation 정리로처음툴팁이제거된뒤,안정된player에서실제이탈→재진입으로다시표시됐다. focus 변경만으로는pointer가이탈하지않아재입력만으로표시되지않는과정도구분했다.
- 라이브→전체방송 이동후 현재annotation0/owned player controls0을확인했다. muted native miniplayer는계속재생했으며사용자의시청탭은조작하지 않았다.
- 홈의현재VOD 날짜에서기존API의liveOpenDate와일치하는한국어툴팁/content/visible을확인했다. 정보/area/card ancestor의overflow는visible이었다. 해당VOD 전용PerformanceObserver의실제조회는1회였다.
- 같은문서의홈→목록 전환에서generation2→3,이전노드tooltip=null/current annotation0을확인했다. 홈복귀후날짜클릭이의도와다르게채널이동을일으켜그경로를의도한홈수용으로세지않았다. 홈URL을다시확정하고날짜의실제hit-test/좌표를확인한뒤,지원되는CDP mouseMoved로이탈→재진입했다. generation6/새노드(sameNode=false)/sameDocument=true에서동일VOD tooltip visible,조회누계1회유지로캐시재사용을확인했다.

캡처가2회5초timeout과지원되는동일탭CDP 캡처의15초timeout으로실패해VOD screenshot 수용은보류했다. 다른전송/extension origin으로우회하거나새도구를설치하지 않았다. 성공한라이브캡처는채팅을제외한공개방송정보영역만ignored `output/acceptance/start-time-live-installed-5c03f5c.png`에저장했고실제툴팁표시를직접확인했다. VOD의DOM/content/overflow 증거를캡처성공으로표시하지 않는다.

진단observer.disconnect/Symbol 제거/포커스정리를확인하고검사용탭을닫았다. 라이브검사때잠시native mute를사용했으며주native player를원래unmuted로복원한뒤닫았다(별도native preview media는muted 유지). 저장된extension 옵션은바꾸지 않았고coordinator를중복주입하지 않았다.

이번선택자복구의기본installed live/VOD 표시·재진입·SPA정리·새노드cache 재사용은수용한다. 이미주석된동일DOM의다른VOD 재사용/모든클리핑·모드/bfcache 조합과전체기능수용은여전히검사범위를넘으므로PASS로합산하지 않는다. PR을아직열지 않는다.
