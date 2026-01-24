"use client";

import React, { HTMLProps } from "react";

import type {
  DraggableSyntheticListeners,
  UniqueIdentifier,
} from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";

import styles from "./album.module.scss";
import { cn, getImageBrightness } from "@/lib/util";
import { ContextMenu } from "@base-ui-components/react";
import { IconCheck, IconChevronRight } from "@tabler/icons-react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { ImageWithFallback } from "./image";
import { Container } from "./grid";

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
  ref?: React.Ref<HTMLDivElement>;
  setTextColor?(index: UniqueIdentifier, color: string): void;
  setTextBackground?(index: UniqueIdentifier, background: boolean): void;
  album: Album;
  isOver?: boolean;
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
            "after:absolute after:inset-0 after:z-10 after:bg-white after:bg-opacity-10",
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
            onLoad={function (
              ev: React.SyntheticEvent<HTMLImageElement, Event>,
            ) {
              const img = ev.currentTarget;
              const { textColor, textBackground } = getBrightnessStyle(
                getImageBrightness(img),
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
  album: Album | PlaceholderAlbum;
  index: number;
} & Pick<AlbumProps, "priority" | "setTextBackground" | "setTextColor">

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
    // transition: null,
  });

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
