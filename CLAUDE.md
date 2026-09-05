# CLAUDE.md — working notes for contributors and coding agents

Read `README.md` first for what this app is and why the map works the way it
does. This file is the operational contract: what may import what, what must
stay true, and what breaks if you change it.

## Commands

| Command | Does |
| --- | --- |
| `npm install` | Deps. No postinstall, no codegen, no native builds. |
| `npm run dev` | Vite dev server on port 3000 — **pinned**, `strictPort: true`, because it is the backends' default CORS origin. `/dev-map.html` is served alongside `/`. |
| `npm test` | vitest, single run, jsdom. |
| `npx vitest` | Watch mode. |
| `npx vitest run src/map` | One directory. |
| `npm run build` | Static bundle to `dist/`. Only `index.html` is an entry, so `dev-map.html` never ships. |
| `npm run preview` | Serve the built bundle. |

There is no linter, formatter, typechecker or CI test job. `npm run build` is
the only automated gate, and it runs in `.github/workflows/deploy.yml` on push
to `main` — which means **a broken test reaches production**. Run `npm test`
yourself.

## Module map

| Path | Owns | Depends on |
| --- | --- | --- |
| `src/main.jsx` | Root render, provider nesting, the missing-Clerk-key screen | Clerk, react-query, all four contexts |
| `src/App.jsx` | Nothing but rendering `Dashboard` | — |
| `src/api/config.js` | Env vars → service base URLs, with localhost defaults | `import.meta.env` |
| `src/api/client.js` | `ApiError`, error-body parsing, `readResponse`, `withQuery`, `request` | nothing |
| `src/api/{agent,navigation,fleet}Service.js` | One function per backend route | `client`, `config` |
| `src/api/automationService.js` | automation-service routes **and its own header policy** | `client` (`readResponse`, `withQuery`), `config` |
| `src/api/healthService.js` | Service list, probeability filter, `checkAll` | `config` |
| `src/context/OperatorContext.jsx` | Clerk identity, scope decode, the anonymous default | Clerk, react |
| `src/context/AlertContext.jsx` | Toast stack and its dismiss timers | react |
| `src/context/SelectionContext.jsx` | Which ship is selected | react |
| `src/hooks/queryKeys.js` | **Every** react-query cache key | nothing |
| `src/hooks/queries.js` | Every query hook, poll intervals, the gated-read rule | api clients, `OperatorContext`, `queryKeys` |
| `src/hooks/useShipSurveys.js` | Surveys, scoped to the ship that found them | react |
| `src/hooks/useMapViewport.js` | React binding for viewport math: wheel, drag, keyboard, resize | `map/viewport` |
| `src/hooks/useElementSize.js` | Live content-box size via `ResizeObserver` | react |
| `src/hooks/useAnimationClock.js` | One rAF clock for the whole map, stopped when idle | react |
| `src/hooks/useCountdown.js` | 1s ticking remainder from an ISO expiry | react |
| `src/map/rand.js` | `hash32` (FNV-1a) and `mulberry32` — the map's determinism | nothing |
| `src/map/viewport.js` | Zoom/pan/fit/project math and the scale constants | nothing |
| `src/map/systemLayout.js` | Waypoints → positioned nodes, orbit rings, clearance, ship placement | `map/rand`, `map/viewport` |
| `src/map/sprites/pixel.js` | Grids, palettes, grid→rect compilation, noise, shading | nothing |
| `src/map/sprites/generators.js` | Procedural body/structure generators | `pixel`, `rand` |
| `src/map/sprites/ships.js` | Hand-drawn ship + badge sprites, frame→family map, badge labels | `pixel` |
| `src/map/sprites/registry.js` | Compiled sprite registry, id scheme, per-type base sizes | `pixel`, `rand`, `generators`, `ships` |
| `src/components/common/QueryState.jsx` | The four things a panel says when it has no data | nothing |
| `src/components/map/*` | Thin SVG layers that draw what `src/map` produced | `src/map`, hooks |
| `src/utils/togglePanelLayout.js` | Panel order, widths, computed `right` offsets | nothing |
| `src/utils/eventLog.js` | Formatting for event/anomaly `detail` blobs | nothing |
| `src/utils/spaceTraders.js` | Symbol parsing, countdown formatting | nothing |
| `src/devMap.jsx` | Dev-only harness: generated system, stubbed `fetch`, stub operator | everything below it |

### Dependency rules

These hold today. Breaking one is a design change, not a refactor.

