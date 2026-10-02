// A small SELECT AST, not a SQL parser or database engine. Opaque SQL is never rewritten.
export type Identity = {
  id: string;
  scope: string;
  code: string;
  kind: string;
  display_name: string;
  physical_name: string;
  deleted_at?: string | null;
};
export type SelectAst = { tableId: string; fieldIds: string[]; limit: number };
const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
export function compileSelect(ast: SelectAst, metadata: Identity[]) {
  if (!Number.isInteger(ast.limit) || ast.limit < 1 || ast.limit > 1000)
    throw Error("Invalid limit");
  const table = metadata.find(
    (x) => x.id === ast.tableId && x.kind === "table" && !x.deleted_at,
  );
  if (!table) throw Error("테이블 유실");
  const fields = ast.fieldIds.map((id) => {
    const f = metadata.find(
      (x) =>
        x.id === id &&
        x.kind === "field" &&
        x.scope === table.scope + "." + table.code &&
        !x.deleted_at,
    );
    if (!f) throw Error("필드 유실");
    return f;
  });
  if (!fields.length) throw Error("필드 유실");
  return {
    sql: `SELECT ${fields.map((f) => quote(f.physical_name)).join(", ")} FROM ${table.physical_name.split(".").map(quote).join(".")} LIMIT $1`,
    params: [ast.limit],
    display: `SELECT ${fields.map((f) => quote(f.display_name)).join(", ")} FROM ${quote(table.display_name)} LIMIT ${ast.limit}`,
    ast,
  };
}
export function resolveName(name: string, objects: Identity[]) {
  const matches = objects.filter(
    (o) => o.display_name === name && !o.deleted_at,
  );
  if (matches.length !== 1)
    throw Error(
      matches.length ? "동일 이름을 stable ID로 구분하세요." : "필드 유실",
    );
  return matches[0].id;
}
