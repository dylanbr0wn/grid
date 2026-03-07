"use client";
import { LAST_FM_CONTAINER_KEY } from "@/lib/util";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Sortable } from "../sortable";
import { LastFmAlbum } from "./lastfm-container";

import { LastFmAlbum as LastFmAlbumType } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";

export default function LastFMAlbums() {
  const albums = useAlbumsStore((s) => s.albums[LAST_FM_CONTAINER_KEY].albums);
  return (
    <SortableContext
      id={LAST_FM_CONTAINER_KEY}
      items={albums}
      strategy={rectSortingStrategy}
    >
      {(albums as LastFmAlbumType[]).map((album, index) => (
        <Sortable
          key={album.id}
          id={album.id}
          sortData={{
            album,
          }}
        >
          <LastFmAlbum
            album={album}
            data-index={index}
            data-id={album.id}
            priority={true}
          />
        </Sortable>
      ))}
    </SortableContext>
  );
}
