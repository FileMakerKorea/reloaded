import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const result = [];
let notices =
  "# Third-party notices\n\nGenerated from installed dependency license files. Includes development dependencies; distribution must retain the notices for the shipped subset. Electron Chromium notices are separate.\n";
for (const [dir, entry] of Object.entries(lock.packages)) {
  if (!dir) continue;
  try {
    const pkg = JSON.parse(
      await readFile(path.join(dir, "package.json"), "utf8"),
    );
    const names = await readdir(dir);
    const files = names.filter((n) =>
      /^(licen[sc]e|copying|notice)(\.|$|-)/i.test(n),
    );
    result.push({
      name: pkg.name,
      version: pkg.version,
      license: pkg.license || entry.license || "UNKNOWN",
      dev: !!entry.dev,
      licenseFiles: files.map((n) => dir + "/" + n),
    });
    for (const f of files) {
      try {
        notices +=
          `\n## ${pkg.name}@${pkg.version} — ${f}\n\n` +
          (await readFile(path.join(dir, f), "utf8")) +
          "\n";
      } catch {}
    }
  } catch {}
}
await mkdir("docs/evidence", { recursive: true });
await writeFile(
  "docs/evidence/licenses.json",
  JSON.stringify(result, null, 2) + "\n",
);
await writeFile("THIRD_PARTY_NOTICES.md", notices);
console.log(
  JSON.stringify(
    {
      installed: result.length,
      licenses: [...new Set(result.map((x) => x.license))],
      unknown: result.filter((x) => x.license === "UNKNOWN").map((x) => x.name),
    },
    null,
    2,
  ),
);
