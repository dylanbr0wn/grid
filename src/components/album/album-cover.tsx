"use client";

import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { ImageWithFallback, ImageWithFallbackProps } from "./image";
import { cn, getBrightnessStyle, getImageBrightness } from "@/lib/util";
import { useMemo, useState } from "react";
import { AlbumDetails } from "./album-details";

export type AlbumCoverProps = {
  priority?: boolean;
  imgs: string[] | undefined;
  name: string;
  artist: string;
  textColor?: string;
  textBackground?: boolean;
  src?: string | StaticImport;
} & Omit<ImageWithFallbackProps, "src" | "alt">;

export default function AlbumCover({
  priority,
  imgs,
  name,
  artist,
  src,
  textColor,
  textBackground,
  width,
  height,
  onLoad,
  className,
  ...props
}: AlbumCoverProps) {
  const [_color, setTextColor] = useState<string>("white");
  const [_backgroundColor, setTextBackground] = useState<string>("transparent");

  function onLoadFallback(ev: React.SyntheticEvent<HTMLImageElement, Event>) {
    const img = ev.currentTarget;
    const { textColor, textBackground } = getBrightnessStyle(
      getImageBrightness(img),
    );
    setTextBackground(
      textBackground
        ? textColor === "white"
          ? "black"
          : "white"
        : "transparent",
    );
    setTextColor(textColor);
  }

  const color = textColor || _color;
  const backgroundColor = useMemo(() => {
    if (textBackground !== undefined) {
      return textBackground
        ? color === "white"
          ? "black"
          : "white"
        : "transparent";
    }
    return _backgroundColor;
  }, [textBackground, _backgroundColor, color]);

  return (
    <div
      className={cn(
        "flex grow items-center outline-none box-border origin-center font-normal whitespace-nowrap w-32 h-32 aspect-square relative font-code touch-manipulation cursor-grab select-none",
        className,
      )}
      {...props}
    >
      {src ? (
        <ImageWithFallback
          src={src}
          className="object-cover overflow-hidden w-32 h-32"
          imgs={imgs}
          decoding="sync"
          onLoad={onLoad || onLoadFallback}
          fetchPriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : "lazy"}
          alt={`${name} by ${artist}`}
          width={width}
          height={height}
        />
      ) : (
        <div className="w-full h-full bg-neutral-950" />
      )}
      <AlbumDetails
        color={color}
        backgroundColor={backgroundColor}
        name={name}
        artist={artist}
      />
    </div>
  );
}
