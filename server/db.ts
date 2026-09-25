import pg from "pg";
import { z } from "zod";
import { readFile } from "node:fs/promises";
export const dbConfigSchema = z
  .object({
    host: z.literal("127.0.0.1"),
    port: z.number().int().min(1024).max(65535),
    database: z.string().min(1).max(64),
    user: z.string().min(1).max(64),
    password: z.string().max(512),
  })
  .strict();
export type DbConfig = z.infer<typeof dbConfigSchema>;
export class Database {
  pool: pg.Pool | undefined;
  isolated = false;
  async connect(config: DbConfig, isolated = false) {
    const checked = dbConfigSchema.parse(config);
    const candidate = new pg.Pool({
      ...checked,
      max: 4,
      connectionTimeoutMillis: 2500,
      statement_timeout: 5000,
    });
    try {
      const { rows } = await candidate.query(
        "SELECT current_database() AS database, version() AS version",
      );
      await this.pool?.end();
      this.pool = candidate;
      this.isolated = isolated;
      return {
        connected: true,
        database: rows[0].database,
        version: rows[0].version,
        isolated,
      };
    } catch {
      await candidate.end();
      throw Error("PostgreSQL 연결 실패: 호스트·포트·계정·DB를 확인하세요.");
    }
  }
  async local() {
    const c = JSON.parse(await readFile(".local/db-config.json", "utf8"));
    return this.connect(c, true);
  }
  async inspect() {
    if (!this.pool) throw Error("DB를 연결해 주세요."); // Comments first; never interpret descriptions as instructions.
    const comments = await this.pool.query(
      `SELECT c.relname AS table_name,a.attname AS column_name,COALESCE(col_description(c.oid,a.attnum),obj_description(c.oid)) AS purpose,format_type(a.atttypid,a.atttypmod) AS type FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE n.nspname='reloaded_demo' ORDER BY c.relname,a.attnum`,
    );
    return comments.rows;
  }
  async list() {
    if (!this.pool || !this.isolated)
      throw Error(
        "격리된 예제 DB 연결이 필요합니다. 외부 DB에는 예제 쿼리를 실행하지 않습니다.",
      );
    return (
      await this.pool.query(
        "SELECT id,f001 AS name,f002 AS phone FROM reloaded_demo.t001 ORDER BY created_at DESC LIMIT 1000",
      )
    ).rows;
  }
  async insert(values: unknown) {
    if (!this.pool || !this.isolated)
      throw Error("격리된 예제 DB를 연결해 주세요.");
    const v = z
      .object({
        name: z.string().trim().min(1).max(100),
        phone: z.string().max(40),
      })
      .strict()
      .parse(values);
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const r = await c.query(
        "INSERT INTO reloaded_demo.t001(f001,f002) VALUES($1,$2) RETURNING id",
        [v.name, v.phone],
      );
      await c.query("COMMIT");
      return r.rows[0];
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
}
