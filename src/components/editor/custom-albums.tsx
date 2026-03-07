"use client";

import { useAlbumsStore } from "@/lib/albums-store";
import { SortOptions, SortType, sortAlbums } from "@/lib/sort";
import { CUSTOM_CONTAINER_KEY } from "@/lib/util";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import AlbumPallete from "../pallette";
import { Sortable } from "../sortable";
import { CustomAlbum } from "./custom";
import dynamic from "next/dynamic";
import { IconLoader2 } from "@tabler/icons-react";
import { CustomAlbum as CustomAlbumType } from "@/lib/albums";

const Select = dynamic(() => import("../select"), {
  ssr: false,
  loading: () => (
    <div className="h-full px-3 flex items-center justify-center">
      <IconLoader2 className="size-4 text-neutral-500 mx-auto my-4 animate-spin" />
    </div>
  ),
});

const sortOptions: Pick<SortOptions, "random" | "name" | "artist"> = {
  random: "Random",
  name: "Name",
  artist: "Artist",
};

export default function CustomPallete() {
  const setSort = useAlbumsStore((state) => state.setSort);
  const sort = useAlbumsStore(
    (state) => state.albums[CUSTOM_CONTAINER_KEY].sort,
  );
  const setAlbums = useAlbumsStore((state) => state.setAlbums);
  const albums = useAlbumsStore(
    (state) => state.albums[CUSTOM_CONTAINER_KEY].albums,
  );
  const title = useAlbumsStore(
    (state) => state.albums[CUSTOM_CONTAINER_KEY].title,
  );

  function updateSort(newSort: SortType) {
    setSort(CUSTOM_CONTAINER_KEY, newSort);
    setAlbums((prev) => {
      const container = prev[CUSTOM_CONTAINER_KEY];
      const sortedAlbums = [...container.albums.slice(0, -1)];

      return {
        ...prev,
        [CUSTOM_CONTAINER_KEY]: {
          ...prev[CUSTOM_CONTAINER_KEY],
          albums: [
            ...sortAlbums(sortedAlbums as CustomAlbumType[], newSort),
            container.albums[container.albums.length - 1],
          ],
        },
      };
    });
  }
  return (
    <AlbumPallete
      title={title}
      length={albums.length}
      header={
        <>
          <h5 className="text-neutral-300 text-sm mx-3 mb-0 font-code">
            {title}
          </h5>
          <div className="grow" />
          {sort && (
            <Select
              value={sort}
              items={sortOptions}
              disabled={albums.length <= 2}
              onChange={(v) => v && updateSort(v as SortType)}
              icon={<div className="text-neutral-500">sort by</div>}
            />
          )}
        </>
      }
    >
      <SortableContext
        id={CUSTOM_CONTAINER_KEY}
        items={albums}
        strategy={rectSortingStrategy}
      >
        {(albums as CustomAlbumType[]).map((album, index) => (
          <CustomAlbum
            key={album.id}
            disabled={{
              draggable: album.type === "custom" && !album.mbid,
              droppable: albums.length >= 1,
            }}
            album={album}
            data-index={index}
            data-id={album.id}
            priority={true}
          />
        ))}
      </SortableContext>
    </AlbumPallete>
  );
}
