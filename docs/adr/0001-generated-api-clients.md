# API clients are generated from the synced specs

Status: accepted, not yet implemented. The spec copies, the pin, the generated clients and the drift check land in the slices meta#167 to meta#174 (the drift check and refresh workflow landed with meta#174); until then `src/api/types.ts` is still hand-written.

command-interface reaches agent-, automation-, fleet- and navigation-service through clients generated from each service's spec in `meta/openapi/`. The spec copies are committed here with a pin to the meta commit they came from; `openapi-typescript` turns them into types and `openapi-fetch` into one typed client per service. CI fails when a copy differs from meta main, and a scheduled workflow opens the refresh PR. No hand-written request or response type remains for those four services.

This replaces the earlier rule "No codegen: keep these in step with the services by hand". Under that rule a service's shape change reached the dashboard unannounced, at runtime.

## Considered Options

1. Hand-written types checked by hand against the specs (the earlier rule). Lost because nothing notices drift until a panel breaks in production.
2. Generated types only, with the existing request helpers kept. Lost because paths, methods and parameters stay untyped strings, so a renamed route still compiles.
3. Download the specs from meta main during the build. Lost because the same commit could build different types on different days.
4. **Committed spec copies, generated typed clients, drift check against meta main (chosen).** Deterministic builds, typed calls, drift visible on the next PR. Price: two dependencies (`openapi-typescript` at build time, `openapi-fetch` shipped in the bundle), a refresh PR to review whenever a service changes its spec, and every service spec must type what the dashboard reads.

Source: V-M-Pioneer-Trading/meta#155 "Implementation Decisions"
