"use client";
import { SortType } from "@/lib/sort";
import LastFMPallete, { LastFMAlbums } from "./lastfm-container";
import { useEffect } from "react";
import UserForm from "../user-form";
import { LAST_FM_CONTAINER_KEY } from "@/lib/util";
import { useQuery } from "@tanstack/react-query";
import { lastFmAlbum } from "@/lib/albums";
import { type } from "arktype";
import { useGridParams } from "@/lib/session-store";
import { useAlbumsStore } from "@/lib/albums-store";

export default function LastFM() {
  const setAlbums = useAlbumsStore((s) => s.setAlbums);
  const user = useGridParams((state) => state.user);
  const sort = useGridParams((state) => state.sort);
  const autofill = useGridParams((state) => state.autofill);

  const query = useQuery({
    queryKey: ["lastfm-albums", user, sort],
    queryFn: async () => {
      const url = new URL("/api/lastfm", window.location.origin);
      if (user) {
        url.searchParams.set("user", user);
      }
      if (sort) {
        url.searchParams.set("sort", sort);
      }

      const response = await fetch(url);

      if (!response.ok) {
        console.error("Failed to fetch albums from API", await response.text());
        throw new Error("Failed to fetch albums");
      }

      const parseJson = type("string.json.parse").to(lastFmAlbum.array());

      const data = parseJson(await response.text());

      if (data instanceof type.errors) {
        console.error(
          "Album data validation error:",
          data.summary,
        );
        throw new Error(`Album data validation error: ${data.summary}`);
      }

      return data;
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  // Side effect: write fetched albums into the grid/lastfm containers
  useEffect(() => {
    if (!query.data) return;
    const albums = query.data;
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
  // autofill intentionally excluded — we only want to re-apply on new fetch data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, setAlbums]);

  return (
    <LastFMPallete user={user} sort={sort as SortType}>
      {!user && (
        <div className="shrink-0 h-full flex flex-col items-center justify-center p-4 text-sm text-neutral-500 w-full col-span-3 gap-5">
          <div>Import your lastfm scrobbles.</div>
          <UserForm />
        </div>
      )}
      {query.isPending && user && (
        <div className="p-4 text-sm text-neutral-500 col-span-3">
          Loading Last.fm albums...
        </div>
      )}
      {query.isError && (
        <div className="p-4 text-sm text-red-400 col-span-3">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load Last.fm albums."}
        </div>
      )}
      {query.isFetched && !query.isError && <LastFMAlbums />}
    </LastFMPallete>
  );
}

