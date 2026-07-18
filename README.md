# Command Interface

React/Vite frontend for the V&M SpaceTraders mining POC. LCARS-styled (Star
Trek "Library Computer Access/Retrieval System") dashboard for managing a
fleet, viewing a single-system map with animated ship movement, and running
the mining gameplay loop (orbit, dock, navigate, survey, extract, refuel,
sell, deliver contract cargo).

Talks directly to four sibling backend services — no server of its own:

- **agent-service** (`:8080`) — agent info, ships, contracts
- **navigation-service** (`:8081`) — waypoints, market, shipyard data
- **fleet-service** (`:3001`) — ship actions (orbit/dock/navigate/extract/etc.)
- **automation-service** (`:3003`) — autopilot lifecycle (arm/pause/abort) and
  per-ship task state for the mining/contract/scout autopilot loop

See the [`meta`](https://github.com/V-M-Pioneer-Trading/meta) repo for the
docker-compose setup that runs all four together.

## Auth model

There's no registration/login flow. Paste an existing SpaceTraders bearer
token on the login screen; it's kept in `sessionStorage` (cleared when the
tab closes) and forwarded as-is to agent/navigation/fleet-service, which
forward it upstream to the SpaceTraders API. Nothing is persisted server-side.

automation-service's admin API is a separate concern: it's unauthenticated
except for `POST /autopilot/arm`, which takes the SpaceTraders token in its
request body (not a bearer header) and holds it in memory server-side for as
long as autopilot stays armed. The Autopilot panel (meta#16) pre-fills its own
arm-token field from the same session token for convenience, but it's an
independent, editable value — arming automation-service is a distinct action
from this app's own login.

## Running locally

```
npm install
npm run dev
```

Runs on `http://localhost:3000` (pinned in `vite.config.js` to match the
backend services' default CORS origin). Copy `.env.example` to `.env.local`
to point at non-default backend URLs.

## Autopilot panel (meta#16)

Toggled from the "Autopilot" button in the agent bar (same pattern as the
existing Contracts toggle): shows live status/mode polled from
`GET /autopilot/status`, an arm form (token + live/shadow mode →
`POST /autopilot/arm`), and Pause/Abort buttons gated on the current status
(Pause only enabled while armed; Abort while armed or paused; Arm is always
enabled — automation-service allows re-arming, e.g. to switch live↔shadow,
from any status). Every ship in the fleet list also gets a small task badge
(`{taskKind}: {phase}`) from `GET /autopilot/ships/:shipSymbol`, blank for a
ship automation-service isn't managing (a 404 there is a normal, not-managed
state, not an error).

Toggled panels can be opened simultaneously (Contracts, Autopilot, and
Observability, below, all coexist) — each is pinned to a distinct horizontal
offset (`right: 1rem` / `24rem` / `47rem`) sized to its neighbors' widths so
they tile left-to-right instead of stacking on top of each other.

## Observability panel (meta#17)

Toggled from the "Observability" button in the agent bar (same pattern as
Contracts/Autopilot): four sections reading from automation-service's
aggregate endpoints.

- **Credits / Hour** — a hand-rolled inline SVG line chart (no charting
  library, matching `SystemMap.jsx`'s existing convention) from
  `GET /metrics/context`'s rollups. 2px line, an end-dot direct-labeled with
  its value, hairline recessive gridlines, and a crosshair+tooltip that snaps
  to the nearest rollup on hover — every value it shows is also listed as
  plain text below the chart (a single series needs no legend; the section
  title already names what's plotted), so nothing is hover-only.
- **Event / Decision Feed** — the same endpoint's recent event-log entries
  (planner decisions, replans, task transitions), each showing its logged
  `detail` as plain key=value text — the detail *is* the reason, not
  decoration.
- **Anomalies** — from `GET /anomalies/digest`, each anomaly's `detail` shown
  the same way (the rationale — the threshold/values that made the check
  fire), plus a delivered/pending webhook-delivery badge.
- **AI-Action / Notable Events** — the digest's own notable-events list
  (lifecycle transitions, task failures); once meta#19's AI supervisor exists
  and starts appending its own event types to the log, they'll show up here
  automatically with no UI change needed.

All four sections distinguish three states correctly: loading, "not
configured on this deployment" (metrics rollups and anomaly detection are
both optional backend features — a 404 from either endpoint means the
feature isn't enabled, not an error), and loaded.

## Structure

- `src/api/` — thin fetch clients per backend service; agent/navigation/fleet
  forward the bearer token from `AuthContext`, `automationService.js` doesn't
  (see Auth model above)
- `src/hooks/queries.js` — TanStack Query hooks (polling, cache keys)
- `src/utils/eventLog.js` — shared formatting for event/anomaly `detail`
  blobs and timestamps, used by both the Event Feed and Anomaly Log
- `src/components/common/` — reusable LCARS primitives (Panel, PillButton,
  StatusPill, AlertBanner)
- `src/components/{fleet,map,shipDetail,contracts,autopilot,observability,chat,login,layout}/` —
  feature panels
- `src/styles/theme.css` — LCARS Classic color palette as CSS variables

## Design source

`lcars-reference-files/` holds the original LCARS Ultra kit (three palettes,
Antonio font, full HTML templates) this UI's look was distilled from — kept
for reference when extending the design system, not part of the build.
