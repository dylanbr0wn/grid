"use client";
import { sortAlbums, SortOptions, SortType, useSort } from "@/lib/sort";
import { useRouter } from "next/navigation";
import AlbumPallete from "../pallette";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Album } from "../album";
import { newPlaceholderAlbum, useContainer, useGrid } from "./context";
import { IconLoader2, IconX } from "@tabler/icons-react";

import * as motion from "motion/react-client";
import { cn, LAST_FM_CONTAINER_KEY, LAST_FM_SORT_KEY } from "@/lib/util";

import { use, useEffect } from "react";
import LastFMIcon from "../lastfm-icon";
import dynamic from "next/dynamic";
import { Sortable } from "../sortable";

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
        sortedAlbums as Album[],
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
  initialAlbumsPromise: Promise<Album[]>;
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
      {(container.albums as Album[]).map((album, index) => (
        <Sortable
          key={album.id}
          id={album.id}
          sortData={{
            album,
          }}
        >
          <Album
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
