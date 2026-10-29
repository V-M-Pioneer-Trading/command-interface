# Repo map: V-M-Pioneer-Trading/command-interface
Verified against 562e1303 2026-10-29.

## Purpose
- LCARS-styled React/Vite SPA: one-system live map plus operator controls; no server of its own; static files on S3 behind CloudFront (`README.md:1-8`, `package.json:5`).

## Layout
- `src/main.tsx` root render, provider nesting, missing-Clerk-key screen; `src/App.tsx` renders `Dashboard` only (`src/App.tsx:8-10`). Module table: `CLAUDE.md:28-65`.
- `src/api/` one function per backend route (`agentService.ts`, `navigationService.ts`, `fleetService.ts`, `src/api/automationService.ts`, `src/api/healthService.ts`); shared `request`/`readResponse`/`ApiError` in `src/api/client.ts:2-107`; env → URLs `src/api/config.ts:3-13`; hand-written types `src/api/types.ts:1-12`.
- `src/context/` Operator (Clerk identity + scopes), Alert (toasts), Selection (selected ship) (`src/context/OperatorContext.ts:26-47`, `src/context/AlertProvider.tsx:20-24`).
- `src/hooks/` every query hook and poll interval `src/hooks/queries.ts:11-21`; every cache key `src/hooks/queryKeys.ts:24-41`; map viewport binding `src/hooks/useMapViewport.ts`.
- `src/map/` pure layout/viewport/sprite math, imports nothing outside `src/map/` (`CLAUDE.md:71-73`; holds, verified 2026-10-29 @ 562e1303: grep finds no `../` escape or package import in `src/map`).
- `src/components/<area>/` panels + co-located CSS; shared pieces in `src/components/common/` (`src/components/common/Panel.tsx`, `src/components/common/PillButton.tsx`, `src/components/common/QueryState.tsx`, `src/components/common/StatusPill.tsx`). Design rules: `docs/agents/heinzelwerk/design.md`.
- `src/styles/` tokens `src/styles/theme.css:1-34`, fonts `src/styles/fonts.css:1-15`, globals `src/styles/global.css:1-43`.
- `src/devMap.tsx` + `dev-map.html`: dev-only map harness with stubbed fetch and operator, never bundled (`README.md:124-131`, `CLAUDE.md:18`).
- `lcars-reference-files/`: vendored LCARS kit, reference only, eslint-ignored (`eslint.config.mjs:6`, `README.md:371-375`).

## Entry points and auth
- Provider order Clerk > Operator > QueryClient > Alert > App, load-bearing (`src/main.tsx:46-62`, `CLAUDE.md:178-189`).
- Empty `VITE_CLERK_PUBLISHABLE_KEY` renders a setup screen instead of the app (`src/main.tsx:29-44`).
- No login wall: the whole dashboard renders signed out (`src/App.tsx:3-7`).
- Sign-in: Clerk Google OAuth redirect (`src/components/operator/OperatorBadge.tsx:77-84`).
- One credential: `Authorization: Bearer <Clerk getToken()>`, sent only when a token exists (`src/api/client.ts:94-97`, `src/api/automationService.ts:44-46`). Game token never in the browser; st-gateway injects it (`src/api/client.ts:70-78`).
- Scopes decoded client-side from the session token, unverified, re-read every 60 s and on focus/visibility (`src/context/OperatorContext.ts:7-11,49-64`, `src/context/OperatorProvider.tsx:6,39-45`). `fleet:control`, `planner:advise` (`src/context/OperatorContext.ts:26-27`).

## Reads without sign-in
- Gated (signed-in only) via `useGatedQuery`: agent, ships, contracts, cooldown, cargo (`src/hooks/queries.ts:49-62,75-136`).
- Ungated: health poll, system waypoints, market, all automation reads (status, ship task, metrics, anomalies, knobs) (`src/hooks/queries.ts:67-73,105-115,138-203`). WaypointPopover loads market and shipyard with no token (`src/components/map/WaypointPopover.tsx:41,53`).

