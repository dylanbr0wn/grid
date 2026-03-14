# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build (Turbopack)
pnpm lint         # Run ESLint
```

No test suite exists in this project.

## Environment Variables

`LAST_FM_API_KEY` — required for the `/api/lastfm` route to proxy Last.fm requests.

## Architecture

This is a single-page Next.js app (`src/app/page.tsx`) that lets users build a grid of album covers from Last.fm or custom sources, arrange them via drag-and-drop, and export the result as an image.

### State: Zustand store (`src/lib/albums-store.ts`)

All state lives in `useAlbumsStore` (persisted to `localStorage`). The core data structure is a `ContainerMap` — a record of three containers keyed by ID:

- `"grid"` — the visible grid (fixed size = `rows × columns`, filled with album or placeholder slots)
- `"lastfm"` — pool of albums fetched from Last.fm (not persisted, re-fetched on rehydration)
- `"custom"` — user-created albums; always ends with a `custom_add` sentinel item

Container IDs are defined as constants in `src/lib/util.ts` (`CUSTOM_CONTAINER_KEY`, `LAST_FM_CONTAINER_KEY`).

### Album types (`src/lib/albums.ts`)

All album types are defined with `arktype` for runtime validation and TypeScript inference:
- `lastfm` — fetched from Last.fm API
- `custom` — user-added via MusicBrainz search
- `placeholder` — empty grid slot (ID prefixed with `"placeholder_"`)
- `custom_add` — the "+ add" button sentinel in the custom panel (ID prefixed with `"custom_add_"`)

Use `isPlaceholderId()` / `isCustomAddId()` to distinguish sentinel items by ID.

### Drag-and-drop (`src/components/editor/context.tsx`)

`EditorContext` wraps the page in `@dnd-kit`'s `DndContext`. It enforces:
- Each container has an `allowedTypes` list; drops into incompatible containers are no-ops.
- The grid has `maxLength` and `minLength` (both = `rows × columns`). When dragging into a full grid, the last item is displaced back to its origin container.

### API routes

- `GET /api/lastfm` — proxies `user.getTopAlbums` from Last.fm. Requires `?lastfm-user=` and `?lastfm-sort=` params. Uses `arktype` for request/response validation.
- `GET /api/search` — searches MusicBrainz release groups (`src/lib/music-brainz.ts`). Accepts `?query=`, `?limit=`, `?offset=`.

### Image export (`src/lib/export.ts`)

Targets the `#fm-grid` DOM element using `html-to-image`. Elements with the `no-export` CSS class are filtered out of the rendered output.

### Persistence

Only the `custom` container albums, `lastfm` sort preference, `autofill`, `columns`, `rows`, and `user` are persisted. Last.fm albums are always re-fetched from the API on rehydration via `onRehydrateStorage`.

### Key libraries

- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop
- `zustand` + `zustand/middleware` — state with localStorage persistence
- `arktype` — runtime validation (used for both API I/O and data models)
- `@base-ui/react` — headless UI primitives (ContextMenu, ScrollArea, Separator)
- `@tanstack/react-query` — data fetching in the Last.fm panel
- `html-to-image` — grid export to JPEG/PNG
- `motion` — animations
- Tailwind CSS v4 with `@tailwindcss/postcss`
