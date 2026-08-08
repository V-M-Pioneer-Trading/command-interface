# Command Interface

React/Vite frontend for the V&M SpaceTraders mining POC. LCARS-styled (Star
Trek "Library Computer Access/Retrieval System") dashboard for managing a
fleet, viewing a single-system map with animated ship movement, and running
the mining gameplay loop (orbit, dock, navigate, survey, extract, refuel,
sell, deliver contract cargo).

Talks directly to four sibling backend services — no server of its own:

- **agent-service** (`:8080`) — agent info, ships, contracts, purchases/sells and transaction history
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
except for `POST /api/automation/v1/autopilot/arm`, which takes the SpaceTraders token in its
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
`GET /api/automation/v1/autopilot/status`, an arm form (token + live/shadow mode →
`POST /api/automation/v1/autopilot/arm`), and Pause/Abort buttons gated on the current status
(Pause only enabled while armed; Abort while armed or paused; Arm is always
enabled — automation-service allows re-arming, e.g. to switch live↔shadow,
from any status). Every ship in the fleet list also gets a small task badge
(`{taskKind}: {phase}`) from `GET /api/automation/v1/autopilot/ships/:shipSymbol`, blank for a
ship automation-service isn't managing (a 404 there is a normal, not-managed
state, not an error).

Toggled panels can be opened simultaneously (Contracts, Autopilot,
Observability, and Knobs, below, all coexist) — `src/utils/togglePanelLayout.js`
computes each open panel's `right` offset dynamically from just the panels
currently open (a panel not open takes no horizontal space), so adding a 5th
panel type only means adding one entry to that file instead of re-deriving
hardcoded offsets for every existing panel. Each panel's own CSS `right: 1rem`
is a fallback only, overridden by an inline `style` prop from `Dashboard.jsx`.

## Observability panel (meta#17)

Toggled from the "Observability" button in the agent bar (same pattern as
Contracts/Autopilot): four sections reading from automation-service's
aggregate endpoints.

- **Credits / Hour** — a hand-rolled inline SVG line chart (no charting
  library, matching the system map's existing convention) from
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

## Knob Editor (meta#18)

Toggled from the "Knobs" button in the agent bar: lists every planner/anomaly
knob from `GET /api/automation/v1/planner/knobs` (name, current value, `[min, max]` bounds,
default), each editable inline. Bounds are validated client-side before Save
is even enabled — the same inclusive `[min, max]` check automation-service's
`KnobRepo.set` enforces server-side — and a rejected out-of-range value shows
an inline error instead of a round-trip. A successful save invalidates both
the knobs query and `metricsContext` (whose Event Feed shows the resulting
`knob_changed` event immediately, without waiting for its own poll).

Polls every 15s (`useKnobsQuery`) so edits from another operator or the future
AI supervisor (meta#19) show up without a refresh. Each row tracks its own
"clean" baseline separately from the poll: a row with no in-progress edit
adopts a new server value the moment it arrives, but a row with unsaved local
input is left alone even if the server value changes underneath it — a
concurrent edit is never allowed to silently discard what an operator is
mid-typing. Saving still always overwrites the current server value
(last-write-wins), same as before.

## System map

Rendered as SVG (no rendering library — the scale is ~10–100 waypoints and
under 20 ships, and staying in the DOM keeps LCARS CSS variables, popovers and
hit-testing free). The map is split into pure modules under `src/map/` and thin
layer components that just draw what those modules produce.

**Zoom separates, it doesn't magnify.** SpaceTraders gives orbitals — moons,
orbital stations, fuel stations that `orbits` a body — the *exact same* x/y as
their parent, so no amount of geometric zoom would pull them apart. Two things
fix that:

- `buildSystemLayout` fans a body's orbitals onto a ring around it. Ring radius
  lives in base coordinates, so it scales linearly with zoom. The ring itself is
  drawn only while its family is hovered — hovering a parent or any of its
  orbitals fades in that one ring, so you get the "these belong together" cue
  exactly when you're asking the question and no ring clutter the rest of the
  time.
- Icons grow **sub-linearly**, `size x scale^0.3`. At max zoom (8x) spacing is 8x
  wider while a planet is only ~1.9x bigger, so crowded waypoints genuinely
  separate instead of scaling together. Labels, strokes and badges are
  counter-scaled to a fixed pixel size the same way.

Everything positional resolves through the layout index **by symbol**.
`nav.route.origin/destination` carry raw API coordinates, which for a moon are
its *parent's* — a coordinate-based renderer draws ships flying to the wrong
body once orbitals are offset.

Sprites are pixel art authored in code: character grids (procedurally generated
for spheres, rocks, rings and clouds; hand-drawn for ship silhouettes and
badges) compiled once at load into run-length-merged `<rect>`s inside an SVG
`<symbol>`. That means crisp at any zoom, no binary assets and no build step. All
14 `WaypointType`s are covered, with deterministic per-symbol variants so a
system doesn't read as copy-paste, plus corner badges for
MARKETPLACE / SHIPYARD / under-construction. Celestial bodies use naturalistic
colours; the LCARS palette stays on the chrome around them (labels, rings,
transit paths, selection, badges). Ships collapse the 16 frames into 5
silhouette families sized by mass, rotate to their heading, tint by nav status
via `currentColor`, and carry a role badge for the five roles this fleet flies.

Interaction: wheel or `+`/`−`/⌂ buttons to zoom, drag to pan, double-click to
zoom toward the cursor, arrows/`+`/`−`/`0` from the keyboard, and clicking
anything on the map both centres it and opens a popover — waypoint details
(type, traits, market/shipyard) or a ship summary (role, frame, status,
destination, ETA, fuel and cargo meters). Only one popover is open at a time;
the ship one re-reads from the live ships list so its ETA and gauges stay
current as the poll refreshes. In-transit ships interpolate
between departure and arrival on a **single** shared rAF clock that stops when
nothing is moving (previously every ship marker ran its own loop).

`npm test` (vitest) covers the pure modules — layout, viewport math and sprite
compilation. There are no component tests.

## Structure

- `src/map/` — framework-free map core: `viewport.js` (zoom/pan, screen↔world;
  deliberately knows nothing about systems, so a future sector map reuses it),
  `systemLayout.js` (waypoints → positioned nodes, orbit rings, ship
  interpolation) and `sprites/` (pixel grids, generators, registry)
- `src/api/` — thin fetch clients per backend service; agent/navigation/fleet
  forward the bearer token from `AuthContext`, `automationService.js` doesn't
  (see Auth model above)
- `src/hooks/queries.js` — TanStack Query hooks (polling, cache keys)
- `src/utils/eventLog.js` — shared formatting for event/anomaly `detail`
  blobs and timestamps, used by both the Event Feed and Anomaly Log
- `src/utils/togglePanelLayout.js` — computes each open toggle panel's
  horizontal offset dynamically (see Autopilot panel, above)
- `src/components/common/` — reusable LCARS primitives (Panel, PillButton,
  StatusPill, AlertBanner)
- `src/components/{fleet,map,shipDetail,contracts,autopilot,observability,knobs,chat,login,layout}/` —
  feature panels
- `src/styles/theme.css` — LCARS Classic color palette as CSS variables

## Design source

`lcars-reference-files/` holds the original LCARS Ultra kit (three palettes,
Antonio font, full HTML templates) this UI's look was distilled from — kept
for reference when extending the design system, not part of the build.