## Money / spend paths (UI → call; `fleet:control` unless noted)
- Buy ship: "Buy" → "Confirm (Ncr)" → `agentService.purchaseShip` (`src/components/map/WaypointPopover.tsx:24-32,105-129`).
- Buy cargo: MarketList "Confirm (Ncr)" → `purchaseCargo` (`src/components/shipDetail/MarketList.tsx:61-70`, `src/components/shipDetail/ShipDetailPanel.tsx:158-166`); sell via CargoList → `agentService.sell` (`src/components/shipDetail/ShipDetailPanel.tsx:118-126,300-301`).
- Navigate (fuel) `src/components/shipDetail/ShipDetailPanel.tsx:85-90`, refuel (credits) `:91-106`, extract `:107-111`, deliver `:127-143`.
- Contract accept / fulfill (payout) `src/components/contracts/ContractsPanel.tsx:78-87`.
- Autopilot arm, default mode `live`, shadow selectable (`src/components/autopilot/AutopilotPanel.tsx:29,35-39,87-96`).
- Knob set needs `planner:advise`, not `fleet:control` (`src/components/knobs/KnobEditor.tsx:47-59,100`).
- Controls render disabled, not hidden (`src/components/autopilot/AutopilotPanel.tsx:20-24`).

## Calls (all from `src/api/`)
- agent-service: GET `/current-agent`, `/agent`, `/ships`, `/ships/:s`, `/contracts`, `/contracts/:id`; POST `/contracts/:id/{accept,fulfill}`, `/ships/:s/{purchase,sell}`, `/ships/purchase` (`src/api/agentService.ts:19-51`).
- navigation-service: GET `/waypoints/:sym`, `/systems/:id/waypoints`, `/waypoints/:sym/{market,shipyard}`; token optional (`src/api/navigationService.ts:7,19-28`).
- fleet-service: POST `/ships/:s/{orbit,dock,navigate,extract,extract/survey,survey,refuel,transfer}`, `/contracts/:id/deliver`; PATCH `/ships/:s/nav`; GET `/ships/:s/{cooldown,cargo}` (`src/api/fleetService.ts:23-80`).
- automation-service: GET `/autopilot/status`, `/autopilot/ships/:s` (404 = unmanaged), `/metrics/context`, `/anomalies/digest` (404 = not enabled), `/planner/knobs`; POST `/autopilot/{arm,pause,abort}`; PUT `/planner/knobs/:name` (`src/api/automationService.ts:60-94`).
- Health only: `<origin>/api/{agent,navigation,fleet,automation,auth,st-gateway}/health`, ai-service bare `/health`; 5 s timeout; on an https page non-https targets are dropped (`src/api/healthService.ts:31-52,67-75,88-97`).
- Called by: nothing (unverified). Port 3000 is the backends' default CORS origin (`vite.config.js:6-9`; e.g. `../automation-service/src/config.ts:193`).

## Persistence
- None: no localStorage / sessionStorage / indexedDB / cookie in `src` (verified 2026-10-29 @ 562e1303: grep 0). Surveys memory-only, lost on reload (`CLAUDE.md:266-267`).
- React Query in memory, `retry: 1`, `refetchOnWindowFocus: false` (`src/main.tsx:12-19`).

## Build / run
- `npm run dev` = vite on 3000, `strictPort` (`package.json:8`, `vite.config.js:6-9`); preview config `.claude/launch.json:1-11`.
- `npm test` = `vitest run`, jsdom, `src/**/*.test.{ts,tsx}`, `restoreMocks` (`package.json:11`, `vite.config.js:14-18`). One dir: `npx vitest run src/map` (`CLAUDE.md:17`).
- `typecheck` = `tsc --noEmit` (only type check; esbuild strips types), `lint` = `eslint . --max-warnings 0`, `build`, `preview` (`package.json:9-13`, `CLAUDE.md:14`).
- Env: git-ignored `.env.local`, `.env.*.local` (`.gitignore:20-21`); template `.env.example:1-24`; other `VITE_*` fall back to localhost (`src/api/config.ts:3-13`).
- Node 24 in CI; jsdom 30 needs Node >= 22.22 (`.github/workflows/deploy.yml:41-44,59`).