1. **`src/map/**` imports nothing outside `src/map/**`.** No React, no hooks, no
   API clients, no components. It is pure math and data, which is what makes it
   testable without a DOM and reusable by a future sector map.
2. **`src/map/systemLayout.js` knows no sprite metrics.** A body's drawn radius
   arrives as an injected `bodyRadius(node)` callback. Importing `registry.js`
   here would make the layout depend on the art.
3. **`src/api/**` imports no React and no context.** Credentials are arguments.
4. **Only `main.jsx`, `context/OperatorContext.jsx` and
   `components/operator/OperatorBadge.jsx` may import `@clerk/clerk-react`.**
   Everything else goes through `useOperator()`. This is what lets a tree with
   no Clerk provider — `dev-map.html`, or a Clerk outage — render as an
   anonymous observer instead of throwing.
5. **Components do not take credentials as props.** The Clerk session is read
   from context at the point of use.
6. **Cache keys come from `hooks/queryKeys.js`.** Never write an array literal
   into `useQuery` or `invalidateQueries`.

## Invariants

Stated so you can recognise a violation.

**Sprites**

- Every write into a sprite grid lands on **integer** row and column indices.
  `grid[y][7.5] = c` silently sets a string-keyed property on the row array and
  the pixel disappears. Generators using `c = (size - 1) / 2` on an even-sized
  grid must `Math.floor`/`Math.round` before indexing.
- Sprite ids are stable strings: `wp-<WAYPOINT_TYPE>-<variantIndex>`,
  `ship-<family>`, `role-<ROLE>`, `trait-<TRAIT>`. They are referenced by
  `<use href="#id">`, by `SpriteDefs`, and by the `BADGE_LABEL` map — renaming
  one means renaming all three sites at once.
- Every compiled sprite has at least one rect. An all-transparent grid is a bug
  the test suite catches.

**Map geometry**

- **Every position resolves through the layout index by symbol.** Never use
  `nav.route.origin.x/y` or `destination.x/y`: SpaceTraders reports an orbital's
  coordinates as its *parent's*, so coordinate-based rendering draws ships flying
  to the wrong body once orbitals are fanned onto a ring.
- Layout is deterministic: same waypoints in any input order produce the same
  positions. Ring start angles come from the nearest neighbour, falling back to
  `hash32(symbol)` — never from `Math.random`, iteration order, or render count.
- Anything that must measure a fixed number of screen pixels at any zoom goes
  through `screenToLocal(px, scale)`; anything that is an icon goes through
  `iconLocalSize(base, scale)`. A raw pixel value inside the scaled `<g>` is a
  bug.
- `clearance` is room to a neighbour's **drawn edge**, not half the distance to
  its centre. A planet's icon already reaches past the midpoint to its own moons.

**Pointer handling**

- **Never `setPointerCapture` on the `<svg>` in `pointerdown`.** `click` fires at
  the nearest common ancestor of the down and up targets, so capture delivers
  every waypoint click to the `<svg>`, which reads it as "clicked empty space".
  Capture is taken in `pointermove`, at exactly `CLICK_SUPPRESS_THRESHOLD`, so
  only gestures whose click was going to be discarded ever capture.
- `drag.moved` lives in a ref, not state: the click that ends a gesture is
  dispatched before React has necessarily re-rendered.
- Because capture does not start on press, `pointermove` must keep checking
  `e.buttons === 0` — otherwise a button released off-map leaves the drag stuck
  and the next hover pans.

**Data**

- Three "no data" answers are distinct and must stay distinct:
  `undefined` = the query never ran, `null` = the route 404'd because the feature
  is not enabled on this deployment, a rejection = it failed. Rendering any of
  them as the panel's own "none found" line states as fact something nobody
  checked. `components/common/QueryState.jsx` is the one place that decides.
- Cache keys carry no credential. They used to include the pasted game token so
  that changing it could not show the previous agent's ships; the Clerk session
  that replaced it rotates on its own schedule, and keying on a rotating value
  would evict the whole cache several times an hour.
- **automation-service GET requests must stay CORS-simple.** Its public reads
  send no headers at all; adding a blanket custom header (`X-Priority`, say)
  turns them into preflighted requests and needs a matching
  `Access-Control-Allow-Headers` on that service first. This is why
  `automationService.js` does not use `client.js`'s `request`.

**Layout**

- Every key in `PANEL_ORDER` needs an entry in `PANEL_WIDTH_REM`
  (`utils/togglePanelLayout.js`), a button in `PANEL_BUTTONS`
  (`components/layout/AgentBar.jsx`), and a render branch in `Dashboard.jsx`.
