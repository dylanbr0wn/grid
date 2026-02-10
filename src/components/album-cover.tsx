"use client";

import { cn, getBrightnessStyle, getImageBrightness, PLACEHOLDER_IMG } from "@/lib/util";
import { HTMLProps, useMemo, useState } from "react";
import { Album } from "./album";
import { CustomAlbum } from "./editor/custom";
import { ImageWithFallback } from "./image";
import { CSS, Transform } from "@dnd-kit/utilities";
import { DraggableSyntheticListeners } from "@dnd-kit/core";



export type AlbumCoverProps = {
  priority?: boolean;
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  isOver?: boolean;
  setNodeRef?(element: HTMLDivElement | null): void;
  onLoad?(ev: React.SyntheticEvent<HTMLImageElement, Event>): void;
  album: Album | CustomAlbum;
  index?: number;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  transition?: string | undefined;
} & HTMLProps<HTMLDivElement>;

export default function AlbumCover({
  album,
  onLoad,
  priority,
  dragOverlay,
  dragging,
  disabled,
  isOver,
  setNodeRef,
  transform = null,
  transition,
  listeners,
  index,
  ...props
}: AlbumCoverProps) {
  const [textColor, setTextColor] = useState<string>("white");
  const [textBackground, setTextBackground] = useState<string>("black");

  function onLoadFallback(ev: React.SyntheticEvent<HTMLImageElement, Event>) {
    const img = ev.currentTarget;
    const { textColor, textBackground } = getBrightnessStyle(
      getImageBrightness(img)
    );
    setTextBackground(
      textBackground
        ? textColor === "white"
          ? "black"
          : "white"
        : "transparent"
    );
    setTextColor(textColor);
  }

  const color = album.textColor || textColor;
  const backgroundColor = useMemo(() => {
    if (album.textBackground !== undefined) {
      return album.textBackground ? (color === "white" ? "black" : "white") : "transparent";
    }
    return textBackground;
  }, [album.textBackground, textBackground, color])

  return (
    <div
      className={cn(
        "flex grow items-center outline-none box-border origin-center font-normal whitespace-nowrap w-32 h-32 aspect-square relative font-code touch-manipulation cursor-grab select-none",
        dragging && !dragOverlay && "opacity-50 z-0",
        dragOverlay && "z-50 opacity-100 scale-105 cursor-grabbing",
        disabled && "cursor-not-allowed",
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
          src={album.img || PLACEHOLDER_IMG}
          width={128}
          height={128}
          className="object-cover overflow-hidden w-32 h-32"
          srcSet={album.imgs}
          onLoad={onLoad ?? onLoadFallback}
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
              color,
            } as React.CSSProperties
          }
        >
          <span
            className="wrap-break-word"
            style={
              {
                backgroundColor,
              } as React.CSSProperties
            }
          >
            {album.album}
          </span>
        </div>
        <div
          className="text-[7px]/[7px] font-medium "
          style={{
            color,
          }}
        >
          <span
            className="wrap-break-word"
            style={
              {
                backgroundColor,
              } as React.CSSProperties
            }
          >
            {album.artist}
          </span>
        </div>
      </div>
    </div>
  );
}
