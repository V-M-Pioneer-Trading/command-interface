# Team rules

How heinzelwerk agents work in this repo. Mode rules (single repo vs workspace) live in the `heinzelwerk:team-modes` skill. This file holds only what is specific to this repo.

- **Autonomy**: full. Agents merge and apply on their own; breakages are learnings. Secrets are never published (name the variable, never the value); the gate never merges its own policy.
- **Frontend paths**: whole repo except `lcars-reference-files/` (vendored LCARS reference kit, never edited; eslint-ignored `eslint.config.mjs:6`). Code in `src/` (React 18 + Vite 6 + TanStack Query, TypeScript; tests `src/**/*.test.{ts,tsx}`, vitest + jsdom `vite.config.js:14-18`)
- **UI preview**: `npx vite --port $PORT --strictPort` · base URL `http://localhost:$PORT` · screenshots via `npx playwright screenshot` · publish via `ui-shots`
- **Worktree setup** (run once in every new task worktree): `npm ci && cp ../../../.env.local .` (the app shows a setup screen without `VITE_CLERK_PUBLISHABLE_KEY`; `.env.local` is git-ignored, lives in the main checkout)
- **Checks** (validator runs every one, in order; copied from CI, quiet flags only):
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm audit --audit-level=high (red on main: V-M-Pioneer-Trading/meta#136; not in CI)`
- **Verified against**: 562e1303 2026-10-29 (checks and every ref in this file; retro bumps it)
- **Coding standards**: `eslint.config.mjs:1-7` (shared `@v-m-pioneer-trading/eslint-config` `react` variant, type-aware), `package.json:13` lint with `--max-warnings 0`, config pinned by release tarball `package.json:25`; `tsconfig.json:16-20` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); plus `CLAUDE.md` "### Dependency rules" (:67) and "## Invariants" (:88); UI: `docs/agents/heinzelwerk/design.md`
- **Risk areas** (validator reviews diffs touching these on Opus). Each entry is a path/glob or a described kind of change, plus why it is risky:
  - Merge to `main` deploys to production: `npm run build` → `aws s3 sync ./dist s3://spacetraders-radomskyi-com --delete` → CloudFront invalidation, only when the commit is the tip of main: `.github/workflows/deploy.yml:84-175` (tip check :125-147, sync :167-170); deploy role trusts "refs/heads/main" only: `C:/Users/max/work/infrastructure/projects/spacetraders/main.tf:381`
  - Every UI action that spends game credits, gated by `fleet:control`: buy ship `src/components/map/WaypointPopover.tsx:24-32,105-129`; buy cargo `src/components/shipDetail/ShipDetailPanel.tsx:158-166` + `src/components/shipDetail/MarketList.tsx:61-70`; refuel `src/components/shipDetail/ShipDetailPanel.tsx:91-106`; sell `src/components/shipDetail/ShipDetailPanel.tsx:118-126`; navigate (fuel) `src/components/shipDetail/ShipDetailPanel.tsx:85-90`; extract / survey / deliver `src/components/shipDetail/ShipDetailPanel.tsx:107-151`; contract accept/fulfill `src/components/contracts/ContractsPanel.tsx:78-87`; autopilot arm, default mode `live` (starts unattended spending) `src/components/autopilot/AutopilotPanel.tsx:29,35-39`. Routes: `src/api/agentService.ts:29-50`, `src/api/fleetService.ts:23-80`, `src/api/automationService.ts:65-70`
  - Knob edits, gated by `planner:advise` (not `fleet:control`): change what the planner believes and does: `src/components/knobs/KnobEditor.tsx:47-59,100`, `src/api/automationService.ts:91-93`
  - Scope gating: controls render disabled, never hidden; the client-side scope decode is unverified and only decides enabled state, the server re-checks: `src/context/OperatorContext.ts:7-11,26-27,49-64`, `src/context/OperatorProvider.tsx:6,43,62`
  - Clerk token handling: `getToken()` per request, never cached in a module or a cache key: `src/api/automationService.ts:23-25`, `src/context/OperatorProvider.tsx:59-61`, `src/hooks/queryKeys.ts:13-16`; scopes cleared on sign-out `src/context/OperatorProvider.tsx:12-20`; only `main.tsx`, `src/context/OperatorProvider.tsx`, `OperatorBadge.tsx` import `@clerk/clerk-react` (`CLAUDE.md:78-82`)
  - The game token never enters the browser (st-gateway injects it); adding `X-SpaceTraders-Token` or `X-Priority` breaks the auth model: `src/api/client.ts:70-82`
  - automation-service GETs stay CORS-simple (no headers when unauthenticated): `src/api/automationService.ts:27-58`
  - New `VITE_*` env var = 4 edits: `src/api/config.ts:3-13`, `src/vite-env.d.ts:6-15`, `.env.example:7-24`, `.github/workflows/deploy.yml:98-114`; missing from .github/workflows/deploy.yml ships a localhost URL to production (`CLAUDE.md:225,334-336`)
  - Ungated reads fire for anonymous visitors (health poll, system waypoints, market, all automation reads): a new public call is a public request: `src/hooks/queries.ts:65-73,102-115,138-203`; WaypointPopover market/shipyard load with no token `src/components/map/WaypointPopover.tsx:41,53`
