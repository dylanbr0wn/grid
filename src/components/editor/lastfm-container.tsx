"use client";
import { sortAlbums, SortOptions, SortType, useSort } from "@/lib/sort";
import { useRouter } from "next/navigation";
import AlbumPallete from "../pallette";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { newPlaceholderAlbum, useContainer, useGrid } from "./context";
import { IconCheck, IconChevronRight, IconLoader2, IconX } from "@tabler/icons-react";

import * as motion from "motion/react-client";
import { cn, getBrightnessStyle, getImageBrightness, LAST_FM_CONTAINER_KEY, LAST_FM_SORT_KEY } from "@/lib/util";

import { use, useEffect } from "react";
import LastFMIcon from "../lastfm-icon";
import dynamic from "next/dynamic";
import { Sortable } from "../sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import { ContextMenu } from "@base-ui/react";
import AlbumCover from "../album-cover";
import { BaseAlbum } from "@/lib/albums";

const Select = dynamic(() => import("../select"), {
  ssr: false,
  loading: () => (
    <div className="h-full px-3 flex items-center justify-center">
      <IconLoader2 className="size-4 text-neutral-500 mx-auto my-4 animate-spin" />
    </div>
  ),
});

const sortOptions: SortOptions = {
  playcount: "Plays",
  name: "Name",
  artist: "Artist",
  random: "Random",
  custom: "Custom",
};

type LastFMPalleteProps = {
  children?: React.ReactNode;
  user?: string;
  sort: SortType;
};

export default function LastFMPallete({
  children,
  user,
  sort: intialSort,
}: LastFMPalleteProps) {
  const { container } = useContainer(LAST_FM_CONTAINER_KEY);
  const { setAlbums } = useGrid();
  const { sort, setSort } = useSort(LAST_FM_SORT_KEY, intialSort);

  function updateSort(newSort: SortType) {
    setSort(newSort);
    setAlbums((prev) => {
      const newAlbums = { ...prev };
      const sortedAlbums = [...container.albums];

      newAlbums[LAST_FM_CONTAINER_KEY].albums = sortAlbums(
        sortedAlbums as LastFmAlbum[],
        newSort,
      );
      return newAlbums;
    });
  }
  return (
    <AlbumPallete
      container={container}
      header={
        <>
          <UserButton user={user} />
          <div className="grow" />
          <Select
            value={sort}
            items={sortOptions}
            disabled={container.albums.length <= 1}
            onChange={(v) => updateSort(v as SortType)}
            icon={<div className="text-neutral-500">sort by</div>}
          />
        </>
      }
    >
      {children}
    </AlbumPallete>
  );
}

type LastFMAlbumProps = {
  initialAlbumsPromise: Promise<LastFmAlbum[]>;
};

