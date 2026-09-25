import { z } from "zod";
export interface CustomerAdapter {
  list(): Promise<Array<{ id: string; name: string; phone: string }>>;
  insert(values: unknown): Promise<{ id: string }>;
}
const customer = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
});
// Existing Spring security and transactions remain owned by the Java service.
// Explicit local integration only; no arbitrary URL, SQL translation, or Java source edits.
export class SpringAdapter implements CustomerAdapter {
  constructor(readonly base = "http://127.0.0.1:8080") {
    if (base !== "http://127.0.0.1:8080")
      throw Error("Only configured local Spring adapter is supported");
  }
  async list() {
    const r = await fetch(this.base + "/api/customers", {
      signal: AbortSignal.timeout(3000),
      redirect: "error",
    });
    if (!r.ok) throw Error("Spring 고객 조회 실패");
    return z.array(customer).parse(await r.json());
  }
  async insert(values: unknown) {
    const v = z
      .object({
        name: z.string().trim().min(1).max(100),
        phone: z.string().max(40),
      })
      .strict()
      .parse(values);
    const r = await fetch(this.base + "/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
      signal: AbortSignal.timeout(3000),
      redirect: "error",
    });
    if (!r.ok) throw Error("Spring 고객 저장 실패");
    return z.object({ id: z.string() }).parse(await r.json());
  }
}
