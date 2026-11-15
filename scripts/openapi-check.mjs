// Usage: node scripts/openapi-check.mjs [--write]
//
// One openapi-typescript run per openapi/<service>.json: without --write it
// checks src/generated/<service>.ts is current, with --write it regenerates it.
//
// Why not `openapi-typescript --check` with the `apis` in redocly.yaml: the CLI
// loads ./redocly.yaml, then ignores its input argument, and runs the `apis`
// entries in parallel, calling process.exit as soon as one finishes. Whichever
// entry is first done decides the exit code and the others never report (a
// stale automation-service file passed while agent-service was current). So the
// CLI runs here once per service, from a temp cwd that has no redocly.yaml, with
// absolute paths.
//
// Fails closed: no copy at all, a copy without a generated file, or a generated
// file without a copy.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const write = process.argv.includes("--write");
const root = fileURLToPath(new URL("../", import.meta.url));
const names = (dir, ext) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(ext))
        .map((f) => f.slice(0, -ext.length))
        .sort()
    : [];

const copies = names(join(root, "openapi"), ".json");
const generated = names(join(root, "src/generated"), ".ts");
const problems = [];
if (copies.length === 0) problems.push("no openapi/*.json copy: nothing to check");
for (const s of copies) if (!write && !generated.includes(s)) problems.push(`openapi/${s}.json has no src/generated/${s}.ts`);
for (const s of generated) if (!copies.includes(s)) problems.push(`src/generated/${s}.ts has no openapi/${s}.json`);

const bin = join(root, "node_modules/openapi-typescript/bin/cli.js");
const cwd = mkdtempSync(join(tmpdir(), "openapi-check-"));
try {
  if (problems.length === 0) {
    for (const s of copies) {
      const args = [bin, join(root, "openapi", `${s}.json`), "-o", join(root, "src/generated", `${s}.ts`)];
      if (!write) args.push("--check");
      const run = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
      if (run.status !== 0) problems.push(`${s}: ${write ? "generate" : "generated file is stale"}\n${run.stdout}${run.stderr}`);
      else console.log(`${s}: ${write ? "generated" : "current"}`);
    }
  }
} finally {
  rmSync(cwd, { recursive: true, force: true });
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
