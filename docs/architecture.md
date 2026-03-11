# Architecture

## High-Level Overview

```
┌──────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  ┌──────────┐   ┌───────────┐  ┌──────────────┐  │
│  │ Last.fm  │   │   Grid    │  │   Custom     │  │
│  │ Palette  │   │  (NxM)    │  │   Palette    │  │
│  └────┬─────┘   └─────┬─────┘  └──────┬───────┘  │
│       │               │               │          │
│       └───────────────┼───────────────┘          │
│              drag & drop (dnd-kit)               │
│                       │                          │
│              ┌────────┴────────┐                 │
│              │  Zustand Store  │                 │
│              │ (albums-store)  │                 │
│              └────────┬────────┘                 │
│                       │                          │
│              ┌────────┴────────┐                 │
│              │   localStorage  │                 │
│              │  (persistence)  │                 │
│              └─────────────────┘                 │
└──────────────────────┬───────────────────────────┘
                       │ fetch
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌─────────┐ ┌──────────────┐
   │ /api/lastfm│ │/api/    │ │Cover Art     │
   │            │ │ search  │ │Archive (CDN) │
   └─────┬──────┘ └────┬────┘ └──────────────┘
         ▼             ▼
   ┌───────────┐  ┌────────────┐
   │ Last.fm   │  │MusicBrainz │
   │ API       │  │ API        │
   └───────────┘  └────────────┘
```

The app is a **Next.js 16 App Router** project. The browser renders a grid editor that lets users drag albums between three containers. Two API routes proxy external music APIs so that API keys stay server-side.

## State Management

All client-side state is managed by a single **Zustand store** in `src/lib/albums-store.ts`.

### Containers

The store holds a `ContainerMap` — a record of three containers:

| Key | Purpose | Allowed album types | Constraints |
| ---------- | ------------------------------------ | -------------------------------- | ----------------------------------- |
| `grid` | The main NxM grid the user builds | `lastfm`, `custom`, `placeholder`| `maxLength` and `minLength` = rows × columns |
| `custom` | User-added albums from MusicBrainz | `custom`, `custom_add` | None — grows freely |
| `lastfm` | Albums fetched from Last.fm | `lastfm` | None — populated on login/rehydrate |

Each container has:
- `albums` — ordered array of album objects
- `allowedTypes` — which album types can be dropped here
- `sort` — current sort mode (`playcount`, `name`, `artist`, `random`, `custom`)
- `maxLength` / `minLength` — optional size constraints (used by the grid)

### Persistence

The store uses Zustand's `persist` middleware with **selective serialization**:

- **Persisted:** custom albums, sort preferences, grid dimensions, username, autofill setting
- **Not persisted:** Last.fm albums (re-fetched on rehydrate), active album, initialized flag

A custom `merge` function ensures the Last.fm container is always restored from initial state (empty albums array), then the `onRehydrateStorage` callback re-fetches the user's Last.fm albums if a username is saved.

### Grid Resizing

When the user changes rows/columns, `updateGridDimensions()` adjusts the grid:

- **Growing:** Adds placeholder albums to fill new slots
- **Shrinking:** Removes albums from the end. Non-placeholder albums are returned to their source container (Last.fm → lastfm container, custom → custom container) and the source container's sort is set to `custom` to preserve insertion order.

## Album Type System

Four album types are defined in `src/lib/albums.ts` using **ArkType** runtime validation schemas:

| Type | Purpose | Key fields | ID prefix |
| ------------- | -------------------------------------------- | ------------------------------------ | -------------- |
| `lastfm` | Album from Last.fm API | `album`, `artist`, `plays`, `img` (required) | `{mbid}` or `{artist}_{name}` |
| `custom` | User-added album from MusicBrainz search | `album`, `artist`, `img` (optional) | `custom-{mbid}-{rand}` |
| `placeholder` | Empty grid slot | `id`, `type` only | `placeholder_` |
| `custom_add` | The "+Add Album" button in the custom palette | `id`, `type` only | `custom_add_` |

Album types are discriminated at runtime by their `type` field and by **ID prefix** checks (`isPlaceholderId()`, `isCustomAddId()`).

## Drag and Drop

The drag-and-drop system is implemented in `src/components/editor/context.tsx` using **dnd-kit**.

### `EditorContext` wraps the entire editor in a `DndContext` and handles two key callbacks:

**`onDragOver`** — fires continuously while dragging over a target:
1. Checks if the dragged album's type is allowed in the target container
2. If the target container is at `maxLength`:
   - Tries to remove a placeholder from the target to make room
   - If no placeholder, pushes the last item out to the source container
   - Tracks the displaced item in `overflowItem` ref for potential restoration
3. If the source container falls below `minLength`, adds a placeholder
4. Inserts the dragged item at the calculated position

**`onDragEnd`** — fires when the user drops:
1. Uses `arrayMove` for normal reordering, `arraySwap` when dropping onto a placeholder
2. Ensures the `custom_add` button always stays at the end of the custom container
3. Clears the `overflowItem` ref

### Grid sorting strategy

The grid uses a custom `SortingStrategy` that chooses between `arrayMove` and `arraySwap` animations depending on whether the drop target is a placeholder.

## Image Pipeline

### Album cover resolution

When fetching from Last.fm, album images are resolved with a priority cascade:
1. Large image from Last.fm API response
2. Cover Art Archive URL (via MusicBrainz ID)
3. Small image from Last.fm
4. Fallback/empty image from Last.fm
5. Local placeholder image (`/img/placeholder.png`)

The `imgs` array stores all available URLs so components can fall back if the primary image fails.

### Brightness detection

For text overlays on album art, `getImageBrightness()` in `src/lib/util.ts`:
1. Draws the image to an off-screen canvas
2. Samples the **bottom 25%** of the image (where text typically appears)
3. Averages RGB values to compute a brightness score
4. `getBrightnessStyle()` maps the score to text styling:
   - \> 200: black text, no background
   - \> 160: black text, with background
   - \> 60: white text, with background
   - ≤ 60: white text, no background

## Export

`src/lib/export.ts` wraps the `html-to-image` library to capture the grid as JPEG, PNG, or Blob:
- Renders the grid DOM element to a canvas at the exact grid pixel dimensions
- Filters out elements with the CSS class `no-export` (e.g., drag handles, UI chrome)
- Uses the local placeholder image as a fallback for any images that fail to load
- Black background (`#000000`)
