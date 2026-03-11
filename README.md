# GRID

A Last.fm album grid generator. Build custom album grids from your Last.fm listening history or by searching MusicBrainz, then export them as images.

**Live:** [grid.dylanbrown.xyz](https://grid.dylanbrown.xyz)

## Features

- Pull your top albums from Last.fm (past 7 days)
- Search and add albums from MusicBrainz
- Drag-and-drop albums between a configurable N×M grid and source palettes
- Sort by playcount, name, artist, or randomize
- Auto-detect text color/contrast based on album artwork brightness
- Export the grid as JPEG or PNG

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React Compiler)
- **UI:** React 19, Tailwind CSS 4, Base UI, Motion
- **State:** Zustand (persisted to localStorage)
- **Data Fetching:** TanStack React Query
- **Drag & Drop:** dnd-kit
- **Validation:** ArkType (runtime type checking)
- **Export:** html-to-image

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v9+)
- A [Last.fm API key](https://www.last.fm/api/account/create)

## Getting Started

1. Clone the repo and install dependencies:

```bash
pnpm i
```

2. Create a `.env.local` file from the example:

```bash
cp .env.example .env.local
```

3. Add your Last.fm API key to `.env.local`:

```
LAST_FM_API_KEY=your_api_key_here
```

4. Start the dev server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
| ------------ | ---------------------------------------- |
| `pnpm dev` | Start development server (Turbopack) |
| `pnpm build` | Production build (Turbopack) |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
