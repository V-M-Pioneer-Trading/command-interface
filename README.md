# Command Interface

React/Vite frontend for the V&M SpaceTraders mining POC. LCARS-styled (Star
Trek "Library Computer Access/Retrieval System") dashboard for managing a
fleet, viewing a single-system map with animated ship movement, and running
the mining gameplay loop (orbit, dock, navigate, survey, extract, refuel,
sell, deliver contract cargo).

Talks directly to three sibling backend services — no server of its own:

- **agent-service** (`:8080`) — agent info, ships, contracts
- **navigation-service** (`:8081`) — waypoints, market, shipyard data
- **fleet-service** (`:3001`) — ship actions (orbit/dock/navigate/extract/etc.)

See the [`meta`](https://github.com/V-M-Pioneer-Trading/meta) repo for the
docker-compose setup that runs all three together.

## Auth model

There's no registration/login flow. Paste an existing SpaceTraders bearer
token on the login screen; it's kept in `sessionStorage` (cleared when the
tab closes) and forwarded as-is to all three backend services, which forward
it upstream to the SpaceTraders API. Nothing is persisted server-side.

## Running locally

```
npm install
npm run dev
```

Runs on `http://localhost:3000` (pinned in `vite.config.js` to match the
backend services' default CORS origin). Copy `.env.example` to `.env.local`
to point at non-default backend URLs.

## Structure

- `src/api/` — thin fetch clients per backend service, forwarding the bearer
  token from `AuthContext`
- `src/hooks/queries.js` — TanStack Query hooks (polling, cache keys)
- `src/components/common/` — reusable LCARS primitives (Panel, PillButton,
  StatusPill, AlertBanner)
- `src/components/{fleet,map,shipDetail,contracts,chat,login,layout}/` —
  feature panels
- `src/styles/theme.css` — LCARS Classic color palette as CSS variables

## Design source

`lcars-reference-files/` holds the original LCARS Ultra kit (three palettes,
Antonio font, full HTML templates) this UI's look was distilled from — kept
for reference when extending the design system, not part of the build.
