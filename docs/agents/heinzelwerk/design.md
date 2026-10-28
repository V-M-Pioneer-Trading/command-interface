# Design system

What the UI must look and behave like. Frontend builds against it. Validator reviews code (Standards axis) and screenshots against it. Facts and rules only; no aspirations. The look is due for a rework soon; this file holds only the idea that survives it.

## Idea
- Retro-futuristic operator console inspired by LCARS (Star Trek): elbowed panel headers, pill buttons, dark background, warm accent colours. Reference templates in `lcars-reference-files/`.

## Tokens
- Colours, fonts (Antonio) and radii are CSS custom properties in `src/styles/theme.css`; palette colours and fonts are always taken from those vars, never written as literals.
