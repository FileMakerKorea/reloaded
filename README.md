# RELOADED

**화면에서 선택하고 고친 뒤, 실행으로 바로 확인하는 로컬 개발 프로토타입.** React/TypeScript/Vite + PostgreSQL, 선택적 Electron shell. 운영 배포는 수행하지 않았습니다.

## 한 번에 실행

필요: Node.js 22.12 이상, npm, Git, PostgreSQL 16의 `initdb`, `pg_ctl`이 PATH에 있어야 합니다. macOS arm64의 Node 26.4.0 / PostgreSQL 16.14에서 검증했습니다.

```sh
cd /Users/jedi/DEV/reloaded-prototype
npm ci
npm start
```

다른 위치에 clone했다면 첫 줄의 경로를 바꾸세요. `npm start`는 기존 업무 DB와 분리된 `.local/postgres`, 포트 **55432**, DB `reloaded_dev`를 준비하고 로컬 앱을 시작합니다. 포트가 이미 사용 중이면 기존 서비스를 중단하지 않고 오류를 보고합니다. 비밀번호는 임의 생성하여 `.local/db-config.json`에 0600 권한으로 저장하고 Git·번들에 포함하지 않습니다.

- 편집기: **http://127.0.0.1:5173**
- 실행 앱 별도 확인: `npm run build` 후 별도 터미널에서 `npm run preview` → **http://127.0.0.1:4173**
- Electron: 서버를 켠 상태에서 `npm run desktop`. 설치 스크립트가 제한된 npm 환경에서는 `node node_modules/electron/install.js`로 공식 Electron 바이너리를 준비합니다. 서명 설치 패키지는 아직 없습니다.
- DB만 중지: `npm run db:stop`. 앱 서버는 해당 터미널에서 Ctrl+C.
- 성능 실험: http://127.0.0.1:5173/?bench=1 → 전체 측정 시작.

## 다음 날 다시 실행

이 폴더에 의존성이 설치되어 있으면 `npm ci`를 매번 반복할 필요는 없습니다.

```sh
cd /Users/jedi/DEV/reloaded-prototype
npm start
```

실행 앱도 볼 때는 다른 터미널에서 같은 폴더로 이동해 `npm run build && npm run preview`를 실행합니다. 이미 5173/4173 서버가 켜져 있으면 해당 주소를 그대로 열고 중복 실행하지 마세요. 종료한 터미널·재부팅 후에는 위 명령으로 다시 시작합니다. 2026-09-26 실제 개발 서버 종료 후 `npm start` 재실행과 기본 320×48 시연 상태 복원을 확인했습니다.

## 5분 시연

1. 오른쪽 **실행 환경 → 격리 개발 DB 연결**. DB를 아직 만들지 않았다면 **격리 개발 DB 준비·시작**을 먼저 누릅니다. 실제 연결 결과가 표시됩니다.
2. 수정 모드에서 고객명 입력창을 클릭합니다. 오른쪽·아래·모서리 핸들을 끌거나 너비/높이 숫자를 바꿉니다. 객체 자체를 끌면 8px 그리드와 가까운 객체에 정렬됩니다.
3. **객체 복제**, **되돌리기**, **다시 실행**으로 새 UUID와 복원을 확인합니다. 복제된 입력창은 같은 업무 필드에 연결됩니다.
4. 일반 클릭은 선택입니다. **⌘+클릭(macOS) 또는 Ctrl+클릭**으로 버튼을 실행합니다. 등록 도움말 팝업을 열고, 수정 모드에서 그 안의 확인 버튼도 선택·편집할 수 있습니다.
5. **저장**, **변경 확인 → 디스크에서 다시 열기**로 크기·위치 지속을 확인합니다. 다시 열기는 미저장 변경을 버립니다. 동시 수정이 있으면 저장을 거부하며 조용히 덮어쓰지 않습니다.
6. **실행**으로 전환합니다. 핸들이 사라지고 수정한 크기를 유지합니다. 합성 고객명/전화번호를 입력하고 저장 → 메뉴 **고객 목록**에서 실제 DB 결과를 확인합니다.
7. **기능 요청 → 연결 확인**으로 기존 로컬 Codex 상태를 조회합니다. 요청문과 선택 객체의 ID·종류·이름만 전송합니다. **변경안 요청**은 실제 App Server 응답을 보여주며 자동 코드 적용을 주장하지 않습니다.
8. `npm run build`와 `npm run preview` 후 4173 주소를 엽니다. 이 빌드에는 편집기·편집 metadata JSON 의존성·Codex 패널이 없습니다.

현재 예제는 로컬 데모용이며 실개인정보를 넣지 마세요. 합성 검증 레코드가 남아 있을 수 있습니다.

## 프로젝트와 기존 백엔드

