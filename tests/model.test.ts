import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  projectSchema,
  patchNode,
  duplicate,
  toNumber,
  snap,
} from "../src/model.js";
import { saveProject, readProject } from "../server/store.js";
const fixture = projectSchema.parse(
  JSON.parse(
    await readFile("examples/customer/.reloaded/project.json", "utf8"),
  ),
);
test("stable ID survives edit; duplicate gets new UUID; page mapping preserved", () => {
  const n = fixture.nodes[1];
  const p = patchNode(fixture, n.id, { w: 400, h: 72 });
  assert.equal(p.nodes[1].id, n.id);
  const copy = duplicate(p, n.id);
  assert.notEqual(copy.nodes.at(-1)!.id, n.id);
  assert.equal(copy.nodes.at(-1)!.page, n.page);
  assert.equal(fixture.nodes[1].w, n.w);
});
test("reject invalid geometry, duplicate IDs and executable payload", () => {
  assert.throws(() => patchNode(fixture, fixture.nodes[1].id, { w: NaN }));
  assert.throws(() => patchNode(fixture, fixture.nodes[1].id, { w: -1 }));
  assert.throws(() =>
    projectSchema.parse({
      ...fixture,
      nodes: [...fixture.nodes, fixture.nodes[0]],
    }),
  );
  assert.throws(() =>
    patchNode(fixture, fixture.nodes[1].id, { onclick: "eval()" } as any),
  );
});
test("snap threshold and conversion preserve original/error state", () => {
  assert.equal(snap(99, [100]), 100);
  assert.deepEqual(toNumber("ABC"), {
    ok: false,
    display: "???",
    reason: "숫자로 변환할 수 없음",
    original: "ABC",
  });
  assert.deepEqual(toNumber("123"), { ok: true, value: 123, original: "123" });
  assert.equal(toNumber(true).ok, false);
  assert.equal(toNumber("0x10").ok, false);
  assert.equal(toNumber("Infinity").ok, false);
});
test("atomic persistence rejects stale writes including concurrent clients", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reloaded-test-"));
  try {
    await mkdir(path.join(root, ".reloaded"));
    await writeFile(
      path.join(root, ".reloaded/project.json"),
      JSON.stringify(fixture),
    );
    const results = await Promise.allSettled([
      saveProject(root, fixture, fixture.revision),
      saveProject(root, fixture, fixture.revision),
    ]);
    assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
    const p = await readProject(root);
    assert.equal(p.revision, fixture.revision + 1);
    await assert.rejects(saveProject(root, fixture, fixture.revision));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
import { compileSelect, resolveName } from "../src/query.js";
test("AST identity survives rename; missing refs and ambiguous names fail closed", () => {
  const t = {
    id: "table",
    scope: "D001",
    code: "T001",
    kind: "table",
    display_name: "고객",
    physical_name: "public.customers",
  };
  const f = {
    id: "field",
    scope: "D001.T001",
    code: "F001",
    kind: "field",
    display_name: "고객명",
    physical_name: "name",
  };
  const ast = { tableId: "table", fieldIds: ["field"], limit: 10 };
  const a = compileSelect(ast, [t, f]),
    b = compileSelect(ast, [t, { ...f, display_name: "거래처명" }]);
  assert.equal(a.sql, b.sql);
  assert.notEqual(a.display, b.display);
  assert.throws(() => compileSelect(ast, [t]));
  assert.throws(() => resolveName("고객명", [f, { ...f, id: "other" }]));
  assert.equal(
    compileSelect(ast, [t, { ...f, physical_name: '";drop' }]).sql,
    'SELECT """;drop" FROM "public"."customers" LIMIT $1',
  );
});
import {symlink} from 'node:fs/promises';
test('metadata symlinks and sources writes fail closed',async()=>{const root=await mkdtemp(path.join(tmpdir(),'reloaded-boundary-'));try{const model=path.join(root,'original.json');await writeFile(model,JSON.stringify(fixture));await mkdir(path.join(root,'.reloaded'));await symlink(model,path.join(root,'.reloaded/project.json'));await assert.rejects(readProject(root));const source=path.join(root,'sources','sample');await mkdir(path.join(source,'.reloaded'),{recursive:true});await writeFile(path.join(source,'.reloaded/project.json'),JSON.stringify(fixture));await assert.rejects(saveProject(source,fixture,fixture.revision));assert.equal((await readProject(source)).revision,fixture.revision);}finally{await rm(root,{recursive:true,force:true});}});
