"use client";

import { useAlbumsStore } from "@/lib/albums-store";
import { SortOptions, SortType } from "@/lib/sort";
import { calcHeight, cn, CUSTOM_CONTAINER_KEY, HEADER_HEIGHT } from "@/lib/util";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { CustomAlbum } from "./custom";
import { CustomAlbum as CustomAlbumType, isCustomAddId } from "@/lib/albums";
import { ScrollArea } from "@base-ui/react";
import Select from "../select";

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
  const albums = useAlbumsStore(
    (state) => state.albums[CUSTOM_CONTAINER_KEY].albums,
  );
  const title = useAlbumsStore(
    (state) => state.albums[CUSTOM_CONTAINER_KEY].title,
  );

  function updateSort(newSort: SortType | null) {
    if (!newSort) return;
    setSort(CUSTOM_CONTAINER_KEY, newSort);
  }
  return (
    <div
      className={cn(
        "min-h-42 w-96 relative flex flex-col max-h-1/2 h-min shrink-0",
      )}
    >
      <div className="w-full h-10 border-b border-neutral-800 flex items-center shrink-0 gap-1">
        <h5 className="text-neutral-300 text-sm mx-3 mb-0 font-code">
          {title}
        </h5>
        <div className="grow" />
        {sort && (
          <Select
            value={sort}
            items={sortOptions}
            disabled={albums.length <= 2}
            onChange={(v) => updateSort(v as SortType)}
            icon={<div className="text-neutral-500">sort by</div>}
          />
        )}
      </div>
      <ScrollArea.Root
        style={{ height: calcHeight(albums.length) - HEADER_HEIGHT }}
        className="relative w-full h-full overflow-hidden"
      >
        <ScrollArea.Viewport className="w-full max-h-full grid grid-cols-3 relative overscroll-contain overflow-x-hidden grid-pattern">
          <SortableContext
            id={CUSTOM_CONTAINER_KEY}
            items={albums}
            strategy={rectSortingStrategy}
          >
            {(albums as CustomAlbumType[]).map((album, index) => (
              <CustomAlbum
                key={album.id}
                disabled={isCustomAddId(album.id) ? { draggable: true } : false}
                album={album}
                priority={true}
              />
            ))}
          </SortableContext>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="absolute right-0 top-0 flex w-1 justify-center bg-neutral-900/70 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-75 data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-75">
          <ScrollArea.Thumb className="w-full bg-neutral-500" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
