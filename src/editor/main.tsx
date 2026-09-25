import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  duplicate,
  historyPush,
  patchNode,
  snap,
  type Project,
  type LayoutNode,
  type NodePatch,
} from "../model";
import {
  Shell,
  CustomerList,
  useBusiness,
  request,
  type BusinessState,
} from "../runtime/Business";
import "../runtime/style.css";
import "./style.css";
import { Benchmark } from "./Benchmark";
function Editor() {
  const [project, setProject] = useState<Project>(),
    [root, setRoot] = useState(""),
    [edit, setEdit] = useState(true),
    [selected, setSelected] = useState<string>(),
    [record, setRecord] = useState(""),
    [tab, setTab] = useState("request"),
    [past, setPast] = useState<Project[]>([]),
    [future, setFuture] = useState<Project[]>([]),
    [saved, setSaved] = useState(""),
    [status, setStatus] = useState("로컬 프로젝트를 여는 중…"),
    [busy, setBusy] = useState(false),
    [guide, setGuide] = useState(false);
  const s = useBusiness();
  const measurement = useRef({ start: performance.now(), operation: "load" });
  const measuring = new URLSearchParams(location.search).has("measure");
  useEffect(() => {
    if (!measuring || !project) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        document.documentElement.dataset.measurement = JSON.stringify({
          operation: measurement.current.operation,
          count: project.nodes.length,
          elapsedMs: performance.now() - measurement.current.start,
          dom: document.querySelectorAll(".business-node, .business-node *")
            .length,
          heapMB: (
            performance as Performance & { memory?: { usedJSHeapSize: number } }
          ).memory?.usedJSHeapSize
            ? (performance as any).memory.usedJSHeapSize / 1048576
            : null,
        });
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [project, measuring]);
  const current = useRef(project);
  current.current = project;
  const gesture = useRef<
    | {
        before: Project;
        node: LayoutNode;
        x: number;
        y: number;
        sx: number;
        sy: number;
        axis: string;
      }
    | undefined
  >(undefined);
  const dirty = !!project && JSON.stringify(project) !== saved;
  async function load() {
    measurement.current = { start: performance.now(), operation: "load" };
    try {
      const d = await request("/api/project");
      if (d.root !== root) {
        s.setPage("register");
        s.setPopup(false);
        s.setValues({ name: "", phone: "" });
      }
      setRoot(d.root);
      setProject(d.project || undefined);
      setSaved(d.project ? JSON.stringify(d.project) : "");
      setPast([]);
      setFuture([]);
      setSelected(undefined);
      setStatus(
        d.project
          ? "로컬 모델을 열었습니다."
          : "프로젝트를 열었습니다. RELOADED 모델 없음 · 실행 환경에서 기존 스택을 확인하세요.",
      );
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function change(next: Project) {
    if (!project) return;
    setPast(historyPush(past, project));
    setFuture([]);
    setProject(next);
  }
  function patch(id: string, p: NodePatch) {
    measurement.current = { start: performance.now(), operation: "geometry" };
    if (project) change(patchNode(project, id, p));
  }
  function undo() {
    if (!project || !past.length) return;
    setFuture(historyPush(future, project));
    setProject(past[past.length - 1]);
    setPast(past.slice(0, -1));
  }
  function redo() {
    if (!project || !future.length) return;
    setPast(historyPush(past, project));
    setProject(future[future.length - 1]);
    setFuture(future.slice(0, -1));
  }
  async function save() {
    if (!project || busy) return;
    setBusy(true);
    try {
      const data = await request("/api/project/save", {
        method: "POST",
        body: JSON.stringify({
          root,
          expected: JSON.parse(saved).revision,
          project,
        }),
      });
      setProject(data);
      setSaved(JSON.stringify(data));
      setStatus(`저장 완료 · revision ${data.revision}`);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });
  const n = project?.nodes.find(
    (n) =>
      n.id === selected &&
      (n.page === s.page || (s.popup && n.page === "popup")),
  );
  useEffect(() => {
    setSelected(undefined);
    setRecord("");
  }, [s.page, s.popup]);
  function start(
    e: React.PointerEvent<HTMLDivElement>,
    node: LayoutNode,
    axis: string,
  ) {
    if (!edit || e.metaKey || e.ctrlKey || busy || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(node.id);
    setRecord("");
    const canvas = e.currentTarget.closest(".canvas") as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    gesture.current = {
      before: structuredClone(project!),
      node: { ...node },
      x: e.clientX,
      y: e.clientY,
      sx: rect.width / canvas.offsetWidth,
      sy: rect.height / canvas.offsetHeight,
      axis,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || !current.current) return;
    const dx = (e.clientX - g.x) / g.sx,
      dy = (e.clientY - g.y) / g.sy;
    const others = current.current.nodes.filter(
      (n) => n.page === g.node.page && n.id !== g.node.id,
    );
    let p: NodePatch;
    if (g.axis === "move") {
      p = {
        x: Math.max(
          0,
          Math.min(
            200000,
            snap(
              g.node.x + dx,
              others.flatMap((n) => [
                n.x,
                n.x + n.w,
                g.node.w ? n.x + n.w - g.node.w : n.x,
              ]),
            ),
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            200000,
            snap(
              g.node.y + dy,
              others.map((n) => n.y),
            ),
          ),
        ),
      };
    } else {
      p = {
        w: g.axis.includes("x")
          ? Math.max(
              40,
              Math.min(
                1200,
                snap(
                  g.node.w + dx,
                  others.flatMap((n) => [n.w, n.x + n.w - g.node.x]),
                ),
              ),
            )
          : g.node.w,
        h: g.axis.includes("y")
          ? Math.max(
              24,
              Math.min(
                600,
                snap(
                  g.node.h + dy,
                  others.map((n) => n.h),
                ),
              ),
            )
          : g.node.h,
      };
    }
    setProject(patchNode(current.current, g.node.id, p));
    setGuide(true);
  }
  function finish(cancel = false) {
    const g = gesture.current;
    if (!g) return;
    if (cancel) setProject(g.before);
    else if (JSON.stringify(g.before) !== JSON.stringify(current.current)) {
      setPast((p) => historyPush(p, g.before));
      setFuture([]);
    }
    gesture.current = undefined;
    setGuide(false);
  }
  function canvas(page: string) {
    if (!project) return null;
    const nodes = project.nodes.filter((n) => n.page === page);
    return (
      <div
        className={"canvas " + (edit ? "editing" : "")}
        style={{
          minHeight: Math.max(
            page === "popup" ? 220 : 480,
            ...nodes.map((n) => n.y + n.h + 50),
          ),
          width: Math.max(
            page === "popup" ? 500 : 760,
            ...nodes.map((n) => n.x + n.w + 40),
          ),
        }}
      >
        {nodes.map((node) => (
          <div
            key={node.id}
            data-object-id={node.id}
            data-source={`.reloaded/project.json#/nodes/${node.id}`}
            className={`business-node ${node.kind} ${edit && selected === node.id ? "selected" : ""}`}
            style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
            onPointerDown={(e) => start(e, node, "move")}
            onPointerMove={move}
            onPointerUp={() => finish()}
            onPointerCancel={() => finish(true)}
            onLostPointerCapture={() => finish()}
            onClickCapture={(e) => {
              if (edit && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                setSelected(node.id);
              }
            }}
          >
            {node.kind === "input" ? (
              <>
                <label className="field-caption" htmlFor={"field-" + node.id}>
                  {node.label}
                </label>
                <input
                  id={"field-" + node.id}
                  aria-label={node.label}
                  readOnly={edit}
                  value={s.values[node.binding || "name"]}
                  onChange={(e) =>
                    s.setValues({
                      ...s.values,
                      [node.binding || "name"]: e.target.value,
                    })
                  }
                />
              </>
            ) : node.kind === "button" ? (
              <button onClick={() => s.action(node.action)}>
                {node.label}
              </button>
            ) : (
              <span>{node.label}</span>
            )}
            {edit && selected === node.id && (
              <>
                <span className="object-tag">
                  {node.kind} · {node.id.slice(-4)}
                </span>
                {["x", "y", "xy"].map((axis) => (
                  <div
                    key={axis}
                    role="slider"
                    tabIndex={0}
                    aria-label={
                      axis === "x"
                        ? "너비 조절"
                        : axis === "y"
                          ? "높이 조절"
                          : "너비와 높이 조절"
                    }
                    aria-valuenow={axis === "y" ? node.h : node.w}
                    aria-valuemin={axis === "y" ? 24 : 40}
                    aria-valuemax={axis === "y" ? 600 : 1200}
                    className={"resize-handle handle-" + axis}
                    onPointerDown={(e) => start(e, node, axis)}
                    onKeyDown={(e) => {
                      const step = e.shiftKey ? 10 : 1;
                      if (
                        [
                          "ArrowRight",
                          "ArrowLeft",
                          "ArrowUp",
                          "ArrowDown",
                        ].includes(e.key)
                      ) {
                        e.preventDefault();
                        patch(node.id, {
                          w: Math.min(
                            1200,
                            Math.max(
                              40,
                              node.w +
                                (axis.includes("x")
                                  ? e.key === "ArrowRight"
                                    ? step
                                    : e.key === "ArrowLeft"
                                      ? -step
                                      : 0
                                  : 0),
                            ),
                          ),
                          h: Math.min(
                            600,
                            Math.max(
                              24,
                              node.h +
                                (axis.includes("y")
                                  ? e.key === "ArrowDown"
                                    ? step
                                    : e.key === "ArrowUp"
                                      ? -step
                                      : 0
                                  : 0),
                            ),
                          ),
                        });
                      }
                    }}
                  />
                ))}
              </>
            )}
          </div>
        ))}
        {guide && n && (
          <>
            <div className="snap-line vertical" style={{ left: n.x }} />
            <div className="snap-line horizontal" style={{ top: n.y }} />
          </>
        )}
      </div>
    );
  }
  return (
    <Shell
      s={s}
      title={project?.name || root.split("/").at(-1) || "RELOADED"}
      header={
        <>
          <span className="local-badge">● 로컬</span>
          <div className="mode-switch">
            <button
              className={edit ? "active" : ""}
              onClick={() => {
                finish();
                setEdit(true);
              }}
            >
              수정
            </button>
            <button
              className={!edit ? "active" : ""}
              onClick={() => {
                finish();
                setEdit(false);
              }}
            >
              실행
            </button>
          </div>
          <button className="primary" disabled={busy || !dirty} onClick={save}>
            {busy ? "저장 중…" : "저장"}
          </button>
        </>
      }
      popup={canvas("popup")}
      aside={
        <aside>
          <div className="inspector">
            <div className="panel-heading">
              속성 <span>{edit ? "수정 모드" : "실행 모드"}</span>
            </div>
            {edit && n ? (
              <>
                <div className="selection-name">
                  {n.label}
                  <small>{n.id}</small>
                </div>
                <label className="control-label">
                  표시 이름
                  <input
                    aria-label="표시 이름"
                    value={n.label}
                    onChange={(e) => {
                      if (e.target.value)
                        patch(n.id, { label: e.target.value });
                    }}
                  />
                </label>
                <div className="dimensions">
                  {(["x", "y", "w", "h"] as const).map((key, i) => (
                    <label key={key}>
                      {["X", "Y", "너비", "높이"][i]}
                      <input
                        type="number"
                        aria-label={["X 위치", "Y 위치", "너비", "높이"][i]}
                        min={key === "w" ? 40 : key === "h" ? 24 : 0}
                        max={key === "w" ? 1200 : key === "h" ? 600 : 200000}
                        value={n[key]}
                        onChange={(e) => {
                          const v = e.target.valueAsNumber;
                          if (Number.isFinite(v)) {
                            try {
                              patch(n.id, { [key]: v });
                            } catch {
                              setStatus("허용 범위를 확인하세요.");
                            }
                          }
                        }}
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (project) {
                      const next = duplicate(project, n.id);
                      change(next);
                      setSelected(next.nodes.at(-1)!.id);
                    }
                  }}
                >
                  객체 복제
                </button>
                <p className="subtle">
                  8px 그리드 · 인접 객체에 자석 정렬
                  <br />
                  드래그로 이동, 세 핸들로 크기 조절
                </p>
              </>
            ) : (
              <p className="subtle">
                {record
                  ? `반복 항목 선택: ${record}. 목록 템플릿 편집은 지원 예정입니다.`
                  : edit
                    ? "화면의 객체를 클릭해 선택하세요. ⌘ 또는 Ctrl + 클릭으로 실행합니다."
                    : "화면을 실행하고 있습니다. 변경한 크기는 그대로 유지됩니다."}
              </p>
            )}
            <div className="history">
              <button disabled={!past.length || !edit} onClick={undo}>
                ↶ 되돌리기
              </button>
              <button disabled={!future.length || !edit} onClick={redo}>
                ↷ 다시 실행
              </button>
            </div>
          </div>
          <div className="assistant-title">
            <b>Codex</b>
            <span>개발 도우미</span>
          </div>
          <div className="tabs">
            {["request", "env", "review"].map((t, i) => (
              <button
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
                key={t}
              >
                {["기능 요청", "실행 환경", "변경 확인"][i]}
              </button>
            ))}
          </div>
          <div className="tab-content">
            {tab === "request" ? (
              <RequestPanel node={n} />
            ) : tab === "env" ? (
              <Environment root={root} dirty={dirty} onOpen={load} />
            ) : (
              <>
                <div className="review-state">
                  {dirty ? "저장하지 않은 모델 변경" : "저장된 모델과 일치"}
                </div>
                <p className="subtle">
                  {root}/.reloaded/project.json
                  <br />
                  화면을 재생성하지 않고 선택 객체의 속성만 변경합니다.
                </p>
                <pre>{project ? diff(saved, project) : ""}</pre>
                <button onClick={load} disabled={busy}>
                  디스크에서 다시 열기
                </button>
                <p className="subtle">
                  다시 열기는 저장하지 않은 변경을 버립니다. 운영 배포는
                  실행하지 않습니다.
                </p>
              </>
            )}
          </div>
          <div className="editor-status" role="status">
            {status}
          </div>
        </aside>
      }
    >
      <div className="page-title">
        <div>
          <h1>
            {s.page === "register"
              ? "고객 등록"
              : s.page === "customers"
                ? "고객 목록"
                : "프로젝트 안내"}
          </h1>
          <p>
            {edit
              ? "화면에서 바로 고치고, 실행으로 확인하세요."
              : "입력하고 버튼을 눌러 실제 동작을 확인하세요."}
          </p>
        </div>
        <span className="canvas-badge">{edit ? "EDIT" : "RUN"}</span>
      </div>
      {!project ? (
        <div className="guide">
          <h2>기존 프로젝트를 열었습니다</h2>
          <p>
            실행 환경에서 프로젝트 구조를 확인하세요. 편집 모델이 없으므로 임의
            소스를 자동 변환하지 않습니다.
          </p>
        </div>
      ) : s.page === "register" ? (
        <div className="canvas-scroll">{canvas("register")}</div>
      ) : s.page === "customers" ? (
        <CustomerList s={s} edit={edit} onSelect={setRecord} />
      ) : (
        <div className="guide">
          <h2>작게 고치고, 바로 확인하기</h2>
          <p>
            1. 실행 환경에서 격리된 개발 DB를 연결합니다.
            <br />
            2. 수정 모드에서 입력창을 선택하고 크기를 바꿉니다.
            <br />
            3. 실행 모드에서 고객을 저장하고 목록을 확인합니다.
            <br />
            4. 저장한 모델을 별도 운영 빌드로 변환합니다.
          </p>
          <p>
            기존 Spring 프로젝트는 어댑터 경계에서 연결합니다. 임의 소스를 자동
            변환하거나 실행하지 않습니다.
          </p>
        </div>
      )}
    </Shell>
  );
}
function diff(saved: string, p: Project) {
  if (!saved) return "";
  const old: Project = JSON.parse(saved);
  return (
    p.nodes
      .flatMap((n) => {
        const before = old.nodes.find((o) => o.id === n.id);
        return JSON.stringify(before) === JSON.stringify(n)
          ? []
          : [JSON.stringify({ id: n.id, before, after: n }, null, 2)];
      })
      .join("\n") || "변경 없음"
  );
}
function RequestPanel({ node }: { node?: LayoutNode }) {
  const [prompt, setPrompt] = useState(
      "선택한 입력창의 유효성 검사를 어떻게 추가할까요?",
    ),
    [result, setResult] = useState(""),
    [busy, setBusy] = useState(false),
    [state, setState] = useState("연결 상태 확인 전");
  return (
    <>
      <div className="context-card">
        <small>함께 전달할 대상</small>
        <b>{node ? node.label : "고객관리 화면"}</b>
        <span>선택 객체 ID·종류·표시 이름만 전송</span>
      </div>
      <label className="control-label">
        어떤 기능이 필요한가요?
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </label>
      <p className="subtle">
        요청 시 위 내용과 입력한 문장이 OpenAI로 전송됩니다. 고객 레코드·DB
        비밀번호는 포함하지 않습니다. 현재 연결은 변경안 제안 전용입니다.
      </p>
      <button
        onClick={async () => {
          try {
            const d = await request("/api/codex/status");
            setState(
              d.available
                ? d.authenticated
                  ? "Codex 인증 확인됨"
                  : "Codex 로그인 필요"
                : "Codex 연결 불가",
            );
          } catch {
            setState("연결 실패");
          }
        }}
      >
        연결 확인
      </button>
      <span className="subtle"> {state}</span>
      <button
        className="primary wide"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setResult("Codex 응답을 기다립니다…");
          try {
            const r = await request("/api/codex/request", {
              method: "POST",
              body: JSON.stringify({
                prompt,
                context: JSON.stringify(
                  node
                    ? { id: node.id, kind: node.kind, label: node.label }
                    : { page: "고객관리" },
                ),
              }),
            });
            setResult(r.text || "완료 응답에 내용이 없습니다.");
          } catch (e) {
            setResult((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "요청 중…" : "Codex에 변경안 요청"}
      </button>
      {result && <pre className="ai-result">{result}</pre>}
      <p className="subtle">
        MCP object_patch는 별도 도구 연결로 실제 모델을 저장합니다. 이 패널의
        제안은 자동 적용되지 않습니다.
      </p>
    </>
  );
}
function Environment({
  root,
  dirty,
  onOpen,
}: {
  root: string;
  dirty: boolean;
  onOpen: () => void;
}) {
  const [projectPath, setProjectPath] = useState(root),
    [url, setUrl] = useState(""),
    [name, setName] = useState("imported-project"),
    [output, setOutput] = useState(""),
    [db, setDb] = useState({
      host: "127.0.0.1",
      port: 55432,
      database: "reloaded_dev",
      user: "reloaded_local",
      password: "",
    });
  async function run(path: string, body?: unknown) {
    try {
      const r = await request(
        path,
        body ? { method: "POST", body: JSON.stringify(body) } : {},
      );
      setOutput(
        JSON.stringify(
          r.project
            ? {
                root: r.root,
                objects: r.project.nodes.length,
                revision: r.project.revision,
              }
            : r,
          null,
          2,
        ),
      );
      return r;
    } catch (e) {
      setOutput((e as Error).message);
    }
  }
  return (
    <>
      <button onClick={() => run("/api/environment")}>환경 확인</button>
      <h3>프로젝트 열기</h3>
      <input
        aria-label="프로젝트 경로"
        value={projectPath}
        onChange={(e) => setProjectPath(e.target.value)}
      />
      <button
        disabled={dirty}
        onClick={async () => {
          if (await run("/api/project/open", { path: projectPath })) onOpen();
        }}
      >
        경로 열기
      </button>
      {dirty && (
        <p className="subtle">
          현재 변경을 먼저 저장하거나 다시 열기로 버려 주세요.
        </p>
      )}
      <details>
        <summary>Git 가져오기</summary>
        <input
          aria-label="Git URL"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          aria-label="가져올 폴더 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={async () => {
            const r = await run("/api/project/clone", { url, name });
            if (r) setProjectPath(r.path);
          }}
        >
          격리 폴더로 가져오기
        </button>
      </details>
      <h3>기존 Java 서버</h3>
      <button onClick={() => run("/api/adapter/spring", {})}>
        Spring 연결 확인 (8080)
      </button>
      <p className="subtle">
        기존 Spring 서버는 해당 프로젝트 절차로 실행하세요. GET/POST
        /api/customers 계약을 사용합니다.
      </p>
      <h3>PostgreSQL</h3>
      <button className="wide" onClick={() => run("/api/db/setup", {})}>
        격리 개발 DB 준비·시작
      </button>
      <button className="wide" onClick={() => run("/api/db/local", {})}>
        격리 개발 DB 연결
      </button>
      <p className="subtle">
        먼저 터미널에서 npm run db:start
        <br />
        비밀정보는 서버의 .local/ 안에만 보관됩니다.
      </p>
      <details>
        <summary>직접 연결 설정</summary>
        {(["host", "port", "database", "user", "password"] as const).map(
          (k) => (
            <label className="control-label" key={k}>
              {k}
              <input
                type={
                  k === "password"
                    ? "password"
                    : k === "port"
                      ? "number"
                      : "text"
                }
                value={db[k]}
                onChange={(e) =>
                  setDb({
                    ...db,
                    [k]: k === "port" ? Number(e.target.value) : e.target.value,
                  })
                }
              />
            </label>
          ),
        )}
        <button
          onClick={async () => {
            await run("/api/db/connect", db);
            setDb({ ...db, password: "" });
          }}
        >
          연결 확인
        </button>
        <p className="subtle">
          이 프로토타입은 loopback DB만 연결합니다. 직접 지정한 DB는 연결
          확인·코멘트 조회만 가능합니다.
        </p>
      </details>
      <button onClick={() => run("/api/db/inspect")}>
        DB 코멘트 먼저 읽기
      </button>
      <pre>{output}</pre>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).has("bench") ? (
    <Benchmark />
  ) : (
    <Editor />
  ),
);
