import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
const base = path.resolve(".local"),
  data = path.join(base, "postgres"),
  config = path.join(base, "db-config.json");
mkdirSync(base, { recursive: true, mode: 0o700 });
function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0)
    throw Error(`${cmd} 실패: ${r.error?.message || r.stderr || "명령 실패"}`);
  return r.stdout;
}
if (process.argv[2] === "stop") {
  if (existsSync(data)) run("pg_ctl", ["-D", data, "-m", "fast", "stop"]);
  console.log("격리 DB 중지");
  process.exit();
}
if (!existsSync(config)) {
  const c = {
    host: "127.0.0.1",
    port: 55432,
    database: "reloaded_dev",
    user: "reloaded_local",
    password: randomBytes(32).toString("hex"),
  };
  writeFileSync(config, JSON.stringify(c), { mode: 0o600 });
}
const c = JSON.parse(readFileSync(config));
if (
  c.host !== "127.0.0.1" ||
  c.port !== 55432 ||
  c.database !== "reloaded_dev" ||
  c.user !== "reloaded_local" ||
  !/^[0-9a-f]{64}$/.test(c.password)
)
  throw Error("Unexpected isolated DB configuration");
if (!existsSync(path.join(data, "PG_VERSION"))) {
  const pass = path.join(base, "pg-password");
  writeFileSync(pass, c.password, { mode: 0o600 });
  try {
    run("initdb", [
      "-D",
      data,
      "-U",
      c.user,
      "--pwfile",
      pass,
      "--auth-local=scram-sha-256",
      "--auth-host=scram-sha-256",
      "--encoding=UTF8",
      "--locale=C",
    ]);
  } finally {
    (await import("node:fs")).unlinkSync(pass);
  }
}
const status = spawnSync("pg_ctl", ["-D", data, "status"]);
if (status.status !== 0)
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    path.join(base, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${c.port} -k ''`,
    "-w",
    "start",
  ]);
const pg = await import("pg");
const admin = new pg.default.Client({ ...c, database: "postgres" });
await admin.connect();
const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [
  c.database,
]);
if (!exists.rowCount) await admin.query("CREATE DATABASE reloaded_dev");
await admin.end();
const client = new pg.default.Client(c);
await client.connect();
await client.query(readFileSync("scripts/schema.sql", "utf8"));
const { rows } = await client.query(
  "SELECT id,scope,code,kind,display_name,purpose,physical_name,pg_type,revision,deleted_at FROM reloaded_meta.identity ORDER BY scope,code",
);
await client.end();
mkdirSync("examples/customer/.reloaded", { recursive: true });
writeFileSync(
  "examples/customer/.reloaded/db-metadata.json",
  JSON.stringify(
    { version: 1, source: "reloaded_meta.identity", objects: rows },
    null,
    2,
  ) + "\n",
);
console.log(
  "격리 PostgreSQL 준비 완료 · 127.0.0.1:55432/reloaded_dev · 비밀정보 .local/ 전용",
);
