import { mkdir, writeFile } from "node:fs/promises";
import { projectSchema } from "../src/model.js";
for (const count of [100, 1000, 10000]) {
  const root = `.local/perf/${count}/.reloaded`;
  await mkdir(root, { recursive: true });
  const project = projectSchema.parse({
    version: 1,
    revision: 0,
    name: `CHECK-01 ${count}`,
    nodes: Array.from({ length: count }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      page: "register",
      kind: "input",
      label: `측정 ${i}`,
      binding: "name",
      x: 24 + (i % 20) * 96,
      y: 40 + Math.floor(i / 20) * 72,
      w: 80,
      h: 32,
    })),
  });
  await writeFile(root + "/project.json", JSON.stringify(project));
}
console.log("Real editor fixtures: .local/perf/{100,1000,10000}");
