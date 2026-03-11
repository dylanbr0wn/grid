"use client";
import { cn, LAST_FM_CONTAINER_KEY } from "@/lib/util";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { LastFmAlbum } from "./lastfm-container";
import { motion } from "motion/react";

import {
  LastFmAlbum as LastFmAlbumType,
  newPlaceholderAlbum,
} from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";
import { IconAlertCircle, IconX } from "@tabler/icons-react";

export default function LastFMAlbums() {
  const albums = useAlbumsStore((s) => s.albums[LAST_FM_CONTAINER_KEY].albums);
  const user = useAlbumsStore((s) => s.user);
  const setAlbums = useAlbumsStore((s) => s.setAlbums);
  const setUser = useAlbumsStore((s) => s.setUser);
  const initialized = useAlbumsStore((s) => s.initialized);

  function logout() {
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

  if (!user || !albums || !initialized) {
    return null;
  }

  if (initialized && albums.length === 0) {
    return (
      <div className="w-full h-full text-sm px-5 pt-4 col-span-3 mb-auto text-red-700 items-center justify-center gap-2 flex flex-col">
        <IconAlertCircle className="size-8 inline-block mr-2" />
        <span>
          No <b className="text-neutral-400">Last.fm</b> history found for user{" "}
          <b className="text-neutral-400">{user}</b>
        </span>
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center relative text-sm group/button hover:bg-neutral-900 h-10"
        >
          <div className="w-full h-full flex items-center justify-center transition-colors gap-1 py-1 px-2">
            <IconX className="size-4  " />
            <div>Clear</div>
          </div>
          <motion.div
            className={cn(
              "absolute right-0 left-0 bottom-0 h-px transition-colors group-focus/button:h-0.75 bg-red-800  peer-focus:bg-red-800",
            )}
            layout
            transition={{
              duration: 0.15,
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <SortableContext
      id={LAST_FM_CONTAINER_KEY}
      items={albums}
      strategy={rectSortingStrategy}
    >
      {(albums as LastFmAlbumType[]).map((album) => (
        <LastFmAlbum
          key={album.id}
          album={album}
        />
      ))}
    </SortableContext>
  );
}
