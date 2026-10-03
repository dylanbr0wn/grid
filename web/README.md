# Grid frontend

Vite/React UI for the Go/Fiber backend. See [the root README](../README.md) for setup, development, and production commands.

Run `pnpm --filter web dev` alongside `pnpm dev` from the root. Browse the Go origin at http://localhost:8080 so API calls and HMR share that origin.

`pnpm --filter web build` type-checks and builds `web/dist`; `pnpm --filter web lint` runs Oxlint.

`pnpm --filter web test` runs client API/store regressions with Node's test runner and Vite's module loader. No browser or additional test framework is required.
