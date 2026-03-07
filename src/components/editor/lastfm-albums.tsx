"use client";
import { LAST_FM_CONTAINER_KEY } from "@/lib/util";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { LastFmAlbum } from "./lastfm-container";

import { LastFmAlbum as LastFmAlbumType } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";
import { useGridStore } from "@/lib/grid-store";

export default function LastFMAlbums() {
  const albums = useAlbumsStore((s) => s.albums[LAST_FM_CONTAINER_KEY].albums);
  const user = useGridStore((s) => s.user);
  if (!user || !albums) {
    return null;
  }

  if (albums.length === 0) {
    return (
      <div className="text-neutral-500 w-full whitespace-nowrap text-sm text-center">
        No Last.fm history found for user {user}
      </div>
    );
  }

  return (
    <SortableContext
      id={LAST_FM_CONTAINER_KEY}
      items={albums}
      strategy={rectSortingStrategy}
    >
      {(albums as LastFmAlbumType[]).map((album, index) => (
        <LastFmAlbum
          data-id={album.id}
          data-index={index}
          key={album.id}
          album={album}
        />
      ))}
    </SortableContext>
  );
}
