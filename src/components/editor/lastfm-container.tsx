"use client";
import { sortAlbums, sortOptions, SortType, useSort } from "@/lib/sort";
import { useRouter } from "next/navigation";
import AlbumPallete from "../pallette";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Album, SortableAlbum } from "../album";
import { useContainer, useGrid } from "./context";
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
  const { setTextBackground, setTextColor, setAlbums } = useGrid();

  const initialAlbums = use(initialAlbumsPromise);

  useEffect(() => {
    setAlbums((prev) => {
      return {
        ...prev,
        [containerKey]: {
          ...prev[containerKey],
          albums: initialAlbums ?? [],
        },
      };
    });
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
          setTextBackground={setTextBackground}
          setTextColor={setTextColor}
        />
      ))}
    </SortableContext>
  );
}

function UserButton({ user }: { user: string | undefined }) {
  const router = useRouter();

  function logout() {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete("lastfmUser");
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
          className={cn("bg-neutral-400", !!user && "group-hover/button:bg-rose-700 ")}
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
