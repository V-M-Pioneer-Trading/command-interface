# Repo map: command-interface

LCARS operator dashboard. React 18, Vite 6, TS (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), TanStack Query 5, Clerk React 5. Static bundle on S3 + CloudFront.

| Path | Holds |
|---|---|
| `index.html` → `src/main.tsx` → `src/App.tsx` → `components/layout/Dashboard.tsx` | entry chain; providers in `main.tsx` |
| `dev-map.html` → `src/devMap.tsx` | Clerk-free map harness with stubbed fetch |
| `src/api/` | backend clients, `config.ts` (base URLs), `types.ts` (hand-written bodies); no React |
| `src/hooks/` | data hooks; cache keys only from `queryKeys.ts` |
| `src/context/` | `OperatorProvider.tsx`, `OperatorContext.ts` |
| `src/components/common/` | `Panel`, `PillButton`, `StatusPill`, `QueryState`, `accent.ts` |
| `src/components/{autopilot,chat,contracts,fleet,knobs,map,observability,operator,shipDetail}/` | feature panels |
| `src/map/` | pure map math; imports nothing outside `src/map` |
| `src/utils/togglePanelLayout.ts` | panel order, widths, offsets |
| `src/styles/` | `theme.css` (tokens), `global.css`, `fonts.css` |
| `lcars-reference-files/` | LCARS source assets; lint-ignored |

- Calls: agent-service, navigation-service, fleet-service, automation-service (Clerk bearer); health probes for auth-service, st-gateway.
- Dev server: `npm run dev`, port 3000 (`strictPort`). Tests: vitest + jsdom, `src/**` only.
- `VITE_*` vars live in `.env.example`, `src/vite-env.d.ts` and `.github/workflows/deploy.yml`, all three.
- CI `deploy.yml`: `test` (typecheck, lint, test), `deploy` (main: S3 sync + CloudFront invalidation).
- No Playwright installed in the repo.

## Reference docs

- `README.md`: read when running locally (env vars) or touching the system map, observability panels or auth model.
