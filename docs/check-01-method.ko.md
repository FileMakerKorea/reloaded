# CHECK-01 재현 방법

## A. 동일 입력창 통제 실험

`npm run dev` → `http://127.0.0.1:5173/?bench=1` → 전체 측정 시작.

100/1000/10000 객체, baseline/runtime/editor 각 3회, 동일 React 개발 번들에서 검사한다. baseline과 runtime은 동일 입력 요소, editor는 stable-ID/source data 속성·클릭 핸들러·선택 핸들 3개를 더한다. 이는 오버헤드 요인을 분리하는 microbenchmark이며 실제 전체 편집기와 동일하지 않다. 렌더·단일 width/value 변경에서 두 번 requestAnimationFrame까지 포함한다. 순차 실행, 강제 GC 없음, heap 값은 누적·다른 객체의 영향이 있으므로 모드별 순수 추가 메모리로 뺄셈하지 않는다. 결과는 페이지에 JSON으로 표시된다.

## B. 실제 제품 렌더러 검사

```sh
npm run perf:fixtures
# 각 100 / 1000 / 10000에 대해 반복
RELOADED_PROJECT=.local/perf/100 RELOADED_MEASURE=1 npm run build
```

`npm run preview`가 실행 중인 4173 페이지를 새로고침한다. 측정 전용 빌드에서 DOM의 `html[data-measurement]`에 렌더 시간·객체수·객체 DOM 수·heap을 남긴다. 실제 `scripts/build.ts`가 생성한 정적 React 결과물이며 편집/metadata 모듈이 없는 표준 React 코드다. 시작 기준은 모듈 평가 이후, React mount~2 RAF까지여서 JS 다운로드/parse 비용은 포함하지 않는다. `docs/evidence/build-숫자.json`에 실제 bundle/gzip과 모듈 목록을 저장한다.

편집기는 `http://127.0.0.1:5173/?measure=1`에서 환경 패널로 `/절대경로/.local/perf/숫자`를 연다. load 시작은 `/api/project` 요청 직전으로 파일 읽기/검증/JSON/React render~2 RAF까지 포함한다. 따라서 runtime 숫자와 엄밀한 동일 시작점 비교는 아니다. 같은 DOM 3개(input wrapper/label/input)씩을 사용하고, 선택 시 tag+핸들 총 4개가 더해진다. 첫 객체 '측정 0' 선택 후 Inspector 너비를 80→88로 바꾸어 전체 편집기의 실제 Zod 검증·history·재렌더 비용을 측정한다. 각 변경 후 `html[data-measurement]`의 operation=geometry와 객체수를 확인한다. 다음 파일을 열기 전 undo하여 원본 상태로 돌린다.

현재 B는 크기별 단일 로드/단일 대표 변경을 보조 측정했다. p95나 기기 일반화에 사용하지 않는다. 반복 통계는 A에만 있다. CPU trace의 JS parse/style/layout 세부 시간은 미측정이다. 생성 bundle 크기와 DOM·메모리·화면 반응을 혼동하지 않는다.

마지막에 반드시 기본 빌드를 복구한다.

```sh
npm run build
```

실제 예제에서는 7개 편집 객체 중 현재 페이지 5개만 렌더된다. 10,000개 데이터 레코드와 10,000개 개발 객체는 다르다. 현재 목록은 DB 1000개 제한과 스크롤만 있고 가상화는 없다. 따라서 10,000개 전체 렌더는 실용 권장값이 아니라 경계 실험이다.
