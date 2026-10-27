# Team rules

How heinzelwerk agents work in this repo. Mode rules (single repo vs workspace) live in the `heinzelwerk:team-modes` skill. This file holds only what is specific to this repo.

- **Role**: frontend (React 18 / Vite 6 / TS / TanStack Query / Clerk). LCARS operator dashboard, static bundle on S3 + CloudFront
- **Frontend paths**: `src/`, `index.html`, `dev-map.html`, `vite.config.js`
- **Shared paths** (only the owner named in the task edits them): `src/api/types.ts` (hand-written subset of backend bodies, checked against each service's `openapi.json`)
- **Worktree setup**: `npm ci --no-audit --no-fund`
- **Checks** (validator runs every one, in order):
  1. `npm audit --audit-level=high`
  2. `npm run typecheck --silent`
  3. `npm run lint --silent`
  4. `npx vitest run --reporter=dot`
- **UI preview**: `npm run dev` · base URL `http://localhost:3000` (port pinned by `strictPort` and the backends' CORS origin, so one preview runs at a time) · without `VITE_CLERK_PUBLISHABLE_KEY` the app shows its setup screen; `http://localhost:3000/dev-map.html` is the Clerk-free map harness · screenshots via `npx playwright screenshot` (first run: `npx playwright install chromium`) · publish via `ui-shots`
- **Security**: no secret scan runs yet: gitleaks is not installed and no pre-commit hook exists (planned: `gitleaks git --pre-commit --staged` in `.git/hooks/pre-commit`), so check every diff for secrets by eye · dependency audit in checks
- **Coding standards**: `CLAUDE.md` in this repo, and `docs/agents/heinzelwerk/design.md`; lint rules come from `@v-m-pioneer-trading/eslint-config` (React variant) and change only by a release of that package
- **Risk areas** (validator reviews diffs touching these on Opus):
  - `.github/workflows/deploy.yml` and every `VITE_*` variable: baked in at build time; a variable missing from the workflow ships localhost to production. Push to main deploys
  - the Clerk boundary: only `main.tsx`, `context/OperatorProvider.tsx`, `components/operator/OperatorBadge.tsx` import `@clerk/clerk-react`; `getToken()` per request, never cached
  - controls that move the fleet or the planner: autopilot arm / pause / abort and ship actions call `fleet:control` routes; knob writes and replans call `planner:advise` routes
  - automation-service GETs stay CORS-simple (no custom headers)
- **Contracts**:
  - consumer of agent-service, navigation-service, fleet-service `openapi.json` and automation-service routes and event types, through `src/api/`
  - `.lcars-map__waypoint`, `.lcars-map__ship`: public DOM selectors for smoke tests
  - `@v-m-pioneer-trading/eslint-config`: consumed by release-tarball URL, so a change is a version bump here
