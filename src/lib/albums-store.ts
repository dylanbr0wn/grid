"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UniqueIdentifier } from "@dnd-kit/core";
import {
  AlbumTypes,
  CustomAddAlbum,
  CustomAlbum,
  LastFmAlbum,
  newCustomAddAlbum,
  newPlaceholderAlbum,
  PlaceholderAlbum,
} from "./albums";
import { CUSTOM_CONTAINER_KEY, LAST_FM_CONTAINER_KEY } from "./util";
import { sortAlbums, SortType } from "./sort";
import { fetchLastFmAlbums } from "@/components/user-form";

/**
 * A container holds an ordered list of albums with drag-and-drop constraints.
 * Three containers exist: "grid" (the NxM grid), "custom" (user-added albums),
 * and "lastfm" (albums fetched from Last.fm).
 */
export type Container = {
  title: string;
  albums: (PlaceholderAlbum | LastFmAlbum | CustomAlbum | CustomAddAlbum)[];
  /** Which album types can be dropped into this container. */
  allowedTypes: AlbumTypes[];
  /** Max number of albums (enforced during drag). Only set on the grid container. */
  maxLength?: number;
  /** Min number of albums — placeholders are added to maintain this. Only set on the grid container. */
  minLength?: number;
  /** Current sort mode, or undefined for no sorting. */
  sort: SortType | undefined;
};

/** Map of container IDs to their container state. Keys: "grid", "custom", "lastfm". */
export type ContainerMap = Record<UniqueIdentifier, Container>;

export type SetAlbumFunc = (
  id: UniqueIdentifier,
  album:
    | LastFmAlbum
    | CustomAlbum
    | PlaceholderAlbum
    | CustomAddAlbum
    | ((album: LastFmAlbum | CustomAlbum | PlaceholderAlbum | CustomAddAlbum) => LastFmAlbum | CustomAlbum | PlaceholderAlbum | CustomAddAlbum)
) => void;


/**
 * The complete application state. Managed by a Zustand store with localStorage persistence.
 * Only custom albums, sort preferences, dimensions, and username are persisted —
 * Last.fm albums are re-fetched on rehydration.
 */
export type AlbumsState = {
  albums: ContainerMap;
  /** The album currently being dragged or inspected, shown in the details panel. */
  activeAlbum: LastFmAlbum | CustomAlbum | null;

  user: string | undefined;
  setUser: (user: string | undefined) => void;

  autofill: boolean;
  setAutofill: (autofill: boolean) => void;

  columns: number;

  rows: number;

  initialized: boolean;
  setInitialized: (initialized: boolean) => void;

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
  setSort: (containerId: UniqueIdentifier, sort: SortType | undefined) => void;
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
      sort: undefined,
    },
    [CUSTOM_CONTAINER_KEY]: {
      title: "Custom Albums",
      allowedTypes: ["custom", "custom_add"],
      albums: [newCustomAddAlbum()],
      sort: "name",
    },
    [LAST_FM_CONTAINER_KEY]: {
      title: "Last.fm",
      allowedTypes: ["lastfm"],
      albums: [],
      sort: "playcount",
    },
  };
}

/**
 * Recalculates the grid container when rows/columns change.
 * - Growing: adds placeholder albums to fill new slots.
 * - Shrinking: removes albums from the end. Non-placeholder albums are returned
 *   to their source container (Last.fm or custom) and that container's sort is
 *   set to "custom" to preserve the insertion order.
 */
function updateGridDimensions(state: AlbumsState, rows: number, columns: number): ContainerMap {
  const grid = state.albums.grid;
  const lastfm = state.albums[LAST_FM_CONTAINER_KEY];
  const custom = state.albums[CUSTOM_CONTAINER_KEY];
  const targetLength = rows * columns;
  const newGridAlbums = [...grid.albums];
  let lastFmAlbums = [...lastfm.albums];
  let customAlbums = [...custom.albums];

  let lastFmSort = lastfm.sort || "playcount";
  let customSort = custom.sort || "name";

  if (targetLength > newGridAlbums.length) {
    newGridAlbums.push(
      ...Array.from(
        { length: targetLength - newGridAlbums.length },
        newPlaceholderAlbum
      )
    );
  } else if (targetLength < newGridAlbums.length) {
    const removed = newGridAlbums.splice(targetLength);
    const removedLastFm = removed.filter((a) => a.type === "lastfm") as LastFmAlbum[];
    const removedCustom = removed.filter((a) => a.type === "custom") as CustomAlbum[];

    if (removedLastFm.length > 0) {
      lastFmAlbums = [...lastFmAlbums, ...removedLastFm];
      lastFmSort = "custom"
    }
    if (removedCustom.length > 0) {
      customAlbums = [...customAlbums, ...removedCustom];
      customSort = "custom"
    }
  }

  return {
    ...state.albums,
    [LAST_FM_CONTAINER_KEY]: {
      ...lastfm,
      albums: lastFmAlbums,
      sort: lastFmSort,
    },
    [CUSTOM_CONTAINER_KEY]: {
      ...custom,
      albums: customAlbums,
      sort: customSort,
    },
    grid: {
      ...grid,
      albums: newGridAlbums,
      maxLength: targetLength,
      minLength: targetLength,
    },
  }
}

