# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm --filter web dev  # Start Vite in one terminal
pnpm dev              # Start Go dev proxy in another; browse localhost:8080
pnpm build            # Type-check/build web/ and compile bin/grid
pnpm start            # Serve web/dist + APIs from the built Go binary
pnpm lint             # Run Oxlint on web/
pnpm test             # Run client API/store and Go tests
```

Requires Go matching `go.mod`, Node, and pnpm. Run commands from the repo root.

## Environment Variables

`LAST_FM_API_KEY` — required for the `/api/users/{user}/albums` route to proxy Last.fm requests.

## Architecture

This is a Fiber Go backend at the repo root serving a Vite/React app (`web/src/App.tsx`) that lets users build a grid of album covers from Last.fm or custom sources, arrange them via drag-and-drop, and export the result as an image.

### State: Zustand store (`web/src/lib/albums-store.ts`)

All state lives in `useAlbumsStore` (persisted to `localStorage`). The core data structure is a `ContainerMap` — a record of three containers keyed by ID:

- `"grid"` — the visible grid (fixed size = `rows × columns`, filled with album or placeholder slots)
- `"lastfm"` — pool of albums fetched from Last.fm (not persisted, re-fetched on rehydration)
- `"custom"` — user-created albums; always ends with a `custom_add` sentinel item

Container IDs are defined as constants in `web/src/lib/util.ts` (`CUSTOM_CONTAINER_KEY`, `LAST_FM_CONTAINER_KEY`).

### Album types (`web/src/lib/albums.ts`)

All album types are defined with `arktype` for runtime validation and TypeScript inference:
- `lastfm` — fetched from Last.fm API
- `custom` — user-added via MusicBrainz search
- `placeholder` — empty grid slot (ID prefixed with `"placeholder_"`)
- `custom_add` — the "+ add" button sentinel in the custom panel (ID prefixed with `"custom_add_"`)

Use `isPlaceholderId()` / `isCustomAddId()` to distinguish sentinel items by ID.

### Drag-and-drop (`web/src/components/editor/context.tsx`)

`EditorContext` wraps the page in `@dnd-kit`'s `DndContext`. It enforces:
- Each container has an `allowedTypes` list; drops into incompatible containers are no-ops.
- The grid has `maxLength` and `minLength` (both = `rows × columns`). When dragging into a full grid, the last item is displaced back to its origin container.

### API routes

- `GET /api/health` — returns `{ "ok": true }`.
- `GET /api/users/{user}/albums` — proxies Last.fm weekly top albums, returns domain album arrays. Sorting stays in the client.
- `GET /api/release-groups` — searches MusicBrainz release groups. Accepts `query`, `type`, `field`, `limit`, and `offset`; returns custom album arrays with stable release-group IDs.
- Failures use `{ "error": "message" }`. The client validates payloads with arktype.
- `main.go` loads `.env`. Production serves `web/dist` from disk with HTML fallback for client routes; `-dev` proxies non-API traffic to Vite at `127.0.0.1:5173`, including HMR.
- TanStack Router handles `/{username}` and `?lastfm-user=`. Go owns the browser origin in both modes.

### Image export (`web/src/lib/export.ts`)

Targets the `#fm-grid` DOM element using `html-to-image`. Elements with the `no-export` CSS class are filtered out of the rendered output.

### Persistence

Custom albums, `lastfm` sort preference, `autofill`, `columns`, `rows`, `user`, and `hasSeenWelcome` are persisted under the existing `grid-albums-storage` key. The store assigns a unique ID to each added custom album so repeated release groups can be dragged independently. Last.fm albums are always re-fetched from the API on rehydration via `onRehydrateStorage`.

### Key libraries

- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop
- `zustand` + `zustand/middleware` — state with localStorage persistence
- `arktype` — client API response and data-model validation
- `@tanstack/react-router` — SPA routes
- `@base-ui/react` — headless UI primitives (ContextMenu, ScrollArea, Separator)
- `@tanstack/react-query` — data fetching in custom album search
- `html-to-image` — grid export to JPEG/PNG
- `motion` — animations
- Tailwind CSS v4 with `@tailwindcss/vite`

## Agent skills

### Issue tracker

Linear (MCP) — team **Dylans apps**, project **Grid**. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context (`CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.
