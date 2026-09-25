import { z } from "zod";
export const nodeSchema = z
  .object({
    id: z.string().uuid(),
    page: z.enum(["customers", "register", "settings", "popup"]),
    kind: z.enum(["input", "button", "text"]),
    label: z.string().min(1).max(160),
    x: z.number().finite().min(0).max(200000),
    y: z.number().finite().min(0).max(200000),
    w: z.number().finite().min(40).max(1200),
    h: z.number().finite().min(24).max(600),
    binding: z.enum(["name", "phone"]).optional(),
    action: z.enum(["save", "popup", "close"]).optional(),
  })
  .strict();
export const projectSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative(),
    name: z.string().min(1).max(80),
    nodes: z.array(nodeSchema).max(10000),
  })
  .strict()
  .superRefine((p, c) => {
    if (new Set(p.nodes.map((n) => n.id)).size !== p.nodes.length)
      c.addIssue({ code: "custom", message: "duplicate stable ID" });
  });
export type Project = z.infer<typeof projectSchema>;
export type LayoutNode = z.infer<typeof nodeSchema>;
export const patchSchema = nodeSchema
  .omit({ id: true, page: true, kind: true })
  .partial();
export type NodePatch = z.infer<typeof patchSchema>;
export function patchNode(p: Project, id: string, patch: NodePatch): Project {
  patchSchema.parse(patch);
  if (!p.nodes.some((n) => n.id === id)) throw Error("Object not found");
  return projectSchema.parse({
    ...p,
    nodes: p.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
  });
}
export function duplicate(
  p: Project,
  id: string,
  newId = crypto.randomUUID(),
): Project {
  const n = p.nodes.find((n) => n.id === id);
  if (!n) throw Error("Object not found");
  return projectSchema.parse({
    ...p,
    nodes: [
      ...p.nodes,
      {
        ...n,
        id: newId,
        x: Math.min(200000, n.x + 24),
        y: Math.min(200000, n.y + 24),
      },
    ],
  });
}
export function snap(value: number, targets: number[], threshold = 6): number {
  const nearest = targets.reduce(
    (a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a),
    Math.round(value / 8) * 8,
  );
  return Math.abs(nearest - value) <= threshold ? nearest : value;
}
export type Conversion =
  | { ok: true; value: number | null; original: unknown }
  | { ok: false; display: "???"; reason: string; original: unknown };
export function toNumber(original: unknown): Conversion {
  if (original === null || original === "")
    return { ok: true, value: null, original };
  if (
    (typeof original === "string" &&
      /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(original.trim())) ||
    typeof original === "number"
  ) {
    const value = Number(original);
    if (Number.isFinite(value)) return { ok: true, value, original };
  }
  return {
    ok: false,
    display: "???",
    reason: "숫자로 변환할 수 없음",
    original,
  };
}
export function historyPush(stack: Project[], p: Project) {
  return [...stack.slice(-99), structuredClone(p)];
}
