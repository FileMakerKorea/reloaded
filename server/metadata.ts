import type pg from "pg";
// Administrative editing is restricted to the isolated demo adapter. Production gets versioned COMMENT SQL.
export async function renameMetadata(
  pool: pg.Pool,
  id: string,
  expected: number,
  name: string,
  purpose: string,
) {
  if (!name.trim() || name.length > 100 || purpose.length > 300)
    throw Error("Invalid metadata label");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const { rows } = await c.query(
      "SELECT * FROM reloaded_meta.identity WHERE id=$1 FOR UPDATE",
      [id],
    );
    const item = rows[0];
    if (!item || item.deleted_at || Number(item.revision) !== expected)
      throw Error("Metadata revision conflict");
    await c.query(
      "UPDATE reloaded_meta.identity SET display_name=$1,purpose=$2,revision=revision+1 WHERE id=$3",
      [name, purpose, id],
    );
    if (item.kind === "field") {
      const parent = await c.query(
        "SELECT physical_name FROM reloaded_meta.identity WHERE scope||'.'||code=$1 AND kind='table' AND deleted_at IS NULL",
        [item.scope],
      );
      if (!parent.rows[0]) throw Error("Missing parent");
      const target = parent.rows[0].physical_name
        .split(".")
        .concat(item.physical_name)
        .map((s: string) => '"' + s.replaceAll('"', '""') + '"')
        .join(".");
      const comment = (name + " — " + purpose).replaceAll("'", "''");
      await c.query(`COMMENT ON COLUMN ${target} IS '${comment}'`);
    } else if (item.kind === "table") {
      const target = item.physical_name
        .split(".")
        .map((s: string) => '"' + s.replaceAll('"', '""') + '"')
        .join(".");
      await c.query(
        `COMMENT ON TABLE ${target} IS '${(name + " — " + purpose).replaceAll("'", "''")}'`,
      );
    }
    await c.query("COMMIT");
    return (
      await pool.query(
        "SELECT * FROM reloaded_meta.identity ORDER BY scope,code",
      )
    ).rows;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
