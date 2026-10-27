# Design system

What the UI must look and behave like. Frontend builds against it. Validator reviews code (Standards axis) and screenshots against it. Facts and rules only; no aspirations. Kept deliberately high-level: a UI rework is planned, so detailed rules wait until it lands.

## Tokens
- Colors, fonts, radii and gaps are CSS custom properties in `src/styles/theme.css`. Accent and status colours are always used through `var(--lcars-*)` / `var(--status-*)`, never as literals.
- Typography: Antonio, self-hosted (`src/styles/fonts.css`), through `var(--font-display)` / `var(--font-body)`.

## Layout and style rules
- Dark only: black background, light text from the tokens.
- LCARS-inspired (Star Trek operator console): coloured pills, elbows and panels on black, uppercase display type.
