import {
  readFile,
  writeFile,
  rename,
  mkdir,
  realpath,
  rm,
  lstat,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  projectSchema,
  patchNode,
  patchSchema,
  type Project,
} from "../src/model.js";
export class Conflict extends Error {}
export async function projectFile(root: string) {
  const real = await realpath(root);
  const dir = path.join(real, ".reloaded");
  if ((await lstat(dir)).isSymbolicLink())
    throw Error("Metadata directory symlink not allowed");
  const file = path.join(dir, "project.json");
  if ((await lstat(file)).isSymbolicLink())
    throw Error("Metadata symlink not allowed");
  return file;
}
export async function readProject(root: string): Promise<Project> {
  return projectSchema.parse(
    JSON.parse(await readFile(await projectFile(root), "utf8")),
  );
}
export async function saveProject(
  root: string,
  next: Project,
  expected: number,
) {
  if ((await realpath(root)).split(path.sep).includes("sources"))
    throw Error("Read-only sources");
  const file = await projectFile(root);
  const lock = file + ".lock";
  try {
    await mkdir(lock);
  } catch {
    throw new Conflict("다른 저장이 진행 중입니다. 다시 읽어 주세요.");
  }
  try {
    const previous = await readProject(root);
    if (previous.revision !== expected)
      throw new Conflict("다른 변경이 있습니다. 다시 열어 병합하세요.");
    const data = projectSchema.parse({
      ...next,
      revision: previous.revision + 1,
    });
    const tmp = file + "." + randomUUID() + ".tmp";
    await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    await rename(tmp, file);
    return data;
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
export async function applyPatch(
  root: string,
  id: string,
  patch: unknown,
  revision: number,
) {
  const p = await readProject(root);
  return saveProject(
    root,
    patchNode(p, id, patchSchema.parse(patch)),
    revision,
  );
}
