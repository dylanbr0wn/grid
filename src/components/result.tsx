"use client";

import { useQuery } from "@tanstack/react-query";
import { memo, useState } from "react";
import AlbumCover from "./album/album-cover";
import { ScrollArea } from "@base-ui/react";
import {
  getBrightnessStyle,
  getImageBrightness,
  PLACEHOLDER_IMG,
} from "@/lib/util";
import { customAlbum, CustomAlbum } from "@/lib/albums";
import { type } from "arktype";

type SearchResultProps = {
  query: string;
  onSelect?: (album: CustomAlbum) => void;
};

export const SearchResults = memo(function SearchResults({
  query,
  onSelect,
}: SearchResultProps) {
  const { data: albums, error } = useQuery<CustomAlbum[]>({
    queryKey: ["music-brainz", "search-releases", query],
    queryFn: async () => {
      try {
        if (query.length === 0) {
          return [];
        }
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) {
          throw new Error(`Search API error: ${res.status} ${res.statusText}`);
        }
        const parseJson = type("string.json.parse").to(customAlbum.array());
        const out = parseJson(await res.text());
        if (out instanceof type.errors) {
          throw new Error(`Search API response validation error: ${out.summary}`);
        }
        return out;
      } catch (error) {
        console.error("Error searching releases:", error);
        return [] as CustomAlbum[];
      }
    },
    refetchOnWindowFocus: false,
  });

  if (error) {
    return <div className="text-rose-600">Something went wrong.</div>;
  }

  if (!albums) {
    return <div className="text-neutral-500">Loading...</div>;
  }

  return (
    <ScrollArea.Root className="h-full relative w-lg">
      <ScrollArea.Viewport className="max-h-100 min-h-0 mt-4 bg-neutral-950 overflow-auto grid-cols-4 grid w-lg grid-flow-dense items-start">
        {albums && albums.length > 0 ? (
          albums.map((album) => (
            <SearchResultItem
              key={album.id}
              album={album}
              onSelect={onSelect}
            />
          ))
        ) : (
          <>
            {query && albums.length === 0 && <div className="col-span-4 text-neutral-500">no results found.</div>}
            {!query && <div className="col-span-4 text-neutral-500 w-full"></div>}
          </>
        )}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-75 data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-75">
        <ScrollArea.Thumb className="w-full bg-neutral-500" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
});

type SearchResultItemProps = {
  album: CustomAlbum;
  onSelect?: (album: CustomAlbum) => void;
};

function SearchResultItem({ album, onSelect }: SearchResultItemProps) {
  const [textBackground, setTextBackground] = useState(false);
  const [textColor, setTextColor] = useState("white");
  return (
    <button type="button" className="bg-black z-30" onClick={() => onSelect?.(album)} key={album.id}>
      <AlbumCover
        src={album.img || PLACEHOLDER_IMG}
        imgs={album.imgs}
        name={album.album ?? "Unknown Album"}
        artist={album.artist ?? "Unknown Artist"}
        width={128}
        height={128}
        textBackground={textBackground}
        textColor={textColor}
        onLoad={(ev: React.SyntheticEvent<HTMLImageElement, Event>) => {
          const img = ev.currentTarget;
          const { textColor: color, textBackground: bg } = getBrightnessStyle(
            getImageBrightness(img),
          );
          setTextBackground?.(bg);
          setTextColor?.(color);
        }}
      />
    </button>
  );
}
