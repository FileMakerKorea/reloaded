import test from "node:test";
import assert from "node:assert/strict";
import { SpringAdapter } from "../server/adapters.js";
test("Spring adapter rejects arbitrary destinations; preserves failures", async () => {
  assert.throws(() => new SpringAdapter("http://example.com"));
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("denied", { status: 403 });
  try {
    await assert.rejects(new SpringAdapter().list());
  } finally {
    globalThis.fetch = original;
  }
});
test("Spring adapter maps the explicit JSON contract without source rewrite (mock)", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) =>
    new Response(
      JSON.stringify(
        init?.method === "POST"
          ? { id: "record-id" }
          : [{ id: "record-id", name: "Synthetic", phone: "000" }],
      ),
      { status: 200 },
    );
  try {
    const adapter = new SpringAdapter();
    assert.equal((await adapter.list())[0].name, "Synthetic");
    assert.equal(
      (await adapter.insert({ name: "Synthetic", phone: "000" })).id,
      "record-id",
    );
  } finally {
    globalThis.fetch = original;
  }
});
