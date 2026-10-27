# Team rules

How heinzelwerk agents work in this repo. Mode rules (single repo vs workspace) live in the `heinzelwerk:team-modes` skill. This file holds only what is specific to this repo; the workspace is described in V-M-Pioneer-Trading/meta `docs/agents/heinzelwerk/workspace.md`.

- **Autonomy**: full. Agents merge and apply on their own; breakages are learnings. Secrets are never published (name the variable, never the value), and the gate never merges its own policy.
- **Role**: frontend
- **Frontend paths**: whole repo
- **UI preview**: `npm run dev` (port 3000 is pinned, `strictPort`: one preview at a time) · base URL http://localhost:3000 · screenshots via `npx playwright screenshot` · publish via `ui-shots`
- **Worktree setup**: `npm ci`
- **Checks** (validator runs every one, in order; copied from CI, quiet flags only):
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm audit --audit-level=high` (red on main: V-M-Pioneer-Trading/meta#119)
- **Checks verified on main**: 562e1303 2026-10-27
- **Coding standards**: `CLAUDE.md`, the shared `@v-m-pioneer-trading/eslint-config` React variant, and `docs/agents/heinzelwerk/design.md`
- **Risk areas** (validator reviews diffs touching these on Opus):
  - `src/api/**`, `src/context/OperatorContext.ts`, `src/main.tsx`: credentials and the Clerk session
  - UI actions that move credits (purchase ship/cargo, refuel, sell, contract accept/fulfill, deliver) and arm the autopilot (default mode `live`)
  - `.github/workflows/deploy.yml`: `aws s3 sync --delete` to production on every merge; every new `VITE_*` var goes there too
  - `.github/workflows/**`: a merge to `main` deploys or releases
- **Contracts** (see team-modes **Contract changes**; validator checks every diff touching these):
  - Backend APIs: each service's `openapi.json` (agent, fleet, navigation) and automation-service routes; `src/api/types.ts` mirrors a subset · provider = that service
