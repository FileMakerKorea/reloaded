# 구현 전 검증 기준 v1

시작: 2026-09-26 KST. 기준 main: 16b8129235bf35ad411cec731ddc93cbc4027a2d.
작업: codex/reloaded-prototype, /Users/jedi/DEV/reloaded-prototype. origin/main fetch 후 독립 worktree 생성, ancestor 확인 성공. 기존 작업 보존.

저장소 grilling-loopy-90 스킬 적용. 첫 검증 이후 수정·재검증 최대 3회. 점수보다 필수 조건을 우선하며 환경 미확인은 통과로 바꾸지 않는다.

| 항목 | 배점 | 통과 기준·증거 |
|---|---:|---|
| 핵심 편집 | 25 | 선택/실행 분리 5, 3방향 resize·숫자 5, 이동·snap 5, 복제 새 ID 5, undo/redo·저장/재열기 5. 실제 UI와 모델 테스트 |
| 연결 | 20 | 프로젝트 열기·Git 가져오기 5, 격리 PostgreSQL 실제 연결·CRUD 5, MCP 실제 호출·지속 patch 5, Codex 실제 상태 및 요청 성공/오류 진실성 5 |
| 경계·회귀 | 20 | 반복·중첩·스크롤 선택 5, 화면·팝업 전환 5, 동시 저장 충돌 5, 잘못된 입력·원본 보존 5 |
| 빌드 | 10 | TypeScript+test 5, 운영 editor·metadata 제거 검사 5 |
| 성능 | 10 | 100/1000/10000 baseline/editor/runtime 비교 5, 1000 객체 대표 조작 p95<100ms 측정 5 |
| 보안·법 | 15 | loopback·origin·입력·비밀 분리 5, DB identity/트랜잭션/코멘트 5, 1차 자료 법적 보고서·실제 라이선스 목록 5 |

객관 100점, 주관 가산 없음. 필수: 빌드, 핵심 편집 흐름, 저장 무결성, 보안, 실제 브라우저, DB 연결 검증. 세부 검증 미실행은 0점. 90점 이상이어도 필수 미확인이면 검증 보류. 성능은 동등 DOM/동작 baseline 대비 비교하며 heap/trace 불가 항목은 명시한다. 법적 결론은 FTO 의견이 아니며 검색 누락을 비침해로 간주하지 않는다.
