import { readFile, writeFile, rename } from "node:fs/promises";
import pg from "pg";
import { renameMetadata } from "../server/metadata.js";
const pool = new pg.Pool(
  JSON.parse(await readFile(".local/db-config.json", "utf8")),
);
try {
  if (process.argv[2] === "rename") {
    const [id, revision, name, purpose] = process.argv.slice(3);
    await renameMetadata(pool, id, Number(revision), name, purpose);
  } else if (process.argv[2] !== "export")
    throw Error(
      "Usage: metadata.ts export | rename UUID REVISION NAME PURPOSE",
    );
  const rows = (
    await pool.query(
      "SELECT id,scope,code,kind,display_name,purpose,physical_name,pg_type,revision,deleted_at FROM reloaded_meta.identity ORDER BY scope,code",
    )
  ).rows;
  const file = "examples/customer/.reloaded/db-metadata.json";
  await writeFile(
    file + ".tmp",
    JSON.stringify(
      { version: 1, source: "reloaded_meta.identity", objects: rows },
      null,
      2,
    ) + "\n",
  );
  await rename(file + ".tmp", file);
  console.log("관리 테이블 → metadata 스냅샷 갱신. Git diff로 검토하세요.");
} finally {
  await pool.end();
}
