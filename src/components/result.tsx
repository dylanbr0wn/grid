"use client";

import { searchReleases } from "@/lib/music-brainz";
import { useSuspenseQuery } from "@tanstack/react-query";
import { memo, useState } from "react";
import AlbumCover from "./album/album-cover";
import { ScrollArea } from "@base-ui/react";
import {
  getBrightnessStyle,
  getImageBrightness,
  PLACEHOLDER_IMG,
} from "@/lib/util";
import { CustomAlbum } from "@/lib/albums";

type SearchResultProps = {
  query: string;
  onSelect?: (album: CustomAlbum) => void;
};

export const SearchResults = memo(function SearchResults({
  query,
  onSelect,
}: SearchResultProps) {
  const { data: albums } = useSuspenseQuery({
    queryKey: ["music-brainz", "search-releases", query],
    queryFn: () => searchReleases(query),
    refetchOnWindowFocus: false,
  });

  if (!albums || albums.length === 0) {
    return <div className="text-white">No results found.</div>;
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
          <div className="text-white">No results found.</div>
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
    <button className="bg-black z-30" onClick={() => onSelect?.(album)} key={album.id}>
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
