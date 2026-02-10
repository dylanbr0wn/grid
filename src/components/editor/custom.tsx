"use client";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import AlbumPallete from "../pallette";
import { useContainer, useGrid } from "./context";
import { BaseAlbum, SortableAlbum } from "../album";
import { HTMLProps, memo, Suspense, useEffect, useState } from "react";
import {
  cn,
  CUSTOM_CONTAINER_KEY,
  CUSTOM_SORT_KEY,
  getBrightnessStyle,
  getImageBrightness,
} from "@/lib/util";
import { Dialog, Field } from "@base-ui/react";
import { IconLoader2, IconPlus, IconSearch } from "@tabler/icons-react";
import { SearchResult } from "../result";

import * as motion from "motion/react-client";
import { Transform } from "@dnd-kit/utilities";
import { DraggableSyntheticListeners } from "@dnd-kit/core";
import AlbumCover from "../album-cover";

import { sortAlbums, SortOptions, SortType, useSort } from "@/lib/sort";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("../select"), {
  ssr: false,
  loading: () => <div className="h-full px-3 flex items-center justify-center">
    <IconLoader2 className="size-4 text-neutral-500 mx-auto my-4 animate-spin" />
  </div>
});

export type CustomAlbum = BaseAlbum & {
  type: "custom";
  album?: string;
  mbid?: string;
  img?: string;
  imgs?: string[];
  plays?: number;
  artist?: string;
  artistMbid?: string;
  textColor?: string;
  textBackground?: boolean;
};

type CustomAlbumProps = {
  album: CustomAlbum;
  priority?: boolean;
  setNodeRef?(element: HTMLDivElement | null): void;
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  index?: number;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  transition?: string | undefined;
  isOver?: boolean;
} & HTMLProps<HTMLDivElement>;

export const CustomAlbum = memo(function CustomAlbum({
  album,
  dragging,
  dragOverlay,
  disabled,
  isOver,
  index,
  transition,
  transform = null,
  listeners,
  setNodeRef,
  priority = false,
  ...props
}: CustomAlbumProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const { addCustomAlbum, setTextBackground, setTextColor } = useGrid();

  function handleAddCustomAlbum(_album: CustomAlbum) {
    addCustomAlbum({
      ...album,
      ..._album,
    });
    setSearchQuery("");
    setOpen(false);
  }

  if (album.mbid) {
    return (
      <AlbumCover
        setNodeRef={setNodeRef}
        album={album}
        disabled={disabled}
        dragging={dragging}
        dragOverlay={dragOverlay}
        isOver={isOver}
        index={index}
        transform={transform}
        transition={transition}
        listeners={listeners}
        priority={priority}
        data-index={index}
        data-id={album.id}
        onLoad={(ev: React.SyntheticEvent<HTMLImageElement, Event>) => {
          const img = ev.currentTarget;
          const { textColor, textBackground } = getBrightnessStyle(
            getImageBrightness(img)
          );
          setTextBackground?.(album.id, textBackground);
          setTextColor?.(album.id, textColor);
        }}
        {...props}
      />
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={cn(
          "flex grow items-center justify-center outline-none box-border origin-center font-normal whitespace-nowrap w-32 h-32 aspect-square bg-neutral-900 border border-neutral-800 text-neutral-500 font-code relative group cursor-pointer active:bg-neutral-900 hover:bg-neutral-950/50"
        )}
      >
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center transition-colors">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 items-center group-hover:translate-y-0 transition-all translate-y-4 text-green-700 group-hover:scale-100 scale-80 group-active:text-green-500 ">
            <div>Add Album</div>
          </div>
        </div>
        <div className={cn("group-hover:blur")}>
          <IconPlus className="size-4" />
        </div>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-20 transition-all duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:opacity-70 supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Popup className="fixed top-1/5 left-1/2 min-w-120 -translate-x-1/2 bg-neutral-950 p-4 text-white outline outline-neutral-800 transition-all duration-150 data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 dark:outline-neutral-700 w-132">
          <Dialog.Title className="-mt-1.5 mb-1 text-lg font-medium font-mono">
            Add Album
          </Dialog.Title>
          <Dialog.Description className="mb-6 text-base text-gray-600"></Dialog.Description>
          <Field.Root
            className={cn(
              "flex w-full flex-col gap-1 relative group items-center hover:bg-neutral-900 focus-within:z-1 focus-within:bg-neutral-900 text-neutral-300 pl-2"
            )}
          >
            <div className="w-full flex items-center gap-3">
              <IconSearch className="size-4 text-neutral-500 pointer-events-none" />
              <Field.Control
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                value={searchQuery}
                name="Search"
                onChange={(e) => setSearchQuery?.(e.target.value)}
                placeholder="Search for an album..."
                className={cn("h-10 w-full outline-none text-left text-base")}
              />
            </div>
            <motion.div
              className={cn(
                "absolute right-0 left-0 bottom-0 h-px bg-neutral-400 group-focus-within:h-0.5 group-focus-within:z-1 data transition-colors",
                focused && " bg-white"
              )}
              layout
              transition={{
                duration: 0.15,
              }}
              style={{
                height: focused ? 3 : 1,
              }}
            />
          </Field.Root>
          <Suspense
            fallback={<div className="text-white mt-4">Loading...</div>}
          >
            <SearchResult
              query={debouncedSearchQuery}
              onSelect={handleAddCustomAlbum}
            />
          </Suspense>
          <Dialog.Close className="absolute top-0 right-0 h-8 w-8 bg-red-500 text-base font-medium text-white select-none hover:bg-red-700 focus-visible:outline focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-red-900">
            x
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
});

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const sortOptions: Pick<SortOptions, "random" | "name" | "artist"> = {
  random: "Random",
  name: "Name",
  artist: "Artist",
}

export default function CustomPallete() {
  const { container } = useContainer(CUSTOM_CONTAINER_KEY);
  const { setAlbums } = useGrid();
  const { sort, setSort } = useSort(CUSTOM_SORT_KEY, "random");

  function updateSort(newSort: SortType) {
    setSort(newSort);
    setAlbums((prev) => {
      const sortedAlbums = [...container.albums.slice(0, -1)];

      return {
        ...prev,
        [CUSTOM_CONTAINER_KEY]: {
          ...prev[CUSTOM_CONTAINER_KEY],
          albums: [
            ...sortAlbums(sortedAlbums as CustomAlbum[], newSort),
            container.albums[container.albums.length - 1],
          ],
        }
      }
    });
  }
  return (
    <AlbumPallete
      container={container}
      header={
        <>
          <h5 className="text-neutral-300 text-sm mx-3 mb-0 font-code">
            {container.title}
          </h5>
          <div className="grow" />
           <Select
              value={sort}
              items={sortOptions}
              disabled={container.albums.length <= 2}
              onChange={(v) => updateSort(v as SortType)}
              icon={<div className="text-neutral-500">sort by</div>}
            />
        </>
      }
    >
      <SortableContext
        id={CUSTOM_CONTAINER_KEY}
        items={container.albums}
        strategy={rectSortingStrategy}
      >
        {container.albums.map((album, index) => (
          <SortableAlbum
            key={album.id}
            album={album}
            index={container.albums.length + index}
          />
        ))}
      </SortableContext>
    </AlbumPallete>
  );
}
