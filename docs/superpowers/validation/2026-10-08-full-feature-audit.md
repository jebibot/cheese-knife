# 전체 기능 검증 — 진행 중

후속 설치본 결과와 live 왼쪽 채팅 축소 수정은 [별도 기록](2026-10-08-live-left-chat-regression.md)에 이어진다. 아래15개 native CSS 결과는 앞선 후보의 기록이며 최신은16/16이다. 전체 정상 판정은 여전히 미완료다.

2026-10-08, 설치 Chrome155.0.8059.39. 사용자 확인: 앞선 미리보기 지연 수정 정상 동작. 실제 설정 previewDelay=0.1초. 아래 결과는 전체 정상/출시 승인이 아니다.

## 실제 시험과 보완 후보

| 항목 | 증거 | 판정 |
| --- | --- | --- |
| Gain 키보드 | trusted ArrowRight가 native player에서 preventDefault되어150% 유지. 내부 전파 차단 임시 시험155%/재생 유지,150%·off 복원. 회귀 RED→GREEN | 후보; 설치본 재검사 필요 |
| 팔로잉 펼침 | 기본 더보기5→42개, 접기5개 복원. 기존 함수의 `50` 문자열 탐지는 현행 함수와 불일치 | 팔로잉 섹션의 native 버튼 연결 후보 |
| 자동 갱신 | 기본 팔로잉 새로고침 후 followings/live·followings API 요청을 새 PerformanceObserver로 확인. 기존 resource 목록은 버퍼 한계로 판정에 사용하지 않음 | 30초 native 갱신 후보; OFF/ON·중복·busy·제외 경로·bfcache·섹션 부재 검사 |
| iframe 팝업 | 실제 드래그 생성1개, iframe video/컴프레서 각1개. 이동+60/+50px, mouseup cursor 정리, 닫기0개 | 일반 설치본 동작 PASS |
| 팝업 해제 | 드래그 도중 닫으면 knife-dragging 잔류 RED→GREEN | 해제 보완 후보 |
| 통계 | 실제 메뉴1개,1920×1080,측정FPS60,코덱. 닫기 overlay0개/재생 유지 | 해당 설치본 동작 PASS; 비트레이트·지연시간은 알 수 없음 |
| PIP | 사이트 버튼으로 같은 주 video 진입/재생 유지/복귀 | 해당 설치본 동작 PASS |
| 전체 화면 | 버튼·좌표 입력 후 event/timeout 확인에서도 fullscreenElement=false. fullscreenEnabled=true, 해당 console 오류 없음 | UNVERIFIED; 확장/사이트/자동화 중 원인 미확정, 추측 수정 없음 |
| VOD 기본 | route=vod,1080p 재생,컴프레서1개/live 확장 빨리감기0개 | 해당 설치본 동작 PASS |
| VOD 시각 | finite playerMessageTime 확인. 기존 선택자는 nickname wrapper를 log로 오인. 회귀 RED→GREEN, 재사용 행1:01→1:02 | log 기준 후보 |
| VOD 채팅 스타일 | 실제 임시 CSS A/B 폭353→420px,글꼴14→22px,row→row-reverse. 제거 후 원복 | 크기·글꼴·왼쪽 채팅 후보 |
| 오른쪽 사이드바 | 실제 CSS A/B left0→2320px(창2560/sidebar240),padding-left240→0/right0→240. 제거 후 원복 | 현행 선택자 후보 |
| 고정 로고/프로필 | 실제 A/B mask none→있음,프로필 radius50%→0. 제거 후 원복 | 현행 선택자 후보 |
| LIVE 배지 | 홈 EM의 live/badge 클래스 확인, native fixture는 LIVE만 숨김 | 후보; 설치본 옵션 시험 미완료 |
| 스타일 등록 | 빠른 변경의 중복 등록 충돌 RED→직렬화 GREEN, 최신 선택 보존 | background 후보 |
| legacy 이관 | config 없이 t=0이면 예외 RED→GREEN | 기존 설정 보완 후보 |
| 설정 UI | 실제 HTML/JS/한국어 locale와 Chrome API 경계 double:25개 leaf 저장·다른 설정 보존·range 기본값 복원,24개 bool 스타일 ON/OFF+font offset,limited 표시 | 자동 UI 계약 PASS; 실제 확장 UI는 별도 |

