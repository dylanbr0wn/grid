"use client";
import { sortAlbums, SortOptions, SortType } from "@/lib/sort";
import { newPlaceholderAlbum } from "@/lib/albums";
import {
  IconX,
} from "@tabler/icons-react";

import * as motion from "motion/react-client";
import {
  calcHeight,
  cn,
  getBrightnessStyle,
  getImageBrightness,
  LAST_FM_CONTAINER_KEY,
} from "@/lib/util";

import LastFMIcon from "../lastfm-icon";
import AlbumCover from "../album/album-cover";
import { LastFmAlbum as LastFmAlbumType } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";
import { Sortable } from "../sortable";
import LastFmContextMenu from "./lastfm-contextmenu";
import { useState } from "react";
import { ScrollArea } from "@base-ui/react";
import Select from "../select";

const sortOptions: SortOptions = {
  playcount: "Plays",
  name: "Name",
  artist: "Artist",
  random: "Random",
  custom: "Custom",
};

type LastFMPalleteProps = {
  children?: React.ReactNode;
};

export default function LastFMPallete({ children }: LastFMPalleteProps) {
  const albums = useAlbumsStore(
    (state) => state.albums[LAST_FM_CONTAINER_KEY].albums,
  );
  const sort = useAlbumsStore(
    (state) => state.albums[LAST_FM_CONTAINER_KEY].sort,
  );
  const setSort = useAlbumsStore((state) => state.setSort);
  const setAlbums = useAlbumsStore((state) => state.setAlbums);

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
      <ScrollArea.Root
        className="relative w-full flex-1 min-h-0 overflow-hidden"
      >
        <ScrollArea.Viewport className="w-full h-full max-h-full grid grid-cols-3 relative overscroll-contain overflow-x-hidden grid-pattern">
          {children}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="absolute right-0 top-0 flex w-1 justify-center bg-neutral-900/70 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-75 data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-75">
          <ScrollArea.Thumb className="w-full bg-neutral-500" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}

function UserButton() {
  const user = useAlbumsStore((state) => state.user);
  const setUser = useAlbumsStore((state) => state.setUser);
  const setAlbums = useAlbumsStore((state) => state.setAlbums);
  const initialized = useAlbumsStore((state) => state.initialized);

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

  return (
    <button
      onClick={logout}
      className="h-full flex items-center justify-center relative text-sm group/button"
    >
      {!!user && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center transition-colors group-hover/button:bg-neutral-900">
          <div className="flex gap-1  opacity-0 group-hover/button:opacity-100 items-center group-hover/button:translate-y-0 transition-all translate-y-4 text-lastfm group-hover/button:scale-100 scale-80">
            <IconX className="size-4  " />
            <div>Clear</div>
          </div>
        </div>
      )}
      {user && (
        <div
          className={cn(
            "bg-neutral-400 absolute bottom-0 left-0 right-0 h-px group-active/button:h-0.75 transition-all ",
            !!user && "group-hover/button:bg-lastfm ",
          )}
        />
      )}
      {initialized && (
        <div
          className={cn(
            "px-4 text-neutral-300 flex gap-1 items-center transition-all",
          )}
        >
          <LastFMIcon className="size-5 mr-2 fill fill-lastfm" />
          <div>{user || "Last.fm"}</div>
        </div>
      )}
    </button>
  );
}

export type LastFmAlbumProps = {
  priority?: boolean;
  album: LastFmAlbumType;
  ref?: React.Ref<HTMLDivElement>;
};

export const LastFmAlbum = ({
  album,
  priority = false,
  ...props
}: LastFmAlbumProps) => {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const setTextBackground = useAlbumsStore((state) => state.setTextBackground);
  const setTextColor = useAlbumsStore((state) => state.setTextColor);

  if (!album) {
    return null;
  }

  return (
    <Sortable
      key={album.id}
      id={album.id}
      disabled={contextMenuOpen}
      sortData={{
        album,
      }}
    >
      <LastFmContextMenu
        open={contextMenuOpen}
        setOpen={setContextMenuOpen}
        album={album}
      >
        <AlbumCover
          src={album.img}
          imgs={album.imgs}
          name={album.album}
          artist={album.artist}
          width={128}
          height={128}
          id={`${album.id}-image`}
          data-id={album.id}
          priority={priority}
          textBackground={album.textBackground}
          textColor={album.textColor}
          onLoad={(ev: React.SyntheticEvent<HTMLImageElement>) => {
            const img = ev.currentTarget;
            const { textColor, textBackground } = getBrightnessStyle(
              getImageBrightness(img),
            );
            setTextBackground?.(album.id, textBackground);
            setTextColor?.(album.id, textColor);
          }}
          {...props}
        />
      </LastFmContextMenu>
    </Sortable>
  );
};
