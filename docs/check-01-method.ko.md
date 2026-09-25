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

현재 B는 크기별 단일 로드/단일 대표 변경을 보조 측정했다. p95나 기기 일반화에 사용하지 않는다. B의 기존 단일 표본과 별개로 아래 C에서 실제 포인터 반복 통계를 보완했다. CPU trace의 JS parse/style/layout 세부 시간은 미측정이다. 생성 bundle 크기와 DOM·메모리·화면 반응을 혼동하지 않는다.

마지막에 반드시 기본 빌드를 복구한다.

```sh
npm run build
```

실제 예제에서는 7개 편집 객체 중 현재 페이지 5개만 렌더된다. 10,000개 데이터 레코드와 10,000개 개발 객체는 다르다. 현재 목록은 DB 1000개 제한과 스크롤만 있고 가상화는 없다. 따라서 10,000개 전체 렌더는 실용 권장값이 아니라 경계 실험이다.


## C. 실제 1,000개 포인터 반복 측정

1. `npm run perf:fixtures` 후 `npm start`, `http://127.0.0.1:5173/?measure=1`에서 `.local/perf/1000`을 열고 `측정 0`을 선택한다.
2. 실제 포인터로 선택 객체 중앙을 drag(move), 모서리 핸들을 drag(xy)하는 순서를 반복한다. 현재 DOM bounding rect에서 시작 좌표를 읽는다. 이동 경로는 시작→(+8,+8)→(+16,+16), 다음 같은 동작은 부호를 반대로 한다. 이벤트를 앱 함수 호출로 대체하지 않는다.
3. 두 동작 각각 5회 워밍업 후 50회씩, 총 110회. 각 조작 뒤 `html[data-pointer-samples]` 길이가 정확히 하나 증가하고 count=1000, matches=true인지 확인한 다음 다음 조작을 시작한다. 누락/불일치는 오류로 기록하고 성공 표본만 뽑지 않는다.
4. 각 표본은 `lastMoveToFrameMs`, `releaseToFrameMs`, `gestureToFrameMs`, 기대 좌표·실제 style 좌표·실제 rect·이벤트 수를 담는다. 마지막 이동 처리 시작부터 손을 놓은 뒤 두 RAF까지가 주 경계다. 전체 자동화 호출 전후 시간은 별도로 기록한다.
5. 처음 10개만 워밍업으로 제외하고, axis별 50개를 오름차순 정렬해 p50=ceil(n×0.5), p95=ceil(n×0.95)번째 값을 산출한다. 코드의 측정은 `?measure=1`에서만 실행되며 일반 실행 결과물에는 포함되지 않는다.
6. 측정 완료 후 **변경 확인 → 디스크에서 다시 열기**로 미저장 fixture를 버리고 예제 경로를 연다. `npm run build`로 기본 실행 빌드를 복구한다. 최종 화면에서 320×48 유지 및 핸들 제거를 확인한다.

이번 실행의 원자료와 환경은 `evidence/check-01-pointer.json`, 결과/한계는 `verification.ko.md`에 있다. 같은 DOM/패턴을 사용해도 배경 부하와 기기에 따라 결과는 달라진다. 주 지표는 사람의 사고 시간 또는 모든 입력 지연의 측정값이 아니다.
