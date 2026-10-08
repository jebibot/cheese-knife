# 홈 추천 방송 숨김 복구 — 기본 설치본 ON/OFF 수용

2026-10-08. 사용자가 홈 추천 영역만 숨기고 팔로잉·다시보기·다른 페이지는 보존하는 제한 설계를 ‘검증 승인’했다. 작업 기준은 `982bcc0`, 복구 시험판 v2.13.2다. 전체 기능 정상 판정이나 한글 PR 승인서는 아니다.

## 원인과 수정 범위

현재 일반 홈(`/`)에서는 옛 `home_recommend_live_container__` 타깃이0개이고, section의 직접 자식인 `_grid_`/`_is_two_columns_` 추천 grid는1개다. 팔로잉·최근 다시보기의 `_list_`/`_type_vod_` 영역은2개였다. 옛 CSS로 현재 추천 grid를 숨길 수 없는 것이 원인이다.

- coordinator가 설정 준비 후 정확한 `/` 경로의 `#layout-body`에만 `data-knife-home="1"`을 표시한다. 다른 탐색·장르 홈·VOD·제외 경로는 표시하지 않는다.
- route/root 소유 scope가 바뀌거나 문서를 최종 해제하면 본인이 표시한 값만 제거한다. persisted bfcache는 보존한다. native subtree를 `.knife-owned`로 표시하지 않으므로 기존 DOM 관찰을 차단하지 않는다.
- 현재 반응형 보완 후보의 `hide-recommended-live.css`는 표시된 홈 루트의 swap/content/direct section/direct grid만 숨긴다. 최초5a4a7b9 후보는 two-column modifier에도 의존했으나 아래 설치본 검사에서 좁은 화면 FAIL이 확인돼 교체했다. 옛 추천 선택자도 보존한다.
- 설정 키·저장값·manifest·권한·vendor·컴프레서·미리보기는 변경하지 않는다. 화면 표지는 공개 DOM의 시각적 scope이며 인증 경계가 아니다.

숨기는 것은 **상단 일반 추천 방송 grid**다. 별도의 편집/행사 ‘추천 콘텐츠’, 프로모션, 팔로잉·최근 다시보기는 보존한다. 장르별 `/home/...` 화면의 추가 추천 구성까지 복구했다고 주장하지 않는다.

## 회귀와 빌드 검증

- production coordinator 검사3개 RED→GREEN: exact home/다른 route, layout root 교체·detached marker 정리·홈 재진입, persisted pagehide/pageshow와 최종 해제.
- 실제 CSS 엔진 검사3개 추가: 현재 추천만 숨김/팔로잉·VOD·다른 grid·nested grid·외부 영역 보존, 표지 없는 route 보존+legacy 지원, 스타일 제거 원복. 첫 현재 추천 사례는 기존 CSS에서 block≠none으로 FAIL했다. 나머지 보호 사례는 기존 동작의 characterization도 포함한다.
- native CSS 전체36/36, Node 전체101/101 PASS. `node scripts/build.mjs`와 source/dist 패키지 v2.13.2/20 entry resources PASS. 수정 inject.js와 CSS의 source/dist SHA256 일치, diff check PASS.
- 작성자 자체 검토: 기존 route-owner 정리 경로를 사용해 새 observer/타이머를 추가하지 않고, config 변경/SPA/제외 경로/문서 수명에 따라 scope가 정리된다. 첫 추천의 위치를 임의 nth-child로 추측하지 않는다. 앞선 전체 브랜치 독립 검토를 이번 후속 변경의 독립 승인으로 재사용하지 않는다.

재현: `node --test tests/*.test.cjs`, `node scripts/check-styles.mjs --chrome`, `node scripts/build.mjs`, `node scripts/check-package.mjs`. 브라우저 CSS 진단은 Node suite와 별도다.

## 실제 홈 A/B — 임시 표지/CSS 검사

별도 사용자 Chrome 홈 탭에서 현재 설치본의 홈 표지가null인 것을 확인했다. 새 product JS가 이미 실행됐다고 주장하지 않고, 임시 표지와 source CSS를 적용해 소비 영역을 검사했다.

| 영역 | 적용 전 | 적용 중 | 원복 후 |
| --- | --- | --- | --- |
| 상단 일반 추천 방송 | block/500.875px | none/0px | block/500.875px |
| 팔로잉 채널 라이브 | block/338.9375px | 동일 | 동일 |
| 방금 놓친 라이브 다시보기 | block/425.9375px | 동일 | 동일 |

숨긴 section의 공간도 제거돼 아래 목록이 위로 이동했다. 편집 추천 콘텐츠·행사/프로모션 영역은 보존됐다. 검사 후 style 제거·기존 marker null 복원·진단 Symbol 제거를 확인하고 탭을 닫았다. 사용자 시청 탭·저장 옵션은 바꾸지 않았다. screenshot은 ignored `output/acceptance/home-recommendation-hidden.png`에만 저장한다. 채팅·쿠키·토큰·signed URL·개인화 목록 데이터는 공개 기록/fixture에 저장하지 않았다.

