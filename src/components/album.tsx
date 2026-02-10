"use client";

import React, { HTMLProps } from "react";

import type {
  DraggableSyntheticListeners,
  UniqueIdentifier,
} from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";

import styles from "./album.module.scss";
import { cn, getBrightnessStyle, getImageBrightness } from "@/lib/util";
import { ContextMenu } from "@base-ui/react";
import { IconCheck, IconChevronRight } from "@tabler/icons-react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { ImageWithFallback } from "./image";
import { CustomAlbum } from "./editor/custom";
import AlbumCover from "./album-cover";
import { useGrid } from "./editor/context";



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

export type AlbumCoverProps = {
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
  priority = false,
  setNodeRef,
  isOver = false,
  ...props
}: AlbumCoverProps) => {
  const { setTextBackground, setTextColor } = useGrid();
  if (!album) {
    return null;
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={<AlbumCover
          album={album}
          isOver={isOver}
          dragging={dragging}
          dragOverlay={dragOverlay}
          disabled={disabled}
          priority={priority}
          setNodeRef={setNodeRef}
          transform={transform}
          transition={transition}
          index={index}
          listeners={listeners}
          onLoad={(ev: React.SyntheticEvent<HTMLImageElement>) => {
            const img = ev.currentTarget;
            const { textColor, textBackground } = getBrightnessStyle(
              getImageBrightness(img)
            );
            setTextBackground?.(album.id, textBackground);
            setTextColor?.(album.id, textColor);
          }}
          {...props}
        />}
      />
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="outline-none">
          <ContextMenu.Popup className="origin-(--transform-origin)  bg-neutral-950 py-1 text-neutral-300 shadow-lg shadow-gray-200 outline outline-gray-200 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300">
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

type SortableAlbumProps = {
  disabled?: boolean;
  album: Album | PlaceholderAlbum | CustomAlbum;
  index: number;
} & Pick<AlbumCoverProps, "priority">;

export const SortableAlbum = React.memo(function SortableAlbum({
  disabled,
  album,
  index,
  priority = false,
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
        priority={priority}
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
        priority={priority}
        {...attributes}
      />
    );
  }
});