- A panel's own CSS `width` must equal its `PANEL_WIDTH_REM` entry. Nothing
  enforces this; a mismatch shows up as overlapping panels.

## Critical sequences

**Provider nesting in `main.jsx`** — the order is load-bearing:

```
ClerkProvider            → OperatorProvider needs Clerk's useAuth
  OperatorProvider       → query hooks read the session + scopes from here
    QueryClientProvider  → everything below issues queries
      AlertProvider      → mutations push alerts from anywhere below
        App
```

`dev-map.html` (`src/devMap.jsx`) supplies `OperatorContext.Provider` directly
in place of the top two, because it runs with no Clerk instance.

**Map paint order** inside the scaled `<g>` — SVG has no `z-index`, so document
order *is* stacking order:

```
OrbitRingLayer → TransitPathLayer → WaypointLayer → ShipLayer → LabelLayer
```

Labels last so they land on top of every icon; ships after waypoints because an
in-transit ship passing over a body is meant to take the click.

**A mutation, in order:** call the service with both credentials → on success
invalidate every key whose data the write could have changed → on error
`pushAlert`. Getting the invalidation set wrong is silent: the panel just shows
stale numbers. The current sets are:

| Mutation | Invalidates |
| --- | --- |
| Any ship action | `ships`, `cooldown`, `cargo` |
| Refuel, sell, purchase cargo, purchase ship | the above plus `agent` |
| Contract accept / fulfil | `contracts`, `agent` |
| Contract deliver | `ships`, `cooldown`, `cargo`, `contracts` |
| Autopilot arm / pause / abort | `autopilotStatus` |
| Knob set | `knobs`, `metricsContext` (bare prefix — matches every parameterised key) |

## What is effectively public

Changing any of these needs a change somewhere else, usually outside this file's
line of sight.

| Identifier | Who else depends on it |
| --- | --- |
| `Authorization: Bearer <Clerk session>` | agent-, navigation-, fleet-, automation-service — and st-gateway, which they forward it to for the priority queue |
| Scope string `fleet:control` | automation-service verifies it; it must be in the Clerk user's `public_metadata` |
| Health paths `/api/<service>/health` (unversioned) | Each backend serves these specifically so CloudFront's path routing can tell the origins apart on one domain |
| `VITE_*` env var names | `.env.example` **and** `.github/workflows/deploy.yml` — they are baked in at build time, so a variable missing from the workflow ships a localhost URL to production. That is exactly how the "VITE_CLERK_PUBLISHABLE_KEY is not set" build reached every visitor. |
| Sprite ids and `BADGE_LABEL` keys | `SpriteDefs`, `WaypointLayer`, `ShipLayer`, the tooltip |
| `lcars-*` class names | The CSS files, and `.lcars-map__waypoint` / `.lcars-map__ship` are what any DOM smoke test selects |

**Backend response shapes this app reads.** All of them are the upstream
SpaceTraders shape passed through, except automation-service's:

| Route | Shape read |
| --- | --- |
| `GET /agent` | `{ symbol, credits, startingFaction, shipCount, headquarters }` — flat, not `{ data }` |
| `GET /ships` | a bare array of ships |
| `GET /contracts` | a bare array |
| `GET /systems/:id/waypoints` | `{ data: [...] }` |
| `GET /ships/:s/cargo`, `/cooldown` | `{ data: {...} }` |
| `POST /ships/:s/survey` | `{ data: { surveys: [...] } }` |
| `POST /ships/:s/refuel` | `{ data: { transaction: { units } } }` |
| `GET /autopilot/status` | `{ status, mode }` |
| `GET /autopilot/ships/:s` | `{ task: { taskKind, phase } }`, or 404 |
| `GET /planner/knobs` | `{ knobs: [{ name, value, min, max, default, class?, description? }] }` |
| `PUT /planner/knobs/:name` | `{ knob }` |
| `GET /metrics/context` | `{ rollups: [{ creditsPerHour, windowEnd }], events: [{ id, type, occurredAt, detail }] }`, or 404 |
| `GET /anomalies/digest` | `{ anomalies: [{ id, type, detectedAt, detail, deliveredAt, deliveryAttempts }], events: [...] }`, or 404 |
| any error | agent/nav/fleet: `{ error }` or `{ message }`. automation-service: `{ error: { message } }`. `client.js` handles both. |

## Domain facts that are not obvious from the code

- **Orbitals share their parent's coordinates exactly.** This is the single fact
  the whole map design exists to work around.
