# 왼쪽 채팅의 라이브 화면 축소 — 설치본 발견

2026-10-08,Chrome155.0.8059.39. 사용자 확장 새로고침 후 스타일 시험에서 “화면이 없어짐” 보고. 전체 수용/PR은 미완료다.

## 앞선 후보의 설치본 결과

- Gain trusted 키보드150→155→150%,on/주 영상 재생 유지,off 복원 PASS. 저장 Gain1.5 유지.
- 팔로잉 자동 펼침42개/aria-expanded=true,sidebarRefresh/expandFollowings ready.
- VOD 자동 갱신 API6회: 관찰 시작 기준22883,52877,82875,112879,142880,172873ms. 간격29993–30004ms. observer 제거;기본 버튼 임의 클릭 없음.
- VOD timestamp36개 행/resize handle1개 관찰. 후속 reload에서는resize/left OFF,timestamp ON이라drag/left 조합 PASS로 확대하지 않음. 이전 옵션 값은 사용자에게 받지 못했고 에이전트가 확장 저장소를 덮어쓰지 않음.
- styles.html 직접 접근은 HTTP(S)만 허용하는 브라우저 정책으로 거부. 우회하지 않고 사용자 조작 요청.

## 재현 / 원인

사용자 live 영상은 존재하고 재생 중이나59×33.75px. chat353px/부모row. 영상 안쪽main._container_*는 확장 CSS로row-reverse,chat은 그main의 자식이 아니라 바깥wrapper의 sibling이었다.

CSS matched-rule 진단에서 사이트 원래main은display:flex/flex-direction:column임을 확인했다. 기존 `main[class^="_container_"]`가 실제chat row가 아닌 안쪽main도 뒤집었다. 앞선 fixture가VOD만 검사해 이live 구조를 놓쳤다.

원인 분리 임시A/B: 안쪽main을 원래column,바깥chat wrapper를row-reverse로 바꾸면 영상폭59→1963px,chat left240px/player left596px,재생 유지. A/B는 원복한 뒤 회귀 검사를 작성했다.

## 수정 후보 / 검증

- 실제chat을 직접 포함하는 `#layout-body :is(div, main):has(> :is(#aside-chatting, #vod-aside))`만 뒤집는다. 과거generic main도 직접aside가 있는main으로 제한. portrait large에도 적용.
- 새native live fixture: 안쪽main/contents/player와 별도sibling chat. 수정 전60px(기대800px) RED,후800px/바깥row-reverse/다른main column GREEN. 기존VOD와 다른CSS 보존.
- Node82/82,nativeCSS16/16,build/source·dist package PASS;left-chat source/dist SHA256 일치.

현재 사용자 시청 문서에는 **임시 CSS `knife-left-chat-hotfix`**를 적용해 영상폭1963px/왼쪽 채팅/재생을 복구했다. 계정·영구 옵션·미디어 음량/속도는 바꾸지 않았다. 페이지reload 시 없어지며,기존 잘못된CSS가 남아 있는 문서의 안쪽main을 원래column으로 되살리는 보정도 포함한다. 새확장 정식 설치본 검사 완료는 아니다.

영구 후보 설치본에는 사용자 확장 새로고침·페이지reload가 다시 필요하다. 필수 단계에서 사용자 중지 조건에 따라 멈춘다. 전체 기능/fresh-context 브랜치 검토/한글 기여PR 조건은 미완료다.
