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

Open http://localhost:8080. Go serves `/api/*` and proxies all other traffic, including HMR, to Vite at `127.0.0.1:5173`. Both dev servers bind to loopback by default. The Vite port is strict. To change the Go port, set `PORT` in the root `.env` or export it in both terminals; the HMR client uses the same port.

Go accepts `go run . -dev -vite http://127.0.0.1:5173` to override the proxy target.

For intentional LAN access to the dev proxy, pass `-dev-host 0.0.0.0`. This makes the Vite source and HMR available to network clients that can reach the Go port.

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

Browser capture checks use Playwright with Chromium at device pixel ratios 1, 2, and 3:

```bash
pnpm --filter web exec playwright install chromium
pnpm --filter web test:browser
```

To use installed Google Chrome instead, run `PLAYWRIGHT_CHANNEL=chrome pnpm --filter web test:browser`. The tests start a Vite server on loopback port 5174 and use controlled artwork responses.

## Snapshot capture

`freezeGridSnapshot(document.getElementById("fm-grid"))` from `web/src/lib/export.ts` synchronously freezes the grid's composition, computed label styles, and loaded artwork pixels. Call the returned session's `capture()` to wait for pending artwork and fonts and produce a PNG Blob at fixed 2× resolution. A 10 × 10 grid produces 2560 × 2560 pixels regardless of device pixel ratio.

If capture returns `status: "artwork-failed"`, `failedCovers` identifies the covers by label and index among covers. Retry `capture()` on the same session, or call `capture({ allowPlaceholders: true })` only after the creator explicitly chooses placeholders. Successful covers remain frozen across retries. Capture errors reject with `SnapshotCaptureError`, including `code: "too-large"` for images over 10,000,000 bytes. A smaller grid requires a new session. Call `dispose()` when closing the preview to cancel pending artwork and remove temporary rendering elements.

This capture foundation does not yet add the Share dialog or publication API. Existing local export functions keep their behavior.

## Railway deployment

Deploy one service from the repository root. The root `Dockerfile` builds the Vite app and Go binary, then runs Go as a non-root user with the static app in `web/dist`. Railway detects this Dockerfile automatically. Node and pnpm are only needed during the build.

1. Commit and push the deployment files to your GitHub deployment branch.
2. In Railway, create a service from `dylanbr0wn/grid`, or connect that repository to your existing service. Keep the root directory at the repository root, not `/web`.
3. Add `LAST_FM_API_KEY` in the service's Variables tab. Local `.env` files are excluded from the Docker build. The key is read by Go at runtime and is not bundled into the frontend.
4. Clear any custom build or start commands from earlier deployments. The Dockerfile defines both.
5. Set the healthcheck path to `/api/health` in the service's deployment settings.
6. Deploy, then select **Settings > Networking > Public Networking > Generate Domain**. If Railway asks for a target port, use the service's `PORT` value, or 8080 when no `PORT` is set.

Go listens on all interfaces and uses Railway's `PORT` environment variable. No database or volume is required; editor state is stored in each browser's localStorage. A new domain starts with fresh browser state.

Check the generated domain's `/api/health` endpoint for `{"ok":true}`, then open `/` and a `/{username}` route. Confirm Last.fm imports and custom album search work.

See Railway's [Dockerfile documentation](https://docs.railway.com/builds/dockerfiles), [healthchecks](https://docs.railway.com/deployments/healthchecks), and [public networking](https://docs.railway.com/networking/public-networking).

To test the same container locally:

```bash
docker build -t grid .
docker run --rm -p 8080:8080 -e PORT=8080 -e LAST_FM_API_KEY grid
```

The `-e LAST_FM_API_KEY` option forwards an exported shell variable. Export the key before running this command if you want to test Last.fm imports.
