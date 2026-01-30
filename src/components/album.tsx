"use client";

import React, { HTMLProps, memo, Suspense, use, useState } from "react";

import * as motion from "motion/react-client";

import type {
  DraggableSyntheticListeners,
  UniqueIdentifier,
} from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";

import styles from "./album.module.scss";
import { cn, generateId, getImageBrightness } from "@/lib/util";
import { ContextMenu, Dialog, Field } from "@base-ui-components/react";
import {
  IconCheck,
  IconChevronRight,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { ImageWithFallback } from "./image";
import { SearchResult } from "@/app/search/result";
import { GridContext } from "./editor/context";
import { ReleaseGroupResponse } from "@/lib/music-brainz";
import { type } from "arktype";

function getBrightnessStyle(brightness: number) {
  if (brightness > 200) {
    return {
      textColor: "black",
      textBackground: false,
    };
  } else if (brightness > 160) {
    return {
      textColor: "black",
      textBackground: true,
    };
  } else if (brightness > 60) {
    return {
      textColor: "white",
      textBackground: true,
    };
  } else {
    return {
      textColor: "white",
      textBackground: false,
    };
  }
}

export type AlbumTypes = "lastfm" | "placeholder" | "custom";

export type BaseAlbum = {
  id: UniqueIdentifier;
  type: AlbumTypes;
};

export type PlaceholderAlbum = BaseAlbum & {
  type: "placeholder";
};

export type Album = {
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

export type AlbumProps = {
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
  setTextColor?(index: UniqueIdentifier, color: string): void;
  setTextBackground?(index: UniqueIdentifier, background: boolean): void;
  album: Album | CustomAlbum;
} & HTMLProps<HTMLDivElement>;

export const Album = ({
  dragOverlay,
  dragging,
  disabled,
  index,
  listeners,
  transition,
  transform = null,
  album,
  setTextColor,
  setTextBackground,
  priority = false,
  setNodeRef,
  isOver = false,
  ...props
}: AlbumProps) => {
  if (!album) {
    return null;
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className={cn(
          "flex grow items-center outline-none box-border origin-center font-normal whitespace-nowrap w-32 h-32 aspect-square relative font-code",
          styles.album,
          dragging && styles.dragging,
          dragOverlay && styles.dragOverlay,
          disabled && styles.disabled,
          isOver &&
            "after:absolute after:inset-0 after:z-10 after:bg-white after:bg-opacity-10"
        )}
        {...props}
        style={
          {
            transition,
            "--index": index,
            transform: CSS.Transform.toString(transform),
          } as React.CSSProperties
        }
        {...listeners}
        ref={setNodeRef}
        tabIndex={0}
      >
        {album.img ? (
          <ImageWithFallback
            id={`${album.id}`}
            src={album.img || "/placeholder.png"}
            width={128}
            height={128}
            className="object-cover overflow-hidden"
            srcSet={album.imgs}
            onLoad={function (
              ev: React.SyntheticEvent<HTMLImageElement, Event>
            ) {
              const img = ev.currentTarget;
              const { textColor, textBackground } = getBrightnessStyle(
                getImageBrightness(img)
              );
              setTextBackground?.(album.id, textBackground);
              setTextColor?.(album.id, textColor);
            }}
            alt={`${album.album} by ${album.artist} album cover`}
            decoding="sync"
            fetchPriority={priority ? "high" : "auto"}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          // <div className='w-full h-full bg-indigo-500'/>
          <div className="w-full h-full bg-neutral-950" />
        )}
        <div className="absolute flex items-start flex-col justify-end top-0 left-0 text-wrap font-medium h-full pb-1 px-1 w-fit ">
          <div
            className="font-bold text-[9px]/[10px] pb-0.5"
            style={
              {
                color: album.textColor,
              } as React.CSSProperties
            }
          >
            <span
              className="break-words"
              style={
                {
                  backgroundColor: album.textBackground
                    ? album.textColor === "white"
                      ? "black"
                      : "white"
                    : "transparent",
                } as React.CSSProperties
              }
            >
              {album.album}
            </span>
          </div>
          <div
            className="text-[7px]/[7px] font-medium "
            style={{
              color: album.textColor,
            }}
          >
            <span
              className="break-words"
              style={
                {
                  backgroundColor: album.textBackground
                    ? album.textColor === "white"
                      ? "black"
                      : "white"
                    : "transparent",
                } as React.CSSProperties
              }
            >
              {album.artist}
            </span>
          </div>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="outline-none">
          <ContextMenu.Popup className="origin-[var(--transform-origin)]  bg-neutral-950 py-1 text-neutral-300 shadow-lg shadow-gray-200 outline outline-gray-200 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300">
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
                  <ContextMenu.Popup className="origin-[var(--transform-origin)] bg-neutral-950 py-1 text-neutral-300 shadow-lg shadow-neutral-200 outline-1 outline-neutral-200 dark:shadow-none dark:-outline-offset-1 dark:outline-neutral-300">
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

type SortableAlbumProps = {
  disabled?: boolean;
  album: Album | PlaceholderAlbum | CustomAlbum;
  index: number;
} & Pick<AlbumProps, "priority" | "setTextBackground" | "setTextColor">;

export const SortableAlbum = React.memo(function SortableAlbum({
  disabled,
  album,
  index,
  ...props
}: SortableAlbumProps) {
  const {
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
    attributes,
    isOver,
  } = useSortable({
    id: album.id,
    disabled,
    data: {
      album,
    },
  });

  if (album.type === "custom") {
    return (
      <CustomAlbum
        setNodeRef={setNodeRef}
        album={album}
        disabled={disabled}
        dragging={isDragging}
        isOver={isOver}
        index={index}
        transform={transform}
        transition={transition}
        listeners={listeners}
        data-index={index}
        data-id={album.id}
        {...props}
        {...attributes}
      />
    );
  }

  if (album.type === "placeholder") {
    return (
      <div
        ref={setNodeRef}
        className={cn("pointer-events-none w-32 h-32 bg-transparent")}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
      ></div>
    );
  }

  if (album.type === "lastfm") {
    return (
      <Album
        setNodeRef={setNodeRef}
        album={album}
        disabled={disabled}
        dragging={isDragging}
        isOver={isOver}
        index={index}
        transform={transform}
        transition={transition}
        listeners={listeners}
        data-index={index}
        data-id={album.id}
        {...props}
        {...attributes}
      />
    );
  }
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

  const { addCustomAlbum } = use(GridContext);

  function handleAddCustomAlbum(
    group: (typeof ReleaseGroupResponse.infer)["release-groups"][number]
  ) {
    const imgs = type("string")
      .array()
      .assert(
        [
          group.thumbnails?.large,
          group.thumbnails?.small,
          "/placeholder.png",
        ].filter((url) => url && url.length > 0)
      );
    addCustomAlbum({
      ...album,
      id: `custom-${group.id}-${generateId()}`,
      type: "custom",
      mbid: group.id,
      album: group.title,
      artist: group["artist-credit"].map((ac) => ac.artist.name).join(", "),
      artistMbid: group["artist-credit"].map((ac) => ac.artist.id).join(", "),
      img: imgs[0],
      imgs,
    });
    setSearchQuery("");
    setOpen(false);
  }

  if (album.mbid) {
    return (
      <Album
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
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-20 transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:opacity-70 supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -mt-8 min-w-120 w-1/3 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 bg-neutral-950 p-4 text-white outline outline-neutral-700 transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 dark:outline-neutral-700">
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
                "absolute right-0 left-0 bottom-0 h-[1px] bg-neutral-400 group-focus-within:h-[2px] group-focus-within:z-1 data transition-colors",
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
          <Dialog.Close className="absolute top-0 right-0 flex h-10 items-center justify-center bg-red-500 px-3.5 text-base font-medium text-white select-none hover:bg-red-700 focus-visible:outline focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-red-900">
            x
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
});

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