## 설치본 수용 — 5a4a7b9

사용자가 새로고침/옵션ON을 완료한 뒤 실제 설치본을 검사했다. 임시 CSS/marker 주입 없이 일반 홈의 자동 marker=1, 추천 display:none/height0, 팔로잉338.9375px/최근 VOD425.9375px 보존을 확인했다. 홈→전체 방송(`/lives`)의 실제 링크 이동에서 같은 문서 내 현재/이전 root marker=null로 정리됐다. 홈 로고의 포인터 click은 이동하지 않아 성공으로 기록하지 않았으며, 키보드 Enter로 홈 복귀한 뒤 같은 문서에서 marker=1/추천 숨김/두 목록 보존을 확인했다. 진단 Symbol과 포커스를 제거했다.

반응형 수용은 **FAIL**이다. 2560px에서는 직접 UL이 `_grid_… _is_two_columns_…`여서 숨겨지지만,1200px에서 native React 재렌더 후 `_is_two_columns_…`가 제거되고 `_grid_…`만 남는다. marker=1은 유지되는데 추천 section이 block/387.875px로 다시 표시된다. 팔로잉284.421875px/최근 VOD369.421875px는 보존됐다. resize 직후의 과도기 DOM이나 타깃0개를 PASS로 세지 않는다. 두 번째 별도 홈 탭에서도 넓음→좁음→넓음→좁음의 클래스/표시 변화로 원인을 확인했다.

5a4a7b9 검사 당시 공개 DOM에서 일반 추천의 경계는 `_swap_…`의 직접 자식 `_content_…` 안의 직접 section/direct `_grid_…`였다. 당시에는 이 경계로 narrow 선택자를 한정하는 CSS 후속 변경을 제안하고 승인 전 구현을 중지했다. 이후 승인된 구현/검증은 다음 절에 기록한다. 임의 첫 section/nth-child나 모든 페이지 grid를 숨기는 변경은 하지 않는다.

임시 viewport는 reset하고 agent 검사 탭을 닫았다. 사용자 시청 탭/확장 저장 설정은 바꾸지 않았다. 설치본 성공/좁은 화면 실패 screenshots는 ignored `output/acceptance/home-installed-5a4a7b9.png`, `home-narrow-failure-5a4a7b9.png`에만 저장했다. 기존 저장 옵션OFF 수용도 아직 미검증이다.

## 승인된 반응형 보완 후보

사용자가 좁은 화면 보완 설계를 승인했다. 기존 넓은 화면 전용 선택자를 `#layout-body[data-knife-home="1"] [class*="_swap_"] > [class*="_content_"] > section:has(> ul[class*="_grid_"])`로 교체했다. 홈 추천 콘텐츠의 직접 경계 안에서만 grid를 숨기며 화면 폭에 따른 two-column modifier에 의존하지 않는다. legacy 선택자는 그대로다. JS·설정·권한·vendor 변경은 없다.

- 기존 native fixture에 실제 관찰한 swap/content 경계를 반영했다. production CSS 검사4개 추가: modifier 제거/복원,경계 밖 grid 보호,표지 없는 narrow route 보호,스타일 제거 시 공간 복원. 첫 두 사례는 수정 전 각각 block≠none/none≠block의 기대한 실패(38/40)였고 최소 CSS 변경 뒤40/40 PASS. 보호/원복 두 사례는 기존 동작 characterization이다. 테스트가 native React breakpoint 자체를 구현한다고 주장하지 않으며,관찰한 DOM 변화를 fixture에서 재현해 CSS 소비 결과를 검사한다.
- 사용자 Chrome의 별도 실제 홈에서1200px 재렌더 완료 후 기존 설치본 block/387.875px를 확인했다. 후보 source CSS를 임시 적용하면 none/0px;팔로잉303.421875px/최근 VOD369.421875px는 동일했다. 이어2560→1200→2560에서 각각 실제 modifier 유무를 기다려 추천 none/0px와 두 목록 block을 확인했다. 넓은 화면 두 목록은338.9375px/425.9375px였다.
- 임시 CSS 제거 후1200px 추천 block/387.875px로 복원,temporary style0,원래 자동 marker=1을 확인했다. viewport reset/검사 탭 닫기를 완료했다. 저장 옵션과 사용자 시청 탭은 바꾸지 않았다. 임시 검사 캡처는 ignored `output/acceptance/home-narrow-candidate.png`다. 첫 주입 시 문자열 구문 오류는 수정해 재실행했으며,오류 실행을 PASS로 합산하지 않았다.
- 전체 Node101/101,native CSS40/40,build/source+dist package v2.13.2/20 entry resources,diff check PASS. CSS source/dist SHA256은 `075DE712F82E4FA755FCE28A0428C6349E971E611FAF5E3F86DE126FA35E5916`으로 동일하다.

