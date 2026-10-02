import express from "express";
import { createServer as createViteServer } from "vite";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { realpath, mkdir, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { readProject, saveProject, Conflict } from "./store.js";
import { projectSchema } from "../src/model.js";
import { Database, dbConfigSchema } from "./db.js";
import { CodexClient } from "./codex.js";
import { SpringAdapter, type CustomerAdapter } from "./adapters.js";
const exec = promisify(execFile),
  app = express(),
  port = 5173,
  origin = `http://127.0.0.1:${port}`,
  token = randomBytes(32).toString("hex");
let root = await realpath(process.env.RELOADED_PROJECT || "examples/customer");
const db = new Database();
let adapter: CustomerAdapter = db;
async function openedProject() {
  try {
    return await readProject(root);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
app.use((req, res, next) => {
  let decoded = req.path;
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return res.sendStatus(400);
  }
  if (/(?:^|\/)(?:\.local|\.git|sources|work)(?:\/|$)/i.test(decoded))
    return res.sendStatus(403);
  if (
    req.headers.host !== `127.0.0.1:${port}` &&
    req.headers.host !== `localhost:${port}`
  )
    return res.status(403).json({ error: "Host rejected" });
  if (req.path.startsWith("/api/")) {
    res.set("Cache-Control", "no-store");
    const o = req.headers.origin;
    if (
      (o && o !== origin && o !== `http://localhost:${port}`) ||
      req.headers["sec-fetch-site"] === "cross-site"
    )
      return res.status(403).json({ error: "Origin rejected" });
    if (
      req.path !== "/api/session" &&
      req.headers["x-reloaded-token"] !== token
    )
      return res.status(401).json({ error: "Local session required" });
  }
  next();
});
app.use(express.json({ limit: "3mb" }));
app.get("/api/session", (_q, r) => {
  r.set("Cache-Control", "no-store").json({ token });
});
app.get("/api/project", async (_q, r) =>
  r.json({ root, project: await openedProject() }),
);
app.post("/api/project/save", async (q, r) => {
  const b = z
    .object({
      root: z.string(),
      expected: z.number().int(),
      project: projectSchema,
    })
    .strict()
    .parse(q.body);
  if (b.root !== root)
    throw new Conflict("프로젝트가 변경되었습니다. 다시 열어 주세요.");
  r.json(await saveProject(root, b.project, b.expected));
});
app.post("/api/project/open", async (q, r) => {
  const b = z
    .object({ path: z.string().min(1) })
    .strict()
    .parse(q.body);
  const target = await realpath(b.path);
  if (!(await (await import("node:fs/promises")).stat(target)).isDirectory())
    throw Error("Not a directory");
  const previous = root;
  root = target;
  try {
    const project = await openedProject();
    if (previous !== root) {
      await db.pool?.end();
      db.pool = undefined;
      db.isolated = false;
      adapter = db;
    }
    r.json({ root, project });
  } catch (e) {
    root = previous;
    throw e;
  }
});
app.post("/api/project/clone", async (q, r) => {
  const b = z
    .object({
      url: z
        .string()
        .regex(
          /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/,
        ),
      name: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
    })
    .strict()
    .parse(q.body);
  const imports = path.resolve(".local/imports");
  await mkdir(imports, { recursive: true, mode: 0o700 });
  const target = path.join(imports, b.name);
  await exec(
    "git",
    [
      "-c",
      "core.hooksPath=/dev/null",
      "clone",
      "--depth",
      "1",
      "--",
      b.url,
      target,
    ],
    { timeout: 60000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } },
  );
  r.json({
    path: target,
    message:
      "가져왔습니다. 실행 스크립트는 실행하지 않았습니다. RELOADED 모델이 있는 프로젝트는 경로 열기로 연결하세요.",
  });
});
app.post("/api/db/setup", async (_q, r) => {
  await exec(process.execPath, ["scripts/local-db.mjs", "start"], {
    timeout: 30000,
  });
  r.json({
    ready: true,
    message: "격리 개발 DB 준비 완료. 연결 버튼을 누르세요.",
  });
});
app.post("/api/adapter/spring", async (_q, r) => {
  const candidate = new SpringAdapter();
  await candidate.list();
  adapter = candidate;
  r.json({ adapter: "Spring", connected: true });
});
app.get("/api/environment", async (_q, r) => {
  const files = await Promise.all(
    ["package.json", "pom.xml", "build.gradle", ".reloaded/project.json"].map(
      async (f) => {
        try {
          await readFile(path.join(root, f));
          return f;
        } catch {
          return null;
        }
      },
    ),
  );
  r.json({
    root,
    node: process.version,
    files: files.filter(Boolean),
    adapter:
      files.includes("pom.xml") || files.includes("build.gradle")
        ? "Spring 어댑터 연결 필요 · 기존 Java 소스 보존"
        : files.includes(".reloaded/project.json")
          ? "RELOADED 모델"
          : "기존 프로젝트 · 어댑터 설정 필요",
    dbConnected: !!db.pool,
    isolated: db.isolated,
  });
});
app.post("/api/db/connect", async (q, r) => {
  const result = await db.connect(dbConfigSchema.parse(q.body));
  adapter = db;
  r.json(result);
});
app.post("/api/db/local", async (_q, r) => {
  const result = await db.local();
  adapter = db;
  r.json(result);
});
app.get("/api/db/inspect", async (_q, r) => r.json(await db.inspect()));
app.get("/api/customers", async (_q, r) => r.json(await adapter.list()));
app.post("/api/customers", async (q, r) =>
  r.json(await adapter.insert(q.body)),
);
app.get("/api/codex/status", async (_q, r) => {
  const c = new CodexClient();
  try {
    r.json(await c.status());
  } catch {
    r.json({
      available: false,
      authenticated: false,
      message: "Codex 실행 파일 또는 인증을 확인하세요.",
    });
  } finally {
    c.close();
  }
});
app.post("/api/codex/request", async (q, r) => {
  const b = z
    .object({
      prompt: z.string().min(1).max(4000),
      context: z.string().max(3000),
    })
    .strict()
    .parse(q.body);
  const c = new CodexClient();
  try {
    const result = await c.ask(
      "RELOADED 기능 설계 요청. 파일/DB/도구 실행 없이 아래 사용자가 직접 제공한 맥락만 사용해서 한국어로 작은 변경안을 제안하세요. 코드를 변경했다고 주장하지 마세요.\n" +
        b.context +
        "\n요청: " +
        b.prompt,
      path.resolve("work/codex-empty"),
    );
    r.json(result);
  } finally {
    c.close();
  }
});
app.use("/api", (_q, r) => r.status(404).json({ error: "Unknown endpoint" }));
app.use(
  (
    e: unknown,
    _q: express.Request,
    r: express.Response,
    _n: express.NextFunction,
  ) => {
    r.status(e instanceof Conflict ? 409 : 400).json({
      error:
        e instanceof Conflict
          ? e.message
          : e instanceof z.ZodError
            ? "입력 형식이 올바르지 않습니다."
            : e instanceof Error &&
                /DB|PostgreSQL|Codex|Metadata/.test(e.message)
              ? e.message
              : "요청을 완료하지 못했습니다. 경로·연결·권한을 확인하세요.",
    });
  },
);
await mkdir("work/codex-empty", { recursive: true });
const vite = await createViteServer({
  server: {
    middlewareMode: true,
    host: "127.0.0.1",
    allowedHosts: ["127.0.0.1", "localhost"],
    watch: { ignored: ["**/work/**", "**/dist/**", "**/.local/**"] },
    fs: {
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/.local/**",
        "**/work/**",
        "**/sources/**",
      ],
    },
  },
  appType: "spa",
});
app.use(vite.middlewares);
const server = app.listen(port, "127.0.0.1", () =>
  console.log(`RELOADED · ${origin}`),
);
process.on("SIGTERM", async () => {
  await db.pool?.end();
  await vite.close();
  server.close();
});
