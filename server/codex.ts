import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
// App Server is a JSON-RPC runner. MCP is a separate tool transport.
export class CodexClient {
  child = spawn(
    process.env.CODEX_BIN || "codex",
    [
      "app-server",
      "--listen",
      "stdio://",
      "--disable",
      "shell_tool",
      "--disable",
      "apps",
      "--disable",
      "skill_search",
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  seq = 0;
  pending = new Map<
    number,
    {
      resolve: (r: any) => void;
      reject: (e: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  events: ((m: any) => void)[] = [];
  constructor() {
    this.child.stderr.on("data", () => {});
    this.child.on("error", () => this.fail());
    this.child.on("exit", () => this.fail());
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      try {
        const m = JSON.parse(line);
        if (m.id !== undefined && this.pending.has(m.id)) {
          const p = this.pending.get(m.id)!;
          clearTimeout(p.timer);
          this.pending.delete(m.id);
          if (m.error) p.reject(Error("Codex protocol error: " + m.error.code));
          else p.resolve(m.result);
        } else if (m.method && m.id !== undefined) {
          this.child.stdin.write(
            JSON.stringify({
              id: m.id,
              error: {
                code: -32601,
                message:
                  "Interactive actions are disabled in this read-only integration",
              },
            }) + "\n",
          );
        } else this.events.forEach((f) => f(m));
      } catch {}
    });
  }
  fail() {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(Error("Codex App Server unavailable"));
    }
    this.pending.clear();
  }
  call(method: string, params: unknown = {}) {
    const id = ++this.seq;
    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error("Codex request timeout"));
      }, 20000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    });
  }
  async initialize() {
    await this.call("initialize", {
      clientInfo: { name: "reloaded", title: "RELOADED", version: "0.1.0" },
      capabilities: { experimentalApi: false },
    });
    this.child.stdin.write(JSON.stringify({ method: "initialized" }) + "\n");
  }
  async status() {
    await this.initialize();
    const a = await this.call("account/read", { refreshToken: false });
    return {
      available: true,
      authenticated: !!a.account,
      authType: a.account?.type || null,
    };
  }
  async ask(prompt: string, cwd: string) {
    await this.initialize();
    const a = await this.call("account/read", { refreshToken: false });
    if (!a.account)
      throw Error(
        "Codex 로그인 필요: 터미널에서 codex login 후 다시 시도하세요.",
      );
    // Inspect configuration only to disable inherited tools for this proposal-only session.
    // Never return or log the configuration (it can contain secrets).
    const effective = await this.call("config/read", { includeLayers: false });
    const disabled = (section: string) =>
      Object.fromEntries(
        Object.keys(effective.config[section] || {}).map((name) => [
          name,
          { enabled: false },
        ]),
      );
    const start = await this.call("thread/start", {
      cwd,
      approvalPolicy: "never",
      sandbox: "read-only",
      ephemeral: true,
      config: {
        mcp_servers: disabled("mcp_servers"),
        plugins: disabled("plugins"),
        web_search: "disabled",
        features: { shell_tool: false, apps: false, skill_search: false },
      },
    });
    const threadId = start.thread.id;
    let text = "";
    return new Promise<{ text: string; status: string }>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.call("turn/interrupt", { threadId, turnId }).catch(() => {});
        reject(Error("Codex 응답 시간 초과. 완료로 처리하지 않았습니다."));
      }, 120000);
      let turnId = "";
      this.events.push((m) => {
        if (m.params?.threadId !== threadId) return;
        if (m.method === "item/agentMessage/delta") text += m.params.delta;
        if (m.method === "turn/completed") {
          clearTimeout(timer);
          const status = m.params.turn.status;
          if (status !== "completed")
            reject(Error("Codex 작업 실패 또는 중단"));
          else resolve({ text, status });
        }
      });
      this.call("turn/start", {
        threadId,
        input: [{ type: "text", text: prompt }],
        approvalPolicy: "never",
        sandboxPolicy: { type: "readOnly", networkAccess: false },
      })
        .then((r) => {
          turnId = r.turn.id;
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
    });
  }
  close() {
    this.fail();
    this.child.kill();
  }
}
