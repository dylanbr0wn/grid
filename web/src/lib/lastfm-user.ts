import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { newPlaceholderAlbum } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";
import { fetchLastFmAlbums } from "@/lib/lastfm-api";
import { sortAlbums } from "@/lib/sort";
import { LAST_FM_CONTAINER_KEY, LAST_FM_USER_KEY } from "@/lib/util";

export async function importLastFmUser(username: string) {
  const { albums: containers, autofill, setUser, setAlbums } =
    useAlbumsStore.getState();
  const sort = containers[LAST_FM_CONTAINER_KEY].sort || "playcount";
  const albums = sortAlbums(await fetchLastFmAlbums(username, sort), sort);
  setUser(username);
  setAlbums((prev) => {
    if (autofill) {
      const remaining = [...albums];
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
        albums,
      },
    };
  });
}

function clearLastFmUserState() {
  const { setAlbums, setUser } = useAlbumsStore.getState();
  setAlbums((prev) => {
    return {
      ...prev,
      lastfm: {
        ...prev.lastfm,
        albums: [],
      },
      grid: {
        ...prev.grid,
        albums: prev.grid.albums.map((album) => {
          if (album.type === "lastfm") {
            return newPlaceholderAlbum();
          }
          return album;
        }),
      },
    };
  });
  setUser(undefined);
}

/** Deep-link `/{username}` or `?lastfm-user=` into store after persist rehydration. */
export function useApplyLastFmUser(username: string | undefined) {
  const storeUser = useAlbumsStore((s) => s.user);
  const initialized = useAlbumsStore((s) => s.initialized);
  const inFlight = useRef<string | null>(null);
  const failedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!username || !initialized) return;
    if (storeUser === username) return;
    if (failedFor.current === username) return;
    if (inFlight.current === username) return;
    inFlight.current = username;
    void importLastFmUser(username)
      .catch((err) => {
        console.warn("Error applying Last.fm user from route:", err);
        failedFor.current = username;
        clearLastFmUserState();
      })
      .finally(() => {
        if (inFlight.current === username) {
          inFlight.current = null;
        }
      });
  }, [username, initialized, storeUser]);
}

export function useClearLastFmUser() {
  const navigate = useNavigate();

  return () => {
    // Leave `/{username}` (and `?lastfm-user=`) before clearing, or the
    // apply-from-route effect would immediately re-import the same user.
    void navigate({
      to: "/",
      search: { [LAST_FM_USER_KEY]: undefined },
    }).then(() => {
      clearLastFmUserState();
    });
  };
}