- **Contracts** (see team-modes **Contract changes**; validator checks every diff touching these):
  - Provided: none (static SPA, no server: `README.md:7-8`)
  - Consumed: agent-service `GET /current-agent|/agent|/ships|/ships/:s|/contracts|/contracts/:id`, `POST /contracts/:id/accept|fulfill`, `/ships/:s/purchase|sell`, `/ships/purchase` from `src/api/agentService.ts:19-51` · provider agent-service
  - Consumed: navigation-service `GET /waypoints/:sym`, `/systems/:id/waypoints`, `/waypoints/:sym/market|shipyard` from `src/api/navigationService.ts:19-28` · provider navigation-service
  - Consumed: fleet-service `POST /ships/:s/orbit|dock|navigate|extract|extract/survey|survey|refuel|transfer`, `/contracts/:id/deliver`, `PATCH /ships/:s/nav`, `GET /ships/:s/cooldown|cargo` from `src/api/fleetService.ts:23-80` · provider fleet-service
  - Consumed: automation-service `GET /autopilot/status`, `/autopilot/ships/:s`, `/metrics/context`, `/anomalies/digest`, `/planner/knobs`, `POST /autopilot/arm|pause|abort`, `PUT /planner/knobs/:name` from `src/api/automationService.ts:60-94`; 404 → `null` on ship task / metrics / anomalies · provider automation-service
  - Consumed: health `GET <origin>/api/{agent,navigation,fleet,automation,auth,st-gateway}/health` from `src/api/healthService.ts:31-52` · providers those six (ai-service bare `/health`, out of scope, dropped on https pages `src/api/healthService.ts:67-75`)
  - Consumed: `Authorization: Bearer <Clerk session>` on every authenticated call `src/api/client.ts:94-97`, `src/api/automationService.ts:46`; scopes `fleet:control`, `planner:advise` `src/context/OperatorContext.ts:26-27` · verifiers the four backends
  - Vendored: none (verified 2026-10-29 @ 562e1303: `git ls-files` shows no fixture or spec copies). Shared package by release tarball: eslint-config `package.json:25` · provider eslint-config
  - Shared types: `src/api/types.ts` hand-written subset, no codegen; checked by hand against agent-service `openapi.json`, `../fleet-service/openapi.json`, automation-service `src/` (`src/api/types.ts:1-12`; its agent-service path "ts/openapi.json" is stale, the file is at the repo root) · providers those services
  - Infra outputs: S3 bucket, deploy role, CloudFront distribution (repo var `CLOUDFRONT_DISTRIBUTION_ID`) from the frontend infra repo `C:/Users/max/work/infrastructure/projects/spacetraders/main.tf:381-387`, used at `.github/workflows/deploy.yml:164,170,175` · provider frontend infra (outside this workspace)
