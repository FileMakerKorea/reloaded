import assert from "node:assert/strict";
import http from "node:http";
import { writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:5173";
const r = await fetch(base + "/api/session");
const { token } = await r.json();
const badOrigin = await fetch(base + "/api/session", {
  headers: { Origin: "https://attacker.example" },
});
assert.equal(badOrigin.status, 403);
const noAuth = await fetch(base + "/api/project");
assert.equal(noAuth.status, 401);
const invalid = await fetch(base + "/api/project/save", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Reloaded-Token": token },
  body: JSON.stringify({ root: "/", expected: 0, project: { bad: true } }),
});
assert.equal(invalid.status, 400);
const leaks = [];
for (const route of [
  "/.local/db-config.json",
  "/@fs" + process.cwd() + "/.local/db-config.json",
  "/.git/config",
  "/.LOCAL/db-config.json",
  "/%2elocal/db-config.json",
]) {
  const res = await fetch(base + route);
  const text = await res.text();
  assert.ok(!text.includes('"password"') && !text.includes("[core]"));
  leaks.push({ route, status: res.status, secretAbsent: true });
}
const hostStatus = await new Promise<number | undefined>((resolve, reject) => {
  http
    .get(base + "/api/session", { headers: { Host: "evil.test" } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    })
    .on("error", reject);
});
assert.equal(hostStatus, 403);
await writeFile(
  "docs/evidence/security.json",
  JSON.stringify(
    {
      originRejected: badOrigin.status,
      unauthenticatedRejected: noAuth.status,
      invalidSchemaRejected: invalid.status,
      hostRejected: hostStatus,
      leaks,
    },
    null,
    2,
  ) + "\n",
);
console.log("Local API security checks passed");
