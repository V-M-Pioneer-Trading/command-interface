# Design system

What the UI must look and behave like. Frontend builds against it. Validator reviews code (Standards axis) and screenshots against it. Facts and rules only; no aspirations.

The look is LCARS Classic. Source palette and shapes: `lcars-reference-files/assets/`.

## Tokens

All in `src/styles/theme.css`. Components use the variables or the `lcars-accent-*` classes, never a raw hex value.

- **Colors**: background `--lcars-bg` (#000) under panels `--lcars-panel-bg` (#0a0a0a). Accents `--lcars-orange` (default), `--lcars-tan`, `--lcars-peach`, `--lcars-lavender`, `--lcars-violet`, `--lcars-blue`, `--lcars-green`, `--lcars-yellow`, `--lcars-red-alert` (errors and alerts only). Text `--lcars-text` on black, `--lcars-text-dim` for secondary lines, `--lcars-text-on-light` (#000) on any accent fill.
- **Ship status**: `--status-docked` green, `--status-in-orbit` blue, `--status-in-transit` yellow, `--status-cooldown` red-alert. A ship's state is shown through these and nothing else.
- **Accent names**: the `Accent` type in `src/components/common/accent.ts` (`orange | blue | tan | violet | lavender | green | yellow | red`) maps to the `lcars-accent-*` classes. A new accent is added in both places.
- **Typography**: Antonio (`--font-display`, `--font-body`; woff2 in `src/assets/fonts/`, `src/styles/fonts.css`). Headings h1–h4 uppercase, weight 700, letter-spacing 0.06em; body letter-spacing 0.03em (`src/styles/global.css`).
- **Shape and spacing**: `--radius-pill` (buttons, pills), `--radius-elbow` (panel elbows), `--radius-panel`; gaps `--gap-sm` (0.5rem), `--gap-md` (1rem).

## Components

In `src/components/common/`:

- `Panel`: every titled block of content; `title` draws the LCARS elbow header, `accent` colours it.
- `PillButton`: every clickable action; always a real `<button>`, `accent`, `disabled`, `title` for icon-only buttons.
- `StatusPill`: every short status label (ship state, service health).
- `QueryState`: the one place that decides what a data view says while loading, on failure, and when empty. Failed and empty are different messages; `undefined` (nothing asked) is never shown as "none found".

Layout in `src/components/layout/` (`Dashboard`, `AgentBar`); the system map in `src/components/map/` with pure geometry in `src/map/`.

## Layout and style rules

- The app fills the viewport; `html`, `body`, `#root` never scroll. Content scrolls inside a panel.
- Toggle panels open from `AgentBar`. A new one needs four edits: `PANEL_ORDER` and `PANEL_WIDTH_REM` in `src/utils/togglePanelLayout.ts`, a button in `PANEL_BUTTONS` (`AgentBar.tsx`), a branch in `Dashboard.tsx`. The panel's CSS width equals its `PANEL_WIDTH_REM`, or panels overlap.
- Class names are BEM under `lcars-` (`lcars-panel__header`); `.lcars-map__waypoint` and `.lcars-map__ship` are public selectors and keep their names.
- Components get data from hooks in `src/hooks/`, keyed by `hooks/queryKeys.ts`; a component never calls `fetch`.

## Interaction

- Every data view renders through `QueryState`.
- Map: click selects; drag pans. Pointer capture starts in `pointermove` past `CLICK_SUPPRESS_THRESHOLD`, never on press.

## Accessibility baseline

- Every action is a `<button>` (via `PillButton`), reachable by keyboard; disabled state uses the `disabled` attribute.
- Icon-only controls carry a `title`.
- Text on an accent fill uses `--lcars-text-on-light`; text on black uses `--lcars-text` or `--lcars-text-dim`.
