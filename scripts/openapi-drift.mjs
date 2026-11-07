// Usage: npm run openapi:drift
//
// Compares every committed openapi/*.json with the same file on meta main and
// exits 1, naming each service that differs. The fix is
// `npm run openapi:refresh -- <sha>` (the sha is printed), or the refresh PR
// that the openapi-refresh workflow opens.
//
// meta main is resolved to a commit sha once, then every copy is fetched by
// that sha: a raw branch URL is cached for minutes and could mix two commits.
// Bytes are compared as received, never decoded. The pin file
// openapi/meta-commit.txt is not compared: a pin-only difference is no drift.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const META = "V-M-Pioneer-Trading/meta";
const openapiDir = new URL("../openapi/", import.meta.url);

const services = readdirSync(openapiDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -".json".length))
  .sort();
if (services.length === 0) {
  console.error("no openapi/*.json copy present: nothing to compare, treated as a failure");
  process.exit(1);
}

// --exit-code: a failed lookup fails the run. The pattern matches ref-name
// suffixes too (x/refs/heads/main), so keep the exact ref only.
let refs;
try {
  refs = execFileSync("git", ["ls-remote", "--exit-code", `https://github.com/${META}.git`, "refs/heads/main"], {
    encoding: "utf8",
  });
} catch (e) {
  console.error(`cannot resolve meta main: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
const line = refs.split("\n").find((l) => l.split(/\s+/)[1] === "refs/heads/main");
const sha = line?.split(/\s+/)[0] ?? "";
if (!/^[0-9a-f]{40}$/.test(sha)) {
  console.error("refs/heads/main not found on meta");
  process.exit(1);
}

let failed = 0;
for (const service of services) {
  const label = `openapi/${service}.json`;
  const url = `https://raw.githubusercontent.com/${META}/${sha}/openapi/${service}.json`;
  try {
    const res = await fetch(url);
    if (res.status === 404) {
      failed++;
      console.error(`::error::${service}: missing on meta main @ ${sha} (404): ${label} has no source`);
      continue;
    }
    if (!res.ok) {
      failed++;
      console.error(`::error::${service}: fetch failed @ ${sha}: ${res.status} ${res.statusText}`);
      continue;
    }
    const remote = Buffer.from(await res.arrayBuffer());
    if (remote.equals(readFileSync(new URL(`${service}.json`, openapiDir)))) {
      console.log(`${service}: matches meta main @ ${sha}`);
    } else {
      failed++;
      console.error(
        `::error::${service}: differs from meta main @ ${sha}: run \`npm run openapi:refresh -- ${sha}\` or merge the refresh PR`,
      );
    }
  } catch (e) {
    failed++;
    console.error(`::error::${service}: fetch failed @ ${sha}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
// exitCode, not exit(): process.exit() with fetch sockets still closing trips a libuv assertion on Windows.
process.exitCode = failed === 0 ? 0 : 1;
