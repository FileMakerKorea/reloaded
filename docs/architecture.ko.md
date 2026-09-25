# 아키텍처와 결정 기록

## ADR-001: 로컬 브라우저가 주 실행 환경

React + TypeScript + Vite, loopback Express, 선택적 Electron shell, PostgreSQL을 사용한다. Electron은 nodeIntegration=false, contextIsolation=true, sandbox=true이며 임의 창/외부 탐색을 막는다. 편집과 실행은 같은 업무 컴포넌트를 사용한다. 기존 Spring은 `CustomerAdapter`의 JSON 계약으로 연결한다. 기존 프로젝트 소스는 자동 재작성하지 않는다.

이유: 실행 코드는 표준 웹 기술을 유지하고 편집 계층은 개발 환경에만 존재해야 한다. Electron 배포 패키지·자동 업데이트·서명은 별도 과제다. 독립 프로젝트의 설치 스크립트를 가져오기 직후 실행하지 않는다. 환경 패널은 감지 파일과 Spring 연결 상태를 실제 확인하며, 허위 “실행 중” 표시를 하지 않는다.

## ADR-002: ID → 모델 → 생성 코드

`examples/customer/.reloaded/project.json`의 UUID가 편집 객체 Identity다. DOM wrapper의 data-object-id는 UUID를, data-source는 파일과 stable ID 참조를 표시한다. 배열 인덱스로 객체를 식별하지 않는다. 업무 레코드의 UUID는 data-record-id에 별도로 표시한다. 복제는 새 객체 UUID를 발급하되 같은 데이터 binding을 유지한다. 같은 필드에 연결된 두 입력창은 같은 값을 보여준다.

일반 클릭은 편집 객체 선택, ⌘/Ctrl+클릭은 업무 이벤트 실행. 실행 모드에는 선택·핸들이 없다. 화면을 옮기거나 팝업 상태가 바뀌면 선택을 초기화한다. 자식 label/span/input은 객체 wrapper의 이벤트 경계에서 동일 stable ID로 매핑한다. 드래그는 canvas DOMRect와 offsetWidth/Height 비율로 좌표를 계산하고 pointer capture를 사용한다. 스크롤은 client 좌표 차이와 canvas 좌표에 의해 보존된다. 임의 회전·skew·다중 CSS transform 행렬 편집은 지원하지 않는다.

현재 자유배치 canvas 내부는 절대좌표, 앱 shell은 Grid/Flex다. 모든 직접 이동을 Flex/Grid 의미로 자동 역변환한다고 주장하지 않는다. 이 한정이 위치·크기 재현성을 우선 확보하기 위한 선택이다. 8px 그리드와 6px 문턱의 근접 정렬을 쓴다. 현재 가이드선은 객체 좌표선이며 타사의 특정 동적 겹침 강조 방식을 복제하지 않는다.

## ADR-003: 작은 변경과 충돌 감지

UI undo/redo는 최대 100개 모델 스냅샷, 드래그 1회는 1개 undo 단위다. 숫자/문구 입력은 각 유효 변경이 단위다. 저장은 `expectedRevision` + 디렉터리 잠금 + 임시파일 rename. MCP와 UI가 같은 저장 함수를 사용한다. stale revision은 거부하고 다시 열기를 요구한다. 마지막 쓰기 승자로 조용히 덮어쓰지 않는다.

프로세스가 잠금 획득 중 강제 종료되면 `.reloaded/project.json.lock`이 남아 후속 저장이 거부된다. 자동으로 다른 쓰기 소유권을 추측해 잠금을 지우지 않는다. 해당 편집기/MCP 프로세스가 모두 종료되었음을 확인한 후 빈 잠금 디렉터리만 제거하고 다시 연다. 분산 파일시스템·다중 호스트 파일잠금은 검증하지 않았다.

AI가 UI 전체를 다시 생성하는 경로는 없다. `object_patch(id, expectedRevision, patch)`로 허용 속성만 검증·저장하며 코드/SQL 문자열 실행을 받지 않는다. 서버와 MCP는 파일 심볼릭 링크 및 `sources` 하위 저장을 거부한다. `sources/`는 읽기 전용이다.

## ADR-004: 운영 빌드 독립성

`npm run build`는 현재 모델을 정적 React JSX로 컴파일한 뒤 Vite로 `dist/`를 만든다. 런타임은 모델 JSON을 요청하지 않으며 editor 코드·Zod 편집 schema·MCP·Codex 패널·source 매핑·resize CSS가 포함되지 않는다. 모델의 위치/크기는 일반 style literal이고 업무 입력 id는 접근성 label용으로 남는다. stable ID 문자열이 전부 사라진다는 뜻은 아니다.

빌드 검사에서 editor 전용 문자열·metadata 파일명을 검사하고 sourcemap을 생성하지 않는다. `work/editor-build/`는 비교용 개발 기능 포함 번들이며 `dist/`와 분리한다. `server/runtime.ts`는 검증용 로컬 실행 서버로 고객 API만 제공하고 편집 API는 404다. 실제 운영용 인증/인가/테넌트 분리와 DB 배포 절차는 제공하지 않으며 운영 배포를 실행하지 않았다.

