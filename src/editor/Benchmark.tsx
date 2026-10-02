import { useState } from "react";
import { flushSync } from "react-dom";
type Metric = {
  mode: string;
  count: number;
  run: number;
  renderMs: number;
  updateMs: number;
  dom: number;
  heapMB: number | null;
};
const frame = () =>
  new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
export function Benchmark() {
  const [count, setCount] = useState(0),
    [mode, setMode] = useState("baseline"),
    [changed, setChanged] = useState(false),
    [running, setRunning] = useState(false),
    [metrics, setMetrics] = useState<Metric[]>([]);
  async function run() {
    setRunning(true);
    const results: Metric[] = [];
    for (const size of [100, 1000, 10000])
      for (const kind of ["baseline", "runtime", "editor"])
        for (let i = 0; i < 3; i++) {
          flushSync(() => {
            setCount(0);
            setMode(kind);
            setChanged(false);
          });
          await frame();
          const start = performance.now();
          flushSync(() => setCount(size));
          await frame();
          const rendered = performance.now();
          const update = performance.now();
          flushSync(() => setChanged(true));
          await frame();
          const updated = performance.now();
          const memory = (
            performance as Performance & { memory?: { usedJSHeapSize: number } }
          ).memory;
          results.push({
            mode: kind,
            count: size,
            run: i + 1,
            renderMs: +(rendered - start).toFixed(2),
            updateMs: +(updated - update).toFixed(2),
            dom: document
              .querySelector("#benchmark-surface")!
              .querySelectorAll("*").length,
            heapMB: memory
              ? +(memory.usedJSHeapSize / 1048576).toFixed(2)
              : null,
          });
          setMetrics([...results]);
        }
    setRunning(false);
  }
  return (
    <div style={{ padding: 24 }}>
      <h1>CHECK-01 · 재현 측정</h1>
      <p>
        동일 React 입력창의 기본/운영/편집 metadata 부하. 2 animation frames
        포함 · 가상화 없음 · 각 3회.
      </p>
      <button disabled={running} onClick={run}>
        {running ? "측정 중…" : "전체 측정 시작"}
      </button>
      <pre id="benchmark-results">{JSON.stringify(metrics, null, 2)}</pre>
      <div
        id="benchmark-surface"
        style={{
          height: 300,
          overflow: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 4,
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            data-object-id={mode === "editor" ? `object-${i}` : undefined}
            data-source={mode === "editor" ? `model/${i}` : undefined}
            onClick={
              mode === "editor" ? () => setChanged((v) => !v) : undefined
            }
            style={
              i === 0 && changed ? { outline: "2px solid blue" } : undefined
            }
          >
            <input
              aria-label={`항목 ${i}`}
              readOnly
              value={i === 0 && changed ? "changed" : `field ${i}`}
              style={{ width: changed && i === 0 ? 200 : 160 }}
            />
            {mode === "editor" && i === 0 && changed && (
              <>
                <span className="resize-handle" />
                <span className="resize-handle" />
                <span className="resize-handle" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