**실행 환경 → 프로젝트 경로 → 경로 열기**로 기존 폴더를 엽니다. `.reloaded/project.json`이 있으면 편집 모델을 읽고, 없으면 프로젝트 환경만 확인합니다. **Git 가져오기**는 GitHub HTTPS 저장소를 `.local/imports/선택이름`에 clone합니다. 인증은 기존 Git 설정을 사용하며 토큰 입력/출력을 하지 않습니다. 임의 install/build 스크립트나 Git hook을 실행하지 않습니다.

Java/Spring 프로젝트는 `pom.xml`/`build.gradle`을 감지하고 기존 소스를 보존합니다. 로컬 8080 서버의 `GET /api/customers → [{id,name,phone}]`, `POST /api/customers {name,phone} → {id}` 계약으로 연결하는 어댑터가 있습니다. 기존 프로젝트의 실행/인증/트랜잭션은 기존 서버 책임입니다. 실제 Spring 프로젝트 연결은 미검증이며 모의 계약검사를 통과했습니다. 임의 Java/React 코드를 자동으로 편집 모델로 변환하지 않습니다.

프로젝트 전환은 이전 DB 연결을 해제합니다. 직접 DB 설정은 loopback PostgreSQL 연결 확인·코멘트 조회만 허용하고 예제 쓰기는 격리 개발 DB에서만 가능합니다. 고객 예제는 `.reloaded/project.json` 형식이 필요한 범위로 한정됩니다.

## MCP 연결

공식 MCP SDK stdio 서버이며 도구는 `project_read`, `object_patch` 두 개입니다. 셸 실행·SQL 실행·배포 도구는 없습니다. 실행 경로와 프로젝트 경로를 고정하여 Codex에 등록할 수 있습니다.

```sh
codex mcp add reloaded --env RELOADED_PROJECT=/Users/jedi/DEV/reloaded-prototype/examples/customer -- node /Users/jedi/DEV/reloaded-prototype/node_modules/tsx/dist/cli.mjs /Users/jedi/DEV/reloaded-prototype/server/mcp.ts
```

이 명령은 **사용할 때 직접 등록**하는 안내이며 작업 중 전역 Codex 설정에 서버를 자동 추가하지 않았습니다. 변경 예: `object_patch`에 객체 `id`, 현재 `expectedRevision`, `patch:{"w":360,"h":56}`를 전달하면 모델만 원자적으로 저장됩니다. UI는 디스크에서 다시 열어 확인합니다. 프로젝트 경로를 잘못 설정한 MCP와 UI를 함께 사용하지 마세요.

MCP는 AI 대화 실행기가 아닙니다. UI 내 제안은 Codex App Server를 사용하며 `codex login`으로 기존 사용자 인증이 필요합니다. 2026-09-26 실제 로컬 인증·합성 요청 성공을 확인했습니다. 사용 가능한 모델/요금제는 해당 사용자 계정 설정을 따릅니다.

## DB metadata

관리 정본: `reloaded_meta.identity` / `counter`. 코멘트를 먼저 분석하고 코드만으로 용도를 추측하지 않습니다. 삭제된 코드 재사용을 하지 않고 UUID Identity와 레코드 PK를 구분합니다.

```sh
node --import tsx scripts/metadata.ts export
node --import tsx scripts/metadata.ts rename UUID 현재버전 '표시 이름' '용도'
```

rename은 격리 DB 관리 테이블과 COMMENT를 트랜잭션 변경한 후 예제 JSON 스냅샷을 내보냅니다. 실제 UUID/버전은 `examples/customer/.reloaded/db-metadata.json`을 확인하세요. Git 복원/병합과 DB 간 자동 reconciliation은 미구현입니다. `src/query.ts`는 제한된 SELECT AST/이름 표시용이며 범용 SQL parser가 아닙니다. 타입 변환 실패 `???`는 원본을 보존하는 화면 상태이며 실제 타입 변경/데이터 파괴를 수행하지 않습니다.

## 검증 명령과 문서

```sh
npm run typecheck
npm test
npm run verify:db
npm run verify:mcp
npm run verify:codex
node --import tsx scripts/verify-security.ts # 5173 서버 필요
npm run build
npm run licenses
```

- [설계 결정과 구현 한계](docs/architecture.ko.md)
- [검증 결과·성능·남은 과제](docs/verification.ko.md)
- [한국어 법적 쟁점 보고서](docs/legal-risk-review.ko.md)
- [검증 기준](docs/validation-plan.ko.md), [철학](docs/philosophy.md)
- [실제 의존성 목록](docs/evidence/licenses.json), [제3자 고지](THIRD_PARTY_NOTICES.md)

제한: 반복 목록은 레코드 ID 선택/실행만 지원하고 템플릿 직접 편집은 지원하지 않습니다. 범용 소스 역매핑, 반응형 자동 재구성, 다중사용자 권한, 임의 DB migration, 상용 Electron 패키징, 운영 인증·배포는 미구현입니다. 법적 보고서는 사전 위험 검토이며 상용 출시의 비침해/상표 사용 가능성 판정은 아닙니다.
