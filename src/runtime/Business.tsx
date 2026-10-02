import { useState } from "react";
import type { ReactNode } from "react";
export type Page = "customers" | "register" | "settings";
export type Customer = { id: string; name: string; phone: string };
export type BusinessState = ReturnType<typeof useBusiness>;
export function useBusiness() {
  const [page, setPage] = useState<Page>("register"),
    [popup, setPopup] = useState(false),
    [values, setValues] = useState({ name: "", phone: "" }),
    [customers, setCustomers] = useState<Customer[]>([]),
    [message, setMessage] = useState("");
  async function action(action?: string) {
    if (action === "popup") setPopup(true);
    if (action === "close") setPopup(false);
    if (action === "save") {
      if (!values.name.trim()) {
        setMessage("고객명을 입력해 주세요.");
        return;
      }
      try {
        await request("/api/customers", {
          method: "POST",
          body: JSON.stringify(values),
        });
        setMessage("DB에 저장했습니다.");
        setValues({ name: "", phone: "" });
      } catch (e) {
        setMessage((e as Error).message);
      }
    }
  }
  async function navigate(p: Page) {
    setPage(p);
    setMessage("");
    if (p === "customers") {
      try {
        setCustomers(await request("/api/customers"));
      } catch (e) {
        setMessage((e as Error).message);
      }
    }
  }
  return {
    page,
    popup,
    values,
    customers,
    message,
    setValues,
    setMessage,
    setPage,
    setPopup,
    action,
    navigate,
  };
}
let session: string | undefined;
export async function request(path: string, options: RequestInit = {}) {
  if (!session) {
    const r = await fetch("/api/session");
    if (!r.ok) throw Error("로컬 서버 연결 필요");
    session = (await r.json()).token;
  }
  const r = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Reloaded-Token": session!,
      ...options.headers,
    },
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "요청 실패");
  return data;
}
export function Nav({ s }: { s: BusinessState }) {
  return (
    <nav className="navigation">
      <div className="nav-label">WORKSPACE</div>
      {(["customers", "register", "settings"] as const).map((p, i) => (
        <button
          key={p}
          className={s.page === p ? "active" : ""}
          onClick={() => s.navigate(p)}
        >
          <span>{["◫", "＋", "⚙"][i]}</span>
          {["고객 목록", "고객 등록", "프로젝트 안내"][i]}
        </button>
      ))}
      <div className="nav-bottom">
        LOCAL FIRST
        <br />
        <span>당신의 화면, 당신의 코드.</span>
      </div>
    </nav>
  );
}
export function CustomerList({
  s,
  edit,
  onSelect,
}: {
  s: BusinessState;
  edit?: boolean;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="customer-list">
      <h2>고객 목록</h2>
      <p>PostgreSQL에서 읽은 고객 · {s.customers.length}명</p>
      {s.customers.length === 0 && (
        <p className="empty">
          아직 고객이 없습니다. 실행 모드에서 고객을 등록하세요.
        </p>
      )}
      <div className="rows">
        {s.customers.map((c) => (
          <button
            data-record-id={c.id}
            key={c.id}
            onClick={(e) => {
              if (edit && !e.metaKey && !e.ctrlKey) {
                onSelect?.(c.id);
                return;
              }
              s.setValues({ name: c.name, phone: c.phone });
              s.setPopup(true);
            }}
          >
            <span>
              <strong>{c.name}</strong>
              <small>{c.phone}</small>
            </span>
            <span>상세 보기 ↗</span>
          </button>
        ))}
      </div>
    </div>
  );
}
export function Shell({
  s,
  children,
  popup,
  header,
  aside,
  title = "고객관리",
}: {
  s: BusinessState;
  children: ReactNode;
  popup: ReactNode;
  header: ReactNode;
  aside?: ReactNode;
  title?: string;
}) {
  return (
    <div className="app">
      <header>
        <a className="brand" href="/">
          RELOADED<span>●</span>
        </a>
        <span className="project-title">
          {title} <small>로컬 프로젝트</small>
        </span>
        {header}
      </header>
      <div className={"workspace " + (!aside ? "runtime" : "")}>
        <Nav s={s} />
        <main>
          <div className="breadcrumb">
            {title} <span>/</span>{" "}
            {s.page === "register"
              ? "고객 등록"
              : s.page === "customers"
                ? "고객 목록"
                : "프로젝트 안내"}
          </div>
          {children}
          {s.message && (
            <div role="status" className="notice">
              {s.message}
            </div>
          )}
        </main>
        {aside}
      </div>
      {s.popup && (
        <div className="modal-shade">
          <section className="modal" role="dialog" aria-label="고객 안내">
            <div className="modal-title">
              고객 안내 <button onClick={() => s.setPopup(false)}>닫기</button>
            </div>
            {popup}
          </section>
        </div>
      )}
      <footer>
        <span>Direct Manipulation First</span>
        <span>로컬 검증 → 별도 빌드 → 배포</span>
      </footer>
    </div>
  );
}
