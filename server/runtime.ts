// Local production-bundle verification server. No editor API or model loading.
import express from "express";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { Database } from "./db.js";
const app = express(),
  token = randomBytes(32).toString("hex"),
  db = new Database();
await db.local();
app.use((q, r, n) => {
  if (q.headers.host !== "127.0.0.1:4173") return r.sendStatus(403);
  if (q.path.startsWith("/api/")) {
    if (
      (q.headers.origin && q.headers.origin !== "http://127.0.0.1:4173") ||
      q.headers["sec-fetch-site"] === "cross-site"
    )
      return r.sendStatus(403);
    if (q.path !== "/api/session" && q.headers["x-reloaded-token"] !== token)
      return r.sendStatus(401);
  }
  n();
});
app.use(express.json({ limit: "10kb" }));
app.get("/api/session", (_q, r) =>
  r.set("Cache-Control", "no-store").json({ token }),
);
app.get("/api/customers", async (_q, r) => r.json(await db.list()));
app.post("/api/customers", async (q, r) => r.json(await db.insert(q.body)));
app.use("/api", (_q, r) =>
  r.status(404).json({ error: "운영 빌드에는 편집 API가 없습니다." }),
);
app.use(express.static("dist"));
app.get("/", (_q, r) => r.sendFile(path.resolve("dist/index.html")));
app.use(
  (
    _e: unknown,
    _q: express.Request,
    r: express.Response,
    _n: express.NextFunction,
  ) => r.status(400).json({ error: "요청 또는 DB 연결을 확인하세요." }),
);
const server = app.listen(4173, "127.0.0.1", () =>
  console.log("실행 빌드 검증 · http://127.0.0.1:4173"),
);
process.on("SIGTERM", async () => {
  await db.pool?.end();
  server.close();
});