## CI / deploy
- One workflow "Deploy Website": push main, pull_request (no branch filter), workflow_dispatch (`.github/workflows/deploy.yml:1-11`).
- Job `test`: `npm ci` → typecheck → lint (`if: always()`) → test (`if: always()`) (`.github/workflows/deploy.yml:45-82`). Build is not in `test`; it runs in `deploy` (`.github/workflows/deploy.yml:157-158`).
- Job `deploy` (not on PRs, `needs: test`): tip-of-main check → build → assume `command-interface-deploy` → `aws s3 sync ./dist s3://spacetraders-radomskyi-com --delete` → CloudFront invalidation `/*` (`.github/workflows/deploy.yml:84-175`).
- Deploy env: agent/navigation/fleet/automation = `https://spacetraders.radomskyi.com/api/<svc>/v1`; auth/st-gateway bare origin; Clerk key from repo var; `VITE_AI_SERVICE_URL` deliberately absent (`.github/workflows/deploy.yml:98-114`).
- Main-run concurrency group, `cancel-in-progress: false` (`.github/workflows/deploy.yml:32-34`).
- Deploy role trusts `repo:V-M-Pioneer-Trading/command-interface:ref:refs/heads/main` (`C:/Users/max/work/infrastructure/projects/spacetraders/main.tf:381-387`).
- `main` protected, required check `test`, enforce_admins on (verified 2026-10-29 @ 562e1303: `gh api .../branches/main/protection`).

## Patterns
- Backend call = one function in `src/api/*Service.ts`; no `fetch` outside `src/api/` (`CLAUDE.md:304-306`; holds, verified 2026-10-29 @ 562e1303: grep `fetch(` hits only `src/api/client.ts:98`, `src/api/automationService.ts:48`, `src/api/healthService.ts:96`, plus `devMap.tsx` stub).
- Cache keys only from `src/hooks/queryKeys.ts`, no array literals (`CLAUDE.md:85-86`).
- Signed-in reads via `useGatedQuery`, intervals as named `*_POLL_MS` (`src/hooks/queries.ts:11-21,49-62`).
- Mutation: call with `await getToken()` → invalidate keys (table `CLAUDE.md:206-213`) → `pushAlert` on error (`src/components/autopilot/AutopilotPanel.tsx:33-39`).
- `@clerk/clerk-react` imported only by `main.tsx`, `src/context/OperatorProvider.tsx`, `OperatorBadge.tsx` (+1 test) (`CLAUDE.md:78-82`).
- `undefined` / `null` / rejection stay distinct through `QueryState` (`src/components/common/QueryState.tsx:16-61`, `CLAUDE.md:136-140`).
- Toggle panel = 4 edits: `PANEL_ORDER` `src/utils/togglePanelLayout.ts:6`, `PANEL_WIDTH_REM` `:11-16`, `PANEL_BUTTONS` `src/components/layout/AgentBar.tsx:13-18`, branch `src/components/layout/Dashboard.tsx:42-45`; CSS width = rem entry (4/4 match, e.g. `src/components/knobs/KnobEditor.css:5`).
- New `VITE_*` = 4 edits: `config.ts`, `vite-env.d.ts`, `.env.example`, `.github/workflows/deploy.yml` (`CLAUDE.md:334-336`).
- Shared lint config from release tarball eslint-config v1.1.0 (`package.json:25`, `eslint.config.mjs:1-7`).

## Traps
- Map positions resolve by symbol through the layout index, never route x/y (`CLAUDE.md:107-110`).
- Never `setPointerCapture` in `pointerdown` (`CLAUDE.md:123-127`).
- Sprite grid writes need integer indices (`CLAUDE.md:94-97`).
- automation-service GETs stay CORS-simple: no headers at all when unauthenticated (`src/api/automationService.ts:27-58`).
- `getToken()` per request, never cached (`src/api/automationService.ts:23-25`).
- 404 on ship task / metrics / anomalies is normal (`src/api/automationService.ts:71-87`).
- Refuel `units === 0` = full tank or no tank (`CLAUDE.md:263-265`, `src/components/shipDetail/ShipDetailPanel.tsx:94-98`).
- jsdom lacks `ResizeObserver`: no `SystemMap` tests (`CLAUDE.md:291-293`).
- A `VITE_*` missing from .github/workflows/deploy.yml ships a localhost URL to production (`CLAUDE.md:225`).
- Stale docs: README says port pinned in `vite.config.ts`, file is `.js` (`README.md:110`); README "Known limitations" still describes a pasted token (`README.md:348-351`); README test count "82" (`README.md:106`; 112 `it(`/`test(` calls now, verified 2026-10-29 @ 562e1303: grep); `accent.ts` says `lcars-accent-*` live in src/styles/theme.css, they live in `src/components/common/Panel.css:45-59` / `src/components/common/PillButton.css:23-46` (`src/components/common/accent.ts:1`); `CLAUDE.md:25-26` "no branch protection" is stale; `types.ts` points at "agent-service/ts/openapi.json", now at agent-service repo root (`src/api/types.ts:6`).