새 후보 검증은 임시 source CSS 검사이며 새 dist의 실제 등록/저장 옵션 수용이 아니다. 앞선5a4a7b9 설치본 좁은 화면 FAIL을 삭제하거나 새 설치본 PASS로 바꾸지 않는다.

## 독립 읽기 전용 검토

범위 `bcea12e..08ef30d`의 독립 검토1회:Critical/Important 없음,native CSS40/40 및 immutable diff check를 별도로 재실행했다. Minor는 초반 문서의 two-column/‘미구현’ 현재형 설명이 최신 후보와 혼동된다는 점이었으며,현재 선택자와 역사적 진단 단계로 구분해 수정했다. 제품 코드 추가 보완은 요구되지 않았다. 설치본 수용으로 진행 가능하다는 판정이며 전체 수용/merge/PR 승인은 아니다.

검토 경계에 대한 작성자 판단:새 설치본/저장 옵션OFF는 필수 다음 단계로 유지하고,다른 기능/전체 화면/전체 브랜치는 기존 전체 acceptance 계획에 남긴다. 같은 swap/content 경계에 향후 다른 직접 grid가 생기는 경우는 현재 재현 결함이 아닌 DOM 변경 위험으로 기록한다. 편집/프로모션 fixture 추가는 선택적 권고이며 이번 실제 페이지 보존 관찰로 대체하되,합성 fixture로 해당 콘텐츠 자체가 검사됐다고 주장하지 않는다. 첫 캡처가 재관찰 전 렌더를 보여 재캡처했고,최종 캡처에서 추천 grid 제거·편집 추천/팔로잉 보존을 직접 확인했다. 기존 검토에서 제외한 항목을 전체 PASS로 바꾸지 않는다.

## 설치본 기본 수용

사용자가08ef30d 제품 코드/154a1e3 기록 후보의 확장 새로고침을 완료했다. 임시 CSS0의 실제 설치본에서2560→1200→2560 재렌더를 검사했다. 각각 추천none/0px/marker1,팔로잉·최근VOD block을 확인했다. 좁은 화면은303.421875px/369.421875px,넓은 화면은338.9375px/425.9375px를 유지했다. modifier가 제거된 후에도 숨김이 유지되어 앞선 좁은 화면 FAIL은 이 ON 검사 범위에서 해소됐다.

실제 키보드 링크로 홈→lives→홈 SPA 이동:같은 문서에서 generation2→3→4,목록 화면의 기존/current marker=null,홈 복귀 후marker1/추천none/0px/두 목록block을 확인했다. 복귀 직후 추천 DOM이 아직 없는 과도기 결과를 PASS로 세지 않고,실제 콘텐츠 로딩 후 다시 검사했다. 진단 Symbol/포커스/viewport를 정리하고 검사용 탭을 닫았다. 저장 옵션은 변경하지 않았다. 최종 캡처는 별도 홈에서active BODY/임시CSS0/1200px를 재확인해 검색 기록이 노출된 초기 캡처를 교체했다. ignored `output/acceptance/home-responsive-installed-08ef30d.png`에만 저장한다.

사용자가 저장 옵션OFF를 적용했다. 기존 handoff 홈 문서는 아직none/0이어서 즉시 PASS로 판정하지 않고 해당 agent 홈만 reload해 저장 설정을 반영했다. 실제2560px 추천block/500.875px,1200px native modifier 제거 후block/387.875px로 복원됐고 두 목록block/임시CSS0을 확인했다. 사용자에게 원래ON 상태 복원을 요청했고 ‘복원완료’ 답변 후 홈 reload에서marker1/추천none/0/임시CSS0을 다시 확인했다. viewport reset/검사 탭 닫기를 완료했다. OFF 검사 screenshot은 ignored `output/acceptance/home-responsive-off-installed-08ef30d.png`다. 현재 상태는ON이며 agent가 저장 설정을 직접 쓰지 않았다.

이로써 이번 일반 홈 기능의 설치본 ON/OFF,좁음↔넓음 재렌더,기본 SPA 정리·재적용은 수용했다. 전체25스타일 조합이나bfcache 전체 수용으로 확대하지 않는다. 확장 설정 페이지 직접 접근 제한은 그대로이며 우회하지 않았다. 전체 기능/PR 완료 조건은 아직 충족하지 않았다.

앞선 ‘검증 승인’은 수정 범위 승인으로만 해석했다. 이후 별도 사용자 답변‘전체화면-esc 정상동작’으로 직접 전체 화면 진입/복귀를 확인했다. 자동 입력 성공이나 모든 모드/스타일 조합의 전체 화면 수용으로 합산하지 않는다. 삭제 채팅 지원 제한·허용-DVR/광고 안전성·시작 시각/후원 유형·나머지 스타일 조합/전체 수용은 계속 미완료다. 한글 기여 PR을 아직 열지 않는다.
