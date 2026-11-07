// Usage: npm run openapi:refresh -- <meta-commit-sha> [service ...]
//
// Copies openapi/<service>.json from the meta repo at an exact commit into
// ./openapi, writes the commit to openapi/meta-commit.txt, then regenerates
// src/generated. Refreshes every openapi/*.json already present, plus any
// service named on the command line (how a new service gets its first copy).
//
// The sha must be a full 40-hex commit: a raw URL by full sha is content
// addressed, so the copy is reproducible. Bytes are written as received, never
// decoded and re-encoded, so `git show <sha>:openapi/<service>.json | cmp`
// matches.
import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const openapiDir = new URL("openapi/", root);
const [sha, ...named] = process.argv.slice(2);

if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
  console.error("usage: npm run openapi:refresh -- <40-hex meta commit sha> [service ...]");
  process.exit(1);
}

mkdirSync(openapiDir, { recursive: true });
const present = readdirSync(openapiDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -".json".length));
const services = [...new Set([...present, ...named])];
if (services.length === 0) {
  console.error("no service: name one, e.g. agent-service");
  process.exit(1);
}

for (const service of services) {
  if (!/^[a-z][a-z0-9-]*$/.test(service)) {
    console.error(`bad service name: ${service}`);
    process.exit(1);
  }
  const url = `https://raw.githubusercontent.com/V-M-Pioneer-Trading/meta/${sha}/openapi/${service}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`${url}: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  writeFileSync(new URL(`${service}.json`, openapiDir), Buffer.from(await res.arrayBuffer()));
  console.log(`openapi/${service}.json @ ${sha}`);
}

writeFileSync(new URL("meta-commit.txt", openapiDir), `${sha}\n`);

const gen = spawnSync("npm", ["run", "openapi:generate"], {
  cwd: fileURLToPath(root),
  stdio: "inherit",
  shell: true,
});
process.exit(gen.status ?? 1);