/**
 * The main Zustand store for all application state.
 * Persisted to localStorage under the key "grid-albums-storage".
 * On rehydration, Last.fm albums are re-fetched if a username is saved.
 */
export const useAlbumsStore = create<AlbumsState>()(
  persist(
    (set, get) => ({
      albums: initialContainerMap(),
      activeAlbum: null,
      user: undefined,
      autofill: false,
      rows: 5,
      columns: 5,
      initialized: false,
      setInitialized: (initialized: boolean) => set({ initialized }),
      setAutofill: (autofill: boolean) => set({ autofill }),
      setUser: (user: string | undefined) => set({ user }),
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
          const custom = state.albums[CUSTOM_CONTAINER_KEY];
          if (custom.albums.length === 0) {
            return {
              albums: {
                ...state.albums,
                [CUSTOM_CONTAINER_KEY]: {
                  ...custom,
                  albums: [album],
                },
              },
            };
          }
          return {
            albums: {
              ...state.albums,
              [CUSTOM_CONTAINER_KEY]: {
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
          return {
            albums: updateGridDimensions(state, rows, columns),
          };
        }),

      setRows: (rows) => set((state) => {
        return {
          albums: updateGridDimensions(state, rows, state.columns),
          rows,
        };
      }),

      setColumns: (columns) => set((state) => {
        return {
          albums: updateGridDimensions(state, state.rows, columns),
          columns,
        };
      }),
      setSort: (containerId, sort) =>
        set((state) => {
          const container = state.albums[containerId];
          if (!container) return state;

          if (containerId === CUSTOM_CONTAINER_KEY) {
            // make sure the custom add album stays at the end
            const customAddIndex = container.albums.findIndex((a) =>
              a.type === "custom_add"
            );
            if (customAddIndex !== -1 && customAddIndex !== container.albums.length - 1) {
              const albums = [...container.albums];
              const customAddAlbum = albums.splice(customAddIndex, 1)[0];
              albums.push(customAddAlbum);
              return {
                albums: {
                  ...state.albums,
                  [containerId]: {
                    ...container,
                    albums: sortAlbums(albums as CustomAlbum[], sort),
                    sort,
                  },
                },
              };
            }
          }

          const sortableAlbums = container.albums.filter(
            (a) => a.type !== "placeholder"
          ) as (LastFmAlbum | CustomAlbum)[];

          return {
            albums: {
              ...state.albums,
              [containerId]: {
                ...container,
                albums: sortAlbums(sortableAlbums, sort),
                sort,
              },
            },
          };
        }),
    }),
    {
      name: "grid-albums-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist the custom albums and the sort type for the lastfm container, not the albums themselves (which can be large and are easily re-fetched)
      partialize: (state) => ({
        albums: {
          custom: state.albums.custom,
          lastfm: {
            sort: state.albums.lastfm.sort,
          }
        },
        autofill: state.autofill,
        columns: state.columns,
        rows: state.rows,
        user: state.user,
      }),
      // Custom merge so that the lastfm container (not in persisted data)
      // is always restored from the initial state rather than being dropped
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AlbumsState>;
        return {
          ...currentState,
          ...persisted,
          albums: {
            ...currentState.albums,
            ...(persisted.albums ?? {}),
            [LAST_FM_CONTAINER_KEY]: {
              ...currentState.albums[LAST_FM_CONTAINER_KEY],
              ...(persisted.albums?.[LAST_FM_CONTAINER_KEY] ?? {}),
              albums: [], // always reset lastfm albums on merge, they will be re-fetched in onRehydrateStorage
            },
          },
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (!state) {
          console.error("Failed to rehydrate albums store", error);
          return;
        }
        console.log("Albums store rehydrated", state);
        const user = state.user;
        const sort = state.albums[LAST_FM_CONTAINER_KEY].sort;
        const autofill = state.autofill;
        if (!user) {
          state.setInitialized(true);
          return;
        }
        if (!sort) {
          console.warn("No sort type set, defaulting to 'playcount'");
        }
        fetchLastFmAlbums(user, sort || "playcount")
          .then((albums) => {
            state.setAlbums((prev) => {

              const sortedAlbums = sortAlbums(albums, sort || "playcount");
              console.log("fetched and sorted albums on rehydration", sortedAlbums);
              if (autofill) {
                const remaining = [...sortedAlbums];
                const newGridAlbums = prev.grid.albums.map((a) => {
                  if (a.type === "placeholder" && remaining.length > 0) {
                    return remaining.shift()!;
                  }
                  return a;
                });
                return {
                  ...prev,
                  [LAST_FM_CONTAINER_KEY]: {
                    ...prev[LAST_FM_CONTAINER_KEY],
                    albums: remaining,
                  },
                  grid: { ...prev.grid, albums: newGridAlbums },
                };
              }
              return {
                ...prev,
                [LAST_FM_CONTAINER_KEY]: {
                  ...prev[LAST_FM_CONTAINER_KEY],
                  albums: sortedAlbums,
                },
              };
            });
          })
          .catch((err) => {
            console.error("Error fetching albums:", err);
            state.setUser(undefined);
          })
          .finally(() => {
            state.setInitialized(true);
          });
      }
    }
  )
);
