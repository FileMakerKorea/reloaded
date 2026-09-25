import { CodexClient } from "../server/codex.js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const c = new CodexClient();
let result: any;
try {
  result = await c.status();
} catch (e) {
  result = { available: false, error: (e as Error).message };
} finally {
  c.close();
}
if (result.authenticated) {
  await mkdir("work/codex-empty", { recursive: true });
  const runner = new CodexClient();
  try {
    result.inference = await runner.ask(
      "도구를 사용하지 말고 RELOADED 연결 확인 완료 라고만 답하세요.",
      path.resolve("work/codex-empty"),
    );
  } catch (e) {
    result.inference = { status: "failed", error: (e as Error).message };
  } finally {
    runner.close();
  }
}
await writeFile(
  "docs/evidence/codex.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
