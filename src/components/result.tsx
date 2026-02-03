"use client";
import { ImageWithFallback } from "@/components/image";
import { ReleaseGroupResponse, searchReleases } from "@/lib/music-brainz";
import { useSuspenseQuery } from "@tanstack/react-query";
import { memo } from "react";
import AlbumCover from "./album-cover";
import { CustomAlbum } from "./editor/custom";
import { ScrollArea } from "@base-ui-components/react";

type SearchResultProps = {
  query: string;
  onSelect?: (album: CustomAlbum) => void;
};

export const SearchResult = memo(function SearchResult({
  query,
  onSelect,
}: SearchResultProps) {
  const { data: albums } = useSuspenseQuery({
    queryKey: ["music-brainz", "search-releases", query],
    queryFn: () => searchReleases(query),
  });
  return (
    <ScrollArea.Root className="h-full relative w-lg">
      <ScrollArea.Viewport className="max-h-100 min-h-0 mt-4 bg-neutral-950 overflow-auto grid-cols-4 grid w-lg grid-flow-dense items-start">
        {(albums && albums.length > 0)  ? albums.map((album) => (
          <button onClick={() => onSelect?.(album)} key={album.id}>
            <AlbumCover album={album} />
          </button>
        )) : <div className="text-white">No results found.</div>}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
        <ScrollArea.Thumb className="w-full bg-neutral-500" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
});
