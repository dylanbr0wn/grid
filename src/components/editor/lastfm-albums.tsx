"use client";
import { sortAlbums, SortOptions, SortType } from "@/lib/sort";

import { calcHeight, cn, LAST_FM_CONTAINER_KEY } from "@/lib/util";

import { LastFmAlbum as LastFmAlbumType } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";
import { ScrollArea } from "@base-ui/react";
import Select from "../select";
import UserForm from "../user-form";
import LastFMEmpty from "./lastfm-empty";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import LastFmAlbum from "./lastfm-album";
import UserButton from "./lastfm-user-button";

const sortOptions: SortOptions = {
  playcount: "Plays",
  name: "Name",
  artist: "Artist",
  random: "Random",
  custom: "Custom",
};

export default function LastFMAlbums() {
  const albums = useAlbumsStore(
    (state) => state.albums[LAST_FM_CONTAINER_KEY].albums,
  );
  const user = useAlbumsStore((state) => state.user);
  const sort = useAlbumsStore(
    (state) => state.albums[LAST_FM_CONTAINER_KEY].sort,
  );
  const setSort = useAlbumsStore((state) => state.setSort);
  const setAlbums = useAlbumsStore((state) => state.setAlbums);
  const initialized = useAlbumsStore((s) => s.initialized);

  function updateSort(newSort: SortType) {
    setSort(LAST_FM_CONTAINER_KEY, newSort);
    setAlbums((prev) => {
      const newAlbums = { ...prev };
      const sortedAlbums = [...albums];

      newAlbums[LAST_FM_CONTAINER_KEY].albums = sortAlbums(
        sortedAlbums as LastFmAlbumType[],
        newSort,
      );
      return newAlbums;
    });
  }

  if (!albums || !initialized) {
    return null;
  }

  return (
    <div
      className={cn(
        "min-h-42 w-96 relative flex flex-col max-h-full h-full overflow-hidden grow",
      )}
      style={{ height: calcHeight(albums.length) }}
    >
      <div className="w-full h-9.75 border-b border-neutral-800 flex items-center shrink-0 gap-1">
        <UserButton />
        <div className="grow" />
        {sort && (
          <Select
            value={sort}
            items={sortOptions}
            disabled={albums.length <= 1}
            onChange={(v) => updateSort(v as SortType)}
            icon={<div className="text-neutral-500">sort by</div>}
          />
        )}
      </div>
      <ScrollArea.Root className="relative w-full flex-1 min-h-0 overflow-hidden">
        <ScrollArea.Viewport className="w-full h-full max-h-full grid grid-cols-3 relative overscroll-contain overflow-x-hidden grid-pattern">
          {!user && (
            <div className="shrink-0 flex flex-col items-center justify-start p-4 text-sm text-neutral-500 w-full col-span-3 gap-5">
              <UserForm />
            </div>
          )}
          {user && albums.length === 0 && <LastFMEmpty />}
          {user && (
            <SortableContext
              id={LAST_FM_CONTAINER_KEY}
              items={albums}
              strategy={rectSortingStrategy}
            >
              {(albums as LastFmAlbumType[]).map((album) => (
                <LastFmAlbum key={album.id} album={album} />
              ))}
            </SortableContext>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="absolute right-0 top-0 flex w-1 justify-center bg-neutral-900/70 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-75 data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-75">
          <ScrollArea.Thumb className="w-full bg-neutral-500" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
