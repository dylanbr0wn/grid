# Grid

Build a grid of Last.fm or custom album covers, arrange it with drag-and-drop, and export an image.

The Go/Fiber backend serves the Vite/React app in `web/` and proxies Last.fm and MusicBrainz. Zustand keeps editor state in localStorage.

## Setup

Install Go matching `go.mod`, Node, and pnpm, then run:

```bash
pnpm install --frozen-lockfile
```

Set `LAST_FM_API_KEY` in your environment or a root `.env` file. Last.fm imports return 503 without it; custom search still works.

## Development

Run these in separate terminals from the repo root:

```bash
pnpm --filter web dev
```

```bash
pnpm dev
```

Open http://localhost:8080. Go serves `/api/*` and proxies all other traffic, including HMR, to Vite at `127.0.0.1:5173`. The Vite port is strict. To change the Go port, set `PORT` in both terminals so the HMR client uses the same port.

Go accepts `go run . -dev -vite http://127.0.0.1:5173` to override the proxy target.

## Local production build

```bash
pnpm build
pnpm start
```

This builds `web/dist` and `bin/grid`. Run from the repo root because the binary serves `web/dist` from disk. One Go process serves the SPA and APIs on port 8080, or `PORT` if set. Vite is not needed at runtime.

`/{username}` and `/?lastfm-user={username}` import that Last.fm user's albums. Unknown non-API routes receive the SPA; missing assets and unknown APIs return 404.

## Checks

```bash
pnpm lint
pnpm test
```

`pnpm build` also checks the frontend TypeScript. Client tests use Node and Vite to check API wiring, response validation, sorting/autofill, and custom album IDs. Go tests cover API contracts, the dev proxy, and production SPA serving.

Production deployment, Docker, and public-site cutover are outside this migration's local scope.
