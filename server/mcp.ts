import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";
import { readProject, applyPatch } from "./store.js";
import { patchSchema } from "../src/model.js";
const root = path.resolve(process.env.RELOADED_PROJECT || "examples/customer");
const server = new McpServer({ name: "reloaded-local", version: "0.1.0" });
server.registerTool(
  "project_read",
  {
    description:
      "Read local screen model and stable object IDs. No records or credentials.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => ({
    content: [{ type: "text", text: JSON.stringify(await readProject(root)) }],
  }),
);
server.registerTool(
  "object_patch",
  {
    description:
      "Persist a narrow object change with optimistic revision check. Does not execute code, SQL, or deploy.",
    inputSchema: {
      id: z.string().uuid(),
      expectedRevision: z.number().int().nonnegative(),
      patch: patchSchema,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
  },
  async ({ id, expectedRevision, patch }) => {
    try {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              await applyPatch(root, id, patch, expectedRevision),
            ),
          },
        ],
      };
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: e instanceof Error ? e.message : "Patch failed",
          },
        ],
      };
    }
  },
);
await server.connect(new StdioServerTransport());
