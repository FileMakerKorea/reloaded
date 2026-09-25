import { build } from "vite";
import { mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { readProject } from "../server/store.js";
const project = await readProject(
  process.env.RELOADED_PROJECT || "examples/customer",
);
const dir = path.resolve("work/generated");
await mkdir(dir, { recursive: true });
const measured = process.env.RELOADED_MEASURE === "1";
const measurementImport = measured ? ";const started=performance.now();" : "";
const measurementEffect = measured
  ? `React.useEffect(()=>{requestAnimationFrame(()=>requestAnimationFrame(()=>{document.documentElement.dataset.measurement=JSON.stringify({count:${project.nodes.length},elapsedMs:performance.now()-started,dom:document.querySelectorAll('.business-node, .business-node *').length,heapMB:performance.memory?performance.memory.usedJSHeapSize/1048576:null});}));},[]);`
  : "";
const lit = (x: unknown) => JSON.stringify(x).replaceAll("<", "\\u003c");
function node(n: (typeof project.nodes)[number]) {
  const style = lit({ left: n.x, top: n.y, width: n.w, height: n.h });
  const label = "{" + lit(n.label) + "}";
  return `<div className=${lit("business-node " + n.kind)} style={${style}}>${n.kind === "input" ? `<label className="field-caption" htmlFor=${lit("f" + n.id)}>${label}</label><input id=${lit("f" + n.id)} aria-label={${lit(n.label)}} value={s.values[${lit(n.binding || "name")}]} onChange={e=>s.setValues({...s.values,[${lit(n.binding || "name")}]:e.target.value})}/>` : n.kind === "button" ? `<button onClick={()=>s.action(${lit(n.action)})}>${label}</button>` : `<span>${label}</span>`}</div>`;
}
function canvas(page: string) {
  const nodes = project.nodes.filter((n) => n.page === page);
  return `<div className="canvas" style={{minHeight:${Math.max(page === "popup" ? 220 : 480, ...nodes.map((n) => n.y + n.h + 50))},width:${Math.max(page === "popup" ? 500 : 760, ...nodes.map((n) => n.x + n.w + 40))}}}>${nodes.map(node).join("")}</div>`;
}
await writeFile(
  path.join(dir, "main.tsx"),
  `import React from 'react';import {createRoot} from 'react-dom/client';import {Shell,CustomerList,useBusiness} from '../../src/runtime/Business';import '../../src/runtime/style.css'${measurementImport};function App(){const s=useBusiness();${measurementEffect}return <Shell s={s} header={<span>실행 앱</span>} popup={${canvas("popup")}}>{s.page==='register'?<><div className="page-title"><h1>고객 등록</h1></div><div className="canvas-scroll">${canvas("register")}</div></>:s.page==='customers'?<CustomerList s={s}/>:<div className="guide">RELOADED 고객관리 · 운영 실행 빌드</div>}</Shell>};createRoot(document.getElementById('root')!).render(<App/>);`,
);
await writeFile(
  path.join(dir, "index.html"),
  '<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>RELOADED 고객관리</title></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>',
);
const runtimeBuild = await build({
  root: dir,
  build: { outDir: path.resolve("dist"), emptyOutDir: true, sourcemap: false },
});
if (!measured)
  await build({
    build: { outDir: "work/editor-build", emptyOutDir: true, sourcemap: false },
  });
const outputs = (
  Array.isArray(runtimeBuild) ? runtimeBuild : [runtimeBuild]
).flatMap((result) => ("output" in result ? result.output : []));
const runtimeModules = outputs
  .flatMap((chunk) =>
    chunk.type === "chunk" ? Object.keys(chunk.modules) : [],
  )
  .map((file) => path.relative(process.cwd(), file));
if (
  runtimeModules.some((file) =>
    /src\/editor|src\/model|project\.json|db-metadata\.json/.test(file),
  )
)
  throw Error("Editor module included in runtime");
await writeFile(
  "dist/THIRD_PARTY_NOTICES.txt",
  (
    await Promise.all(
      ["react", "react-dom", "scheduler"].map(
        async (name) =>
          name +
          "\n" +
          (await readFile("node_modules/" + name + "/LICENSE", "utf8")),
      ),
    )
  ).join("\n\n"),
);
async function sizes(dir: string) {
  const result: any[] = [];
  for (const f of await readdir(dir, { recursive: true })) {
    const file = path.join(dir, f);
    if ((await stat(file)).isFile()) {
      const data = await readFile(file);
      if (
        dir === "dist" &&
        /object_patch|data-object-id|resize-handle|project\.json|db-metadata\.json|Codex에 변경안/.test(
          data.toString(),
        )
      )
        throw Error("Editor leakage: " + file);
      if (dir === "dist" && f.endsWith(".map"))
        throw Error("Unexpected source map");
      result.push({ file: f, bytes: data.length, gzip: gzipSync(data).length });
    }
  }
  return result;
}
const report = {
  runtime: await sizes("dist"),
  editor: await sizes("work/editor-build"),
  checks: { editorMetadataAbsent: true, sourceMapsAbsent: true },
  modelRevision: project.revision,
  runtimeModules,
};
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  measured
    ? `docs/evidence/build-${project.nodes.length}.json`
    : "docs/evidence/build.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log("Production separation verified");
