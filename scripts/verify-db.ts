import assert from "node:assert/strict";
import pg from "pg";
import { readFile, writeFile } from "node:fs/promises";
import { Database } from "../server/db.js";
import { renameMetadata } from "../server/metadata.js";
const db = new Database();
const connection = await db.local();
const comments = await db.inspect();
assert.ok(comments.some((r) => r.purpose?.includes("고객 표시 이름")));
const config = JSON.parse(await readFile(".local/db-config.json", "utf8"));
const c = new pg.Client(config);
await c.connect();
const scope = "test-" + crypto.randomUUID();
try {
  const calls = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      db.pool!.query("SELECT * FROM reloaded_meta.allocate($1,$2,$3,$4,$5)", [
        scope,
        "field",
        "검증 " + i,
        "동시성 검증",
        "f" + i,
      ]),
    ),
  );
  assert.equal(new Set(calls.map((r) => r.rows[0].code)).size, 12);
  const code = calls[0].rows[0].code;
  await c.query(
    "UPDATE reloaded_meta.identity SET deleted_at=now() WHERE scope=$1 AND code=$2",
    [scope, code],
  );
  const next = await c.query(
    "SELECT * FROM reloaded_meta.allocate($1,$2,$3,$4,$5)",
    [scope, "field", "다시 생성", "코드 재사용 금지", "new"],
  );
  assert.equal(next.rows[0].code, "F013");
  await c.query("BEGIN");
  const r = await c.query(
    "INSERT INTO reloaded_demo.t001(f001,f002) VALUES('ROLLBACK_TEST','000') RETURNING id",
  );
  await c.query("ROLLBACK");
  assert.equal(
    (
      await c.query("SELECT id FROM reloaded_demo.t001 WHERE id=$1", [
        r.rows[0].id,
      ])
    ).rowCount,
    0,
  );
  await assert.rejects(db.insert({ name: "", phone: "" }));
  const saved = await db.insert({
    name: "RELOADED_SYNTHETIC_TEST",
    phone: "000-0000-0000",
  });
  assert.ok((await db.list()).some((r) => r.id === saved.id));
  await c.query("DELETE FROM reloaded_demo.t001 WHERE id=$1", [saved.id]);
  const original = (
    await c.query(
      "SELECT * FROM reloaded_meta.identity WHERE scope='D001.T001' AND code='F001'",
    )
  ).rows[0];
  await renameMetadata(
    db.pool!,
    original.id,
    Number(original.revision),
    "검증 ' 이름",
    "원본을 보존한 이름 변경",
  );
  try {
    const changed = await db.inspect();
    assert.ok(
      changed.some(
        (row) => row.purpose === "검증 ' 이름 — 원본을 보존한 이름 변경",
      ),
    );
    await assert.rejects(
      renameMetadata(
        db.pool!,
        original.id,
        Number(original.revision),
        "stale",
        "stale",
      ),
    );
  } finally {
    await renameMetadata(
      db.pool!,
      original.id,
      Number(original.revision) + 1,
      original.display_name,
      original.purpose,
    );
  }
  await writeFile(
    "docs/evidence/db.json",
    JSON.stringify(
      {
        connection,
        commentsReadFirst: true,
        concurrentUniqueCodes: 12,
        nextCode: next.rows[0].code,
        rollback: true,
        customerInsertRead: true,
        invalidNameRejected: true,
        canonicalRenameAndComment: true,
        staleMetadataRenameRejected: true,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("DB integration passed");
} finally {
  await c.query("DELETE FROM reloaded_meta.identity WHERE scope=$1", [scope]);
  await c.query("DELETE FROM reloaded_meta.counter WHERE scope=$1", [
    scope + ":field",
  ]);
  await c.end();
  await db.pool?.end();
}
