"use client";
import { sortAlbums, sortOptions, SortType, useSort } from "@/lib/sort";
import { useRouter } from "next/navigation";
import AlbumPallete from "../pallette";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Album, SortableAlbum } from "../album";
import { newPlaceholderAlbum, useContainer, useGrid } from "./context";
import { IconX } from "@tabler/icons-react";

import * as motion from "motion/react-client";
import { cn } from "@/lib/util";
import Select from "../select";
import { use, useEffect } from "react";

const containerKey = "lastfm";

type LastFMPalleteProps = {
  children?: React.ReactNode;
  user?: string;
};

export default function LastFMPallete({ children, user }: LastFMPalleteProps) {
  const { container } = useContainer(containerKey);
  const { setAlbums } = useGrid();
  const { sort, setSort } = useSort(`${containerKey}-sort`);

  function updateSort(newSort: SortType) {
    setSort(newSort);
    setAlbums((prev) => {
      const newAlbums = { ...prev };
      const sortedAlbums = [...container.albums];

      newAlbums[containerKey].albums = sortAlbums(
        sortedAlbums as Album[],
        newSort
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
          {!!container.sortable && container.albums.length > 1 && (
            <Select
              value={sort}
              items={sortOptions}
              onChange={(v) => updateSort(v as SortType)}
              icon={<div className="text-neutral-500">sort by</div>}
            />
          )}
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
  const { container } = useContainer(containerKey);
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
          [containerKey]: {
            ...prev[containerKey],
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
        [containerKey]: {
          ...prev[containerKey],
          albums: initialAlbums ?? [],
        },
      };
    });
    return () => {
      setAlbums((prev) => {
        return {
          ...prev,
          [containerKey]: {
            ...prev[containerKey],
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
          }
        };
      });
    }
  }, [initialAlbums, setAlbums]);

  return (
    <SortableContext
      id={containerKey}
      items={container.albums}
      strategy={rectSortingStrategy}
    >
      {container.albums.map((album, index) => (
        <SortableAlbum
          key={album.id}
          album={album}
          index={container.albums.length + index}
          priority={true}
        />
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

    setAlbums(prev => {
      return {
        ...prev,
        lastfm: {
          ...prev.lastfm,
          albums: [],
        },
        grid: {
          ...prev.grid,
          albums: prev.grid.albums.map(album => {
            if (album.type === "lastfm") {
              return newPlaceholderAlbum()
            }
            return album;
          })
        }
      }
    })

    router.push(`/?${searchParams.toString()}`);
  }
  return (
    <button
      onClick={logout}
      className="h-full flex items-center justify-center relative text-sm group/button"
    >
      {!!user && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center transition-colors group-hover/button:bg-neutral-900">
          <div className="flex gap-1  opacity-0 group-hover/button:opacity-100 items-center group-hover/button:translate-y-0 transition-all translate-y-4 text-rose-700 group-hover/button:scale-100 scale-80">
            <IconX className="size-4  " />
            <div>Logout</div>
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
            !!user && "group-hover/button:bg-rose-700 "
          )}
          layoutId="underline"
          id="underline"
        />
      )}
      <div
        className={cn(
          "px-4 text-neutral-300",
          user && "group-hover:blur group-hover:text-rose-700"
        )}
      >
        {user || "Last.fm"}
      </div>
    </button>
  );
}
