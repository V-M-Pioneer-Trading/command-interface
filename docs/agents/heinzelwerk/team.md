# Team rules

How heinzelwerk agents work in this repo. Mode rules (single repo vs workspace) live in the `heinzelwerk:team-modes` skill. This file holds only what is specific to this repo.

- **Autonomy**: full. Agents merge and apply on their own; breakages are learnings. Secrets are never published (name the variable, never the value), and the gate never merges its own policy.
- **Frontend paths**: whole repo (`src/`, `index.html`, `dev-map.html`)
- **UI preview**: `npm run dev` (vite, port 3000 with strictPort; 3000 is the backends' CORS origin, so keep it) · base URL http://localhost:3000; map-only stub at http://localhost:3000/dev-map.html needs no backend · screenshots via `npx playwright screenshot` · publish via `ui-shots`
- **Worktree setup**: `npm ci && cp "$(git rev-parse --path-format=absolute --git-common-dir)/../.env.local" .` (`.env.local` carries `VITE_CLERK_PUBLISHABLE_KEY`; only `npm run dev` needs it)
- **Checks** (copied from `.github/workflows/deploy.yml`, jobs `test`, `deploy`, in order):
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build` (the `deploy` job sets `VITE_*` from `.github/workflows/deploy.yml:98-114`; the build passes without them)
- **Checks verified on main**: 562e1303 2026-10-28
- **Coding standards**: `@v-m-pioneer-trading/eslint-config/react` (`package.json:25`; rules live in that package, never here); `docs/agents/heinzelwerk/design.md`; recipes in `CLAUDE.md`
- **Risk areas** (validator reviews diffs touching these on Opus):
  - Spend controls: `src/components/shipDetail/ShipDetailPanel.tsx` (refuel, purchase, sell), `MarketList.tsx`, `CargoList.tsx`, `src/components/map/WaypointPopover.tsx` (ship purchase), `src/components/contracts/ContractsPanel.tsx` (accept, fulfill), `src/components/autopilot/AutopilotPanel.tsx` (arm lets automation-service spend on its own)
  - `src/context/OperatorContext.ts`: scopes are decoded client-side and unverified; UI gating is cosmetic, backends enforce
  - `src/api/automationService.ts`: automation GETs stay CORS-simple (no custom headers)
  - `.github/workflows/deploy.yml`: a merge to main runs `aws s3 sync ./dist s3://spacetraders-radomskyi-com --delete` and a CloudFront invalidation
- **Contracts** (see team-modes **Contract changes**):
  - Consumed: agent-service /api/agent/v1, navigation-service /api/navigation/v1, fleet-service /api/fleet/v1, automation-service /api/automation/v1 (`src/api/config.ts:4-9`); health of auth-service, st-gateway, ai-service · providers those repos. Types are a hand-written subset in `src/api/types.ts`
  - A new env var touches `src/api/config.ts`, `src/vite-env.d.ts`, `.env.example` and `.github/workflows/deploy.yml`'s env together
