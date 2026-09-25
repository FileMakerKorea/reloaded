import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  mkdtemp,
  mkdir,
  copyFile,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const root = await mkdtemp(path.join(tmpdir(), "reloaded-mcp-"));
await mkdir(path.join(root, ".reloaded"));
await copyFile(
  "examples/customer/.reloaded/project.json",
  path.join(root, ".reloaded/project.json"),
);
const client = new Client({ name: "reloaded-test", version: "1.0" });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "server/mcp.ts"],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (x): x is [string, string] => x[1] !== undefined,
        ),
      ),
      RELOADED_PROJECT: root,
    },
  }),
);
try {
  const list = await client.listTools();
  assert.equal(list.tools.length, 2);
  const p = JSON.parse(
    (
      (await client.callTool({ name: "project_read", arguments: {} }))
        .content as Array<{ text: string }>
    )[0].text as string,
  );
  const result = await client.callTool({
    name: "object_patch",
    arguments: {
      id: p.nodes[1].id,
      expectedRevision: p.revision,
      patch: { w: 456 },
    },
  });
  assert.ok(!result.isError);
  const disk = JSON.parse(
    await readFile(path.join(root, ".reloaded/project.json"), "utf8"),
  );
  assert.equal(disk.nodes[1].w, 456);
  const stale = await client.callTool({
    name: "object_patch",
    arguments: {
      id: p.nodes[1].id,
      expectedRevision: p.revision,
      patch: { w: 500 },
    },
  });
  assert.equal(stale.isError, true);
  await writeFile(
    "docs/evidence/mcp.json",
    JSON.stringify(
      {
        transport: "stdio",
        tools: list.tools.map((t) => t.name),
        persistedWidth: disk.nodes[1].w,
        staleRejected: true,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("MCP integration passed");
} finally {
  await client.close();
  await rm(root, { recursive: true, force: true });
}