## ADR-005: 기존 DBMS를 유지

PostgreSQL의 UUID PK, UNIQUE, CHECK, 트랜잭션, row lock과 표준 파라미터 쿼리를 사용한다. `reloaded_meta.identity`가 이름·용도·physical mapping 정본이다. `counter`의 UPSERT는 scope+kind별 발급을 직렬화한다. 삭제는 deleted_at으로 표시하고 다음 코드를 발급한다. 코드를 DB 밖에 공개하는 시점은 commit 이후다. 롤백된 미확정 발급은 외부 Identity가 아니다. 운영 DBA가 관리 테이블/counter를 임의 수정하는 것까지 권한으로 차단한 제품은 아니다.

DB COMMENT를 먼저 조회한다. 초기 schema와 이름 변경 함수는 관리 테이블의 설명으로 COMMENT를 만든다. `scripts/metadata.ts rename`은 expected revision과 row lock으로 rename+COMMENT를 트랜잭션 처리한 뒤 Git용 JSON을 내보낸다. DB commit 후 파일 쓰기 실패는 DB를 정본으로 `export`하여 복구한다. DB와 Git에 걸친 원자적 분산 트랜잭션을 주장하지 않는다. Git에서 과거 JSON을 되돌린다고 DB가 자동 되돌아가지 않는다. 병합·복원 reconciliation UI는 미구현이다.

`src/query.ts`는 제한된 SELECT AST의 stable UUID 참조를 물리 SQL 및 사람 이름 표시로 각각 컴파일한다. SQL 실행문 이름은 rename으로 변하지 않는다. 필드 유실·중복 표시 이름은 오류를 내고, 임의 SQL을 문자열 치환하지 않는다. 일반 SQL parser와 DB 엔진은 구현하지 않았다. `toNumber`는 display 변환용 결과에 원본·오류를 보존하며 `???`를 숫자 필드에 쓰지 않는다. 실제 ALTER COLUMN 타입 마이그레이션은 제공하지 않는다. 기존 DB PK/FK·인덱스·튜닝을 독자 규칙으로 대체하지 않는다. Oracle은 지원하지 않는다.

## ADR-006: MCP와 추론·인증 분리

`server/mcp.ts`: 공식 MCP SDK의 stdio transport, project_read와 object_patch만 노출. OS 프로세스 권한과 고정 프로젝트 root 경계. 원격 공개 HTTP MCP/OAuth 서버는 제공하지 않는다.

`server/codex.ts`: 설치된 Codex App Server stdio JSON-RPC의 initialize/initialized → account/read → thread/start → turn/start → agentMessage delta → turn/completed. 모델명은 기존 사용자 설정을 유지한다. 세션은 read-only/ephemeral, shell/apps/skill search/web search를 비활성화하고 상속한 MCP·플러그인도 해당 세션에서 비활성화한다. 기존 전역 설정 파일을 수정하지 않는다. tool/server 승인 요청은 거부한다. 패널은 사용자 입력과 선택 label/id/kind만 전달하고 결과는 제안 텍스트로 표시한다. 파일을 고쳤다고 자동 표시하지 않는다. 인증 토큰은 Codex가 관리하고 RELOADED 프런트엔드로 반환하지 않는다.

검증 설치본: codex-cli 0.155.0-alpha.16.4. 문서의 예시 sandbox 표기와 로컬 schema에 차이가 있어 로컬 generate-ts의 `read-only`(thread/start)와 `readOnly`(turn policy)를 사용했다. App Server는 experimental 인터페이스이므로 버전 업데이트마다 통합시험을 실행해야 한다. 로컬 로그인 상태만 확인하고 별도 구독/사업적 재판매 가능성을 추정하지 않는다.

공식 확인일 2026-09-26: [App Server](https://developers.openai.com/codex/app-server), [MCP](https://developers.openai.com/codex/mcp), [Electron 보안](https://www.electronjs.org/docs/latest/tutorial/security).

## ADR-007: 지금 제한한 범위

완료: 고객 예제 UI 직접조작, 원자적 로컬 모델 저장, 고정 JSON 계약 어댑터, 격리 DB, MCP 부분 patch, 실제 Codex 제안 호출, 모델 없는 runtime 빌드.

미구현/한정: 임의 React/Java 프로젝트의 DOM↔AST 자동 역매핑, 반복 목록 템플릿 크기 편집, 다중선택·반응형 레이아웃 역변환, 사용자별 권한·협업 편집, 완전한 SQL parser, metadata 충돌 자동 병합, 임의 DB schema 변경 UI, 타입 파괴적 마이그레이션, Oracle, 클라우드 원격 MCP OAuth, 상용 배포 패키징. 기존 Spring 어댑터는 모의 계약검사만 통과했고 실제 Java 프로젝트 연결은 미검증이다.

제품 방향: 합리적 구독과 사용자 증가 시 1인당 부담 감소, 기여 생태계는 유지한다. 이번 프로토타입은 가격표·과금 시스템·자체 오픈소스 라이선스를 결정하지 않는다.