별도 시험 탭을 사용했고 사용자 시청 탭은 탐색하지 않았다. Gain 저장값1.5 복원, PIP/overlay/popup/임시 CSS/변수/진단 listener·observer를 정리했다. 채팅·후원·moderation을 보내거나 변경하지 않았다. 토큰·쿠키·signed URL·채팅 본문은 보고서와 fixture에 저장하지 않았다. iframe 생성 후 한 시험 탭의 CDP가 문서 응답 대기 상태여서 그 탭은 DOM 검사만 사용했고 새 VOD 탭에서 제한 진단을 이어갔다.

## 전체 설정: 아직 남은 실제 기능 검사

- preview/livePreview/previewWidth/previewDelay/previewVolume/rightClickToUnmute/customPreview: sidebar 재생·지연은 앞선 기록/사용자 확인. 폭·음량·메인 thumbnail/custom ON/OFF 조합, route/bfcache 설치본 검사 남음.
- updateSidebar/expandFollowings/popupPlayer: 기본 사이트 연결점 확인 및 후보 자동 회귀. 새 설치본의30초 자동 갱신·자동 펼침·drag 해제 검사는 남음.
- arrowSeek/pressToFastForward: 이전 VOD ±5초·hold·속도/정지 복원 PASS 기록 유지. 허용-DVR live,광고·편집 입력·전체 OFF/ON 조합 남음. 타임머신 금지 채널을 탐색 성공 대상으로 쓰지 않음.
- brightness/contrast/saturation/gamma/sharpness: UI 저장 검사만으로 실제 SVG 출력/초기화와 GPU 조건을 PASS로 하지 않음.
- compressorDefault/threshold/knee/ratio/attack/release: 이전 사용자 소리 확인·native 합성 신호 기록 유지. 새 Gain 키보드·여러 SPA/remount 설치본 검사 남음. toggle dip/극단 설정 full-scale 초과 위험은 기존 제한 그대로.
- hideDonation/showDeleted: 현행 live controller와 blind 처리 함수 구조만 제한적으로 확인. 새 후원 이벤트 검증 미완료, 삭제 표시 JSX 제한은 미해소. VOD 동일 messageFilter controller는 발견하지 못해 지원을 추측하지 않음.
- 시각/통계/시작시각/채널 버튼: 통계 일부 PASS,VOD시각 후보. 현재 DOM 시작시각·실제 채널 버튼/SPA 검사 남음.

## 스타일25개: 아직 남은 실제 옵션 검사

| 대상 | 증거/남은 검사 |
| --- | --- |
| fit-player,volume-percentage,hide-ff,hide-comp | 실제 옵션/모드 조합 남음 |
| chat-resize,chat-font-size,chat-timestamp,hide-ranking,hide-mission,left-chat | live/VOD 후보,시각 회귀. 실제 옵션 등록·resize drag·ranking/mission·작은 화면 남음 |
| hide-offline,hide-recommended,hide-schedule,hide-sidebar-partner,hide-shortcut,right-sidebar | offline 이전 후보,right 실제 A/B+native expanded/collapsed/1100px. 실제 조합·tooltip·clip 위치 남음 |
| static-logo,hide-topics,hide-studio,auto-hide-toolbar | logo 실제 A/B,topics/studio 이전 후보. 실제 옵션·자동 숨김/포커스 남음 |
| hide-recommended-live,top-explore,hide-blocked,hide-live-badge,rectangle-profile | 홈 배지/프로필 구조와 후보. 추천·차단·탐색 타깃과 실제 옵션 조합 남음 |

타깃 없는 화면에서 query 결과0을 결함/정상으로 단정하지 않았다. 위 목록은 전체 렌더링 PASS 표가 아니다.

## 다음 게이트

전체 Node82/82,별도 system Chrome native CSS15/15,build와 source/dist 패키지 검사 PASS. 전체 브랜치 fresh-context 독립 검토와 전체 설치본 수용 조건은 미완료.

이번 후보는 사용자 확장 새로고침이 필요하다. 현재 도구의 chrome://extensions 접근 제한을 유지해 이 단계에서 중지했다. 기여 PR을 아직 열지 않았으며, 새 후보를 설치본 PASS로 바꾸지 않았다.
