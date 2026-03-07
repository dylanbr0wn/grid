"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UniqueIdentifier } from "@dnd-kit/core";
import { ContainerMap, SetAlbumFunc } from "@/context/grid";
import {
  CustomAlbum,
  LastFmAlbum,
  newCustomAlbum,
  newPlaceholderAlbum,
} from "./albums";
import { useGridStore } from "./session-store";
import { LAST_FM_CONTAINER_KEY } from "./util";

export type AlbumsState = {
  albums: ContainerMap;
  activeAlbum: LastFmAlbum | CustomAlbum | null;
  setAlbums: (
    updater: ContainerMap | ((prev: ContainerMap) => ContainerMap)
  ) => void;
  setAlbum: SetAlbumFunc;
  setTextColor: (id: UniqueIdentifier, color: string) => void;
  setTextBackground: (id: UniqueIdentifier, enabled: boolean) => void;
  addCustomAlbum: (album: CustomAlbum) => void;
  setActiveAlbum: (album: LastFmAlbum | CustomAlbum | null) => void;
  updateDimensions: (rows: number, columns: number) => void;
  setRows: (rows: number) => void;
  setColumns: (columns: number) => void;
};

const DEFAULT_ROWS = 5;
const DEFAULT_COLUMNS = 5;

function initialContainerMap(): ContainerMap {
  return {
    grid: {
      title: "Grid",
      allowedTypes: ["placeholder", "lastfm", "custom"],
      maxLength: DEFAULT_ROWS * DEFAULT_COLUMNS,
      minLength: DEFAULT_ROWS * DEFAULT_COLUMNS,
      albums: Array.from(
        { length: DEFAULT_ROWS * DEFAULT_COLUMNS },
        newPlaceholderAlbum
      ),
    },
    custom: {
      title: "Custom Albums",
      allowedTypes: ["custom"],
      albums: [newCustomAlbum()],
    },
    [LAST_FM_CONTAINER_KEY]: {
      title: "Last.fm",
      allowedTypes: ["lastfm"],
      albums: [],
    },
  };
}

export const useAlbumsStore = create<AlbumsState>()(
  persist(
    (set, get) => ({
      albums: initialContainerMap(),
      activeAlbum: null,

      setAlbums: (updater) =>
        set((state) => ({
          albums:
            typeof updater === "function" ? updater(state.albums) : updater,
        })),

      setAlbum: (id, album) =>
        set((state) => {
          const container = Object.keys(state.albums).find((key) =>
            state.albums[key].albums.some((a) => a.id === id)
          );
          if (!container) return state;

          return {
            albums: {
              ...state.albums,
              [container]: {
                ...state.albums[container],
                albums: state.albums[container].albums.map((item) =>
                  item.id === id
                    ? typeof album === "function"
                      ? album(item)
                      : album
                    : item
                ),
              },
            },
          };
        }),

      setTextColor: (id, color) =>
        set((state) => {
          const container = Object.keys(state.albums).find((key) =>
            state.albums[key].albums.some((a) => a.id === id)
          );
          if (!container) return state;

          return {
            albums: {
              ...state.albums,
              [container]: {
                ...state.albums[container],
                albums: state.albums[container].albums.map((item) =>
                  item.id === id ? { ...item, textColor: color } : item
                ),
              },
            },
          };
        }),

      setTextBackground: (id, enabled) =>
        set((state) => {
          const container = Object.keys(state.albums).find((key) =>
            state.albums[key].albums.some((a) => a.id === id)
          );
          if (!container) return state;

          return {
            albums: {
              ...state.albums,
              [container]: {
                ...state.albums[container],
                albums: state.albums[container].albums.map((item) =>
                  item.id === id ? { ...item, textBackground: enabled } : item
                ),
              },
            },
          };
        }),

      addCustomAlbum: (album) =>
        set((state) => {
          const custom = state.albums.custom;
          return {
            albums: {
              ...state.albums,
              custom: {
                ...custom,
                albums: [
                  ...custom.albums.slice(0, custom.albums.length - 1),
                  album,
                  custom.albums[custom.albums.length - 1],
                ],
              },
            },
          };
        }),

      setActiveAlbum: (album) => set({ activeAlbum: album }),

      updateDimensions: (rows, columns) =>
        set((state) => {
          const grid = state.albums.grid;
          const targetLength = rows * columns;
          const newGridAlbums = [...grid.albums];

          if (targetLength > newGridAlbums.length) {
            newGridAlbums.push(
              ...Array.from(
                { length: targetLength - newGridAlbums.length },
                newPlaceholderAlbum
              )
            );
          } else if (targetLength < newGridAlbums.length) {
            newGridAlbums.splice(targetLength);
          }

          return {
            albums: {
              ...state.albums,
              grid: {
                ...grid,
                albums: newGridAlbums,
                maxLength: targetLength,
                minLength: targetLength,
              },
            },
          };
        }),

      setRows: (rows) => {
        useGridStore.getState().setRows(rows);
        const columns = useGridStore.getState().columns;
        get().updateDimensions(rows, columns);
      },

      setColumns: (columns) => {
        useGridStore.getState().setColumns(columns);
        const rows = useGridStore.getState().rows;
        get().updateDimensions(rows, columns);
      },
    }),
    {
      name: "grid-albums-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist grid and custom containers; lastfm is always re-fetched
      partialize: (state) => ({
        albums: {
          grid: state.albums.grid,
          custom: state.albums.custom,
        },
      }),
      // Custom merge so that the lastfm container (not in persisted data)
      // is always restored from the initial state rather than being dropped
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AlbumsState>;
        return {
          ...currentState,
          albums: {
            ...currentState.albums,
            ...(persisted.albums ?? {}),
            [LAST_FM_CONTAINER_KEY]: currentState.albums[LAST_FM_CONTAINER_KEY],
          },
        };
      },
    }
  )
);