- `orbits` is server data and is not guaranteed acyclic. `buildSystemLayout`
  keeps a `visited` set and drops any cycle members at their raw position rather
  than recursing forever or losing them off the map.
- The `WaypointType` enum has **14** values; all 14 have a sprite and a base
  size. An unknown type falls back to `wp-UNKNOWN-0`.
- There are **16** ship frames, collapsed here to 5 silhouette families. An
  unknown frame renders as `utility`.
- A 404 from `GET /autopilot/ships/:symbol` means "automation-service is not
  managing this ship" — a normal state, not an error. Metrics and anomaly routes
  404 for a different normal reason: the operator never enabled that scheduler.
- `POST /refuel` succeeds with `transaction.units === 0` when the tank is already
  full **or** the ship has no fuel tank at all. Both are reported as info, not
  errors.
- Surveys carry an `expiration` and a `signature`, are issued to one ship at one
  waypoint, and are never persisted anywhere — reloading loses them.
- Clerk session tokens are short-lived. Always call `getToken()` per request;
  never cache one in a module.

## Testing

vitest under **jsdom** with `@testing-library/react`. Everything matching
`src/**/*.test.{js,jsx}` runs; `restoreMocks: true` is on.

Two levels:

- **Pure modules** — `map/viewport`, `map/systemLayout`, `map/sprites`,
  `utils/togglePanelLayout`, `api/client`, `api/healthService`. No DOM needed;
  they simply run under jsdom too.
- **Hooks and small components** — `context/OperatorContext`,
  `hooks/useShipSurveys`, `components/common/QueryState`. `renderHook` and
  `render` from testing-library.

The large panels (`ShipDetailPanel`, `SystemMap`, `Dashboard`) have no tests.
The manual level above the suite is `/dev-map.html`.

### Traps in this harness

- **jsdom has no `ResizeObserver`.** `useElementSize` uses it, so anything that
  renders `SystemMap` needs a stub before it will mount at all. This is why
  there are no `SystemMap` tests.
- jsdom *does* provide `requestAnimationFrame` and `AbortSignal.timeout`.
- Nothing in the suite currently depends on wall-clock time, and five
  consecutive runs are green. If you add tests for `useCountdown` or
  `useAnimationClock`, use `vi.useFakeTimers()` — a 1s interval and a real clock
  is the obvious way to introduce the suite's first flake.
- A regression test must fail against the pre-fix code. Verify it by temporarily
  restoring the old behaviour, not by assuming.

## Extending each moving part

**A backend call** → add one function to the matching `src/api/*Service.js`. Use
`request()` unless the route must stay CORS-simple (see the automation-service
invariant). Never call `fetch` from a component.

**A query** → add its key to `hooks/queryKeys.js`, then the hook to
`hooks/queries.js` with a named `*_POLL_MS` constant. If it needs a signed-in
operator, build it with `useGatedQuery` rather than re-writing
`enabled: isSignedIn`.

**A toggle panel** → four edits, all required: `PANEL_ORDER` and
`PANEL_WIDTH_REM` in `utils/togglePanelLayout.js`, `PANEL_BUTTONS` in
`AgentBar.jsx`, a render branch in `Dashboard.jsx`. The panel's CSS `width` must
match its `PANEL_WIDTH_REM`. Offsets are computed from the open set, so nothing
else needs re-deriving.

**A waypoint type** → a variant list in `WAYPOINT_VARIANTS` and a size in
`WAYPOINT_BASE_SIZE` (`sprites/registry.js`), plus `MAJOR_TYPES` if it should
keep its label below 2× zoom. Add the type to `WAYPOINT_TYPES` in
`sprites/pixel.test.js`.

**A ship frame** → one line in `FRAME_FAMILY` (`sprites/ships.js`) and the frame
in `FRAMES` in the test. Only add a family if the silhouette genuinely differs.

**A badge** → a 5×5 glyph, a colour, **and** a `BADGE_LABEL` entry. A glyph with
no label is unreadable by design.

**A map layer** → the geometry goes in a pure module under `src/map/`, the
drawing in a thin component under `components/map/layers/`. Counter-scale every
size, and insert it in the paint order deliberately.

**An env var** → `api/config.js`, `.env.example`, **and**
`.github/workflows/deploy.yml`. Two of the three is a production bug.

---

**This file is updated in the same PR as the change it describes.** A dependency
rule, invariant or sequence that no longer holds is worse than none at all,
because the next reader will trust it.