export function LastFMAlbums({ initialAlbumsPromise }: LastFMAlbumProps) {
  const { container } = useContainer(LAST_FM_CONTAINER_KEY);
  const { setAlbums } = useGrid();

  const initialAlbums = use(initialAlbumsPromise);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setAlbums((prev) => {
      if (searchParams.get("autoFill") === "true") {
        const newLastFMAlbums = [...(initialAlbums ?? [])];

        const newGridAlbums = prev.grid.albums.map((a) => {
          if (a.type === "placeholder" && newLastFMAlbums.length > 0) {
            return newLastFMAlbums.shift()!;
          }
          return a;
        });

        return {
          ...prev,
          [LAST_FM_CONTAINER_KEY]: {
            ...prev[LAST_FM_CONTAINER_KEY],
            albums: newLastFMAlbums,
          },
          grid: {
            ...prev.grid,
            albums: newGridAlbums,
          },
        };
      }
      return {
        ...prev,
        [LAST_FM_CONTAINER_KEY]: {
          ...prev[LAST_FM_CONTAINER_KEY],
          albums: initialAlbums ?? [],
        },
      };
    });
    return () => {
      setAlbums((prev) => {
        return {
          ...prev,
          [LAST_FM_CONTAINER_KEY]: {
            ...prev[LAST_FM_CONTAINER_KEY],
            albums: [],
          },
          grid: {
            ...prev.grid,
            albums: prev.grid.albums.map((a) => {
              if (a.type === "lastfm") {
                return newPlaceholderAlbum();
              }
              return a;
            }),
          },
        };
      });
    };
  }, [initialAlbums, setAlbums]);

  return (
    <SortableContext
      id={LAST_FM_CONTAINER_KEY}
      items={container.albums}
      strategy={rectSortingStrategy}
    >
      {(container.albums as LastFmAlbum[]).map((album, index) => (
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

function UserButton({ user }: { user: string | undefined }) {
  const router = useRouter();

  const { setAlbums } = useGrid();

  function logout() {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete("lastfmUser");

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

    router.push(`/?${searchParams.toString()}`);
  }
  return (
    <button
      onClick={logout}
      className="h-full flex items-center justify-center relative text-sm group/button"
    >
      {!!user && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center transition-colors group-hover/button:bg-neutral-900">
          <div className="flex gap-1  opacity-0 group-hover/button:opacity-100 items-center group-hover/button:translate-y-0 transition-all translate-y-4 text-[#D51007] group-hover/button:scale-100 scale-80">
            <IconX className="size-4  " />
            <div>Clear</div>
          </div>
        </div>
      )}
      {user && (
        <motion.div
          style={{
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            position: "absolute",
          }}
          className={cn(
            "bg-neutral-400",
            !!user && "group-hover/button:bg-[#D51007] ",
          )}
          layoutId="underline"
          id="underline"
        />
      )}
      <div
        className={cn(
          "px-4 text-neutral-300 flex gap-1 items-center",
          user && "group-hover:blur group-hover:text-[#D51007]",
        )}
      >
        <LastFMIcon className="size-5 mr-2 fill fill-[#D51007]" />
        <div>{user || "Last.fm"}</div>
      </div>
    </button>
  );
}


export type PlaceholderAlbum = BaseAlbum & {
  type: "placeholder";
};

export type LastFmAlbum = {
  id: UniqueIdentifier;
  type: "lastfm";
  album: string;
  mbid?: string;
  img: string;
  plays: number;
  imgs: string[];

  artist: string;
  artistMbid?: string;

  textColor?: string;
  textBackground?: boolean;
};

export type LastFmAlbumProps = {
  priority?: boolean;
  album: LastFmAlbum;
};

export const LastFmAlbum = ({
  album,
  priority = false,
  ...props
}: LastFmAlbumProps) => {
  const { setTextBackground, setTextColor } = useGrid();

  if (!album) {
    return null;
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <AlbumCover
          src={album.img}
          imgs={album.imgs}
          name={album.album}
          artist={album.artist}
          width={128}
          height={128}
          id={`${album.id}-image`}
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
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="outline-none">
          <ContextMenu.Popup className="origin-(--transform-origin)  bg-neutral-950 py-1 text-neutral-300 shadow-lg shadow-gray-200 outline outline-gray-200 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300 z-50">
            <ContextMenu.SubmenuRoot>
              <ContextMenu.SubmenuTrigger className="flex cursor-default items-center justify-between gap-4 py-2 pr-4 pl-4 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-neutral-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-neutral-900 data-[popup-open]:relative data-[popup-open]:z-0 data-[popup-open]:before:absolute data-[popup-open]:before:inset-x-1 data-[popup-open]:before:inset-y-0 data-[popup-open]:before:z-[-1]  data-[popup-open]:before:bg-neutral-900 data-[highlighted]:data-[popup-open]:before:bg-neutral-900">
                Text color <IconChevronRight className="size-3" />
              </ContextMenu.SubmenuTrigger>
              <ContextMenu.Portal>
                <ContextMenu.Positioner
                  className="outline-none"
                  alignOffset={-4}
                  sideOffset={-4}
                >
                  <ContextMenu.Popup className="origin-(--transform-origin) bg-neutral-950 py-1 text-neutral-300 shadow-lg shadow-neutral-200 outline-1 outline-neutral-200 dark:shadow-none dark:-outline-offset-1 dark:outline-neutral-300">
                    <ContextMenu.RadioGroup
                      value={album.textColor}
                      onValueChange={(value) => setTextColor?.(album.id, value)}
                    >
                      <ContextMenu.RadioItem
                        value="white"
                        className="grid cursor-default gap-2 py-2 pr-4 pl-2.5 grid-cols-[0.75rem_1fr] text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-neutral-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:bg-neutral-900"
                      >
                        <ContextMenu.RadioItemIndicator className="col-start-1">
                          <IconCheck className="size-3" />
                        </ContextMenu.RadioItemIndicator>
                        <span className="col-start-2">White</span>
                      </ContextMenu.RadioItem>
                      <ContextMenu.RadioItem
                        value="black"
                        className="grid grid-cols-[0.75rem_1fr] cursor-default gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-neutral-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:bg-neutral-900"
                      >
                        <ContextMenu.RadioItemIndicator className="col-start-1">
                          <IconCheck className="size-3" />
                        </ContextMenu.RadioItemIndicator>
                        <span className="col-start-2">Black</span>
                      </ContextMenu.RadioItem>
                    </ContextMenu.RadioGroup>
                  </ContextMenu.Popup>
                </ContextMenu.Positioner>
              </ContextMenu.Portal>
            </ContextMenu.SubmenuRoot>
            <ContextMenu.CheckboxItem
              checked={!!album.textBackground}
              className="grid grid-cols-[0.75rem_1fr] cursor-default gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-[highlighted=true]:relative data-[highlighted=true]:z-0 data-[highlighted=true]:text-neutral-50 data-[highlighted=true]:before:absolute data-[highlighted=true]:before:inset-x-1 data-[highlighted=true]:before:inset-y-0 data-[highlighted=true]:before:z-[-1] data-[highlighted=true]:before:bg-neutral-900"
              onMouseUp={() =>
                setTextBackground?.(album.id, !album.textBackground)
              }
            >
              <ContextMenu.CheckboxItemIndicator className="col-start-1">
                <IconCheck className="size-3" />
              </ContextMenu.CheckboxItemIndicator>
              <span className="col-start-2">Toggle text background</span>
            </ContextMenu.CheckboxItem>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

