# Contributing to GRID

## Local Setup

1. Install dependencies: `pnpm i`
2. Copy `.env.example` → `.env.local` and fill in your Last.fm API key
3. Run the dev server: `pnpm dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Code Conventions

- **Runtime validation:** Use [ArkType](https://arktype.io/) schemas to validate external data (API responses, user input). See `src/lib/albums.ts` for examples.
- **State management:** All app state lives in a single Zustand store (`src/lib/albums-store.ts`). Persist only what can't be cheaply re-fetched.
- **CSS:** Use Tailwind CSS. Compose class names with the `cn()` utility from `src/lib/util.ts` (clsx + tailwind-merge).
- **Server-only code:** Files that must not be bundled for the client import `'server-only'` (e.g., `src/lib/lastfm.ts`, `src/lib/music-brainz.ts`).
- **Album types:** There are 4 album types — `lastfm`, `custom`, `placeholder`, `custom_add`. Each has an ArkType schema in `src/lib/albums.ts`. Types are discriminated at runtime using ID prefixes (e.g., `placeholder_xxx`).

## Project Layout

| Directory | Purpose |
| ---------------------- | ----------------------------------------------- |
| `src/app/api/` | Next.js API routes (Last.fm proxy, MusicBrainz search) |
| `src/components/editor/` | Grid editor: drag-and-drop context, grid view, album palettes |
| `src/components/album/` | Album cover rendering and details panel |
| `src/lib/` | Core logic: state store, type definitions, API clients, utilities |

See [docs/architecture.md](docs/architecture.md) for data flow and design details.

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Run `pnpm lint` to check for linting errors
4. Run `pnpm build` to verify the production build succeeds
5. Test manually in the browser — there is no automated test suite yet
