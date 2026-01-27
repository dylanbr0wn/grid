'use client'
import { ImageWithFallback } from "@/components/image";
import { ReleaseGroupResponse, searchReleases } from "@/lib/music-brainz";
import { useSuspenseQuery } from "@tanstack/react-query";
import { memo } from "react";

type SearchResultProps = {
  query: string;
  onSelect?: (group: typeof ReleaseGroupResponse.infer["release-groups"][number]) => void;
};

export const SearchResult = memo(function SearchResult({ query, onSelect }: SearchResultProps) {
  const { data: groups } = useSuspenseQuery({
    queryKey: ["music-brainz", "search-releases", query],
    queryFn: () => searchReleases(query),
  })

  if (!groups || groups.length === 0) {
    return <div className="text-white mt-4">No results found.</div>;
  }
  return (
    <div className="h-[400px] min-h-0 border border-white mt-4 bg-neutral-900 overflow-auto">
      {groups.map((group) => (
        <button onClick={() => onSelect?.(group)} key={group.id} className="flex gap-3 h-[125px]">
          <ImageWithFallback
              blurDataURL="/placeholder.png"
              placeholder="blur"
              alt={`${group.title}-cover`}
              src={group.thumbnails?.small || '/placeholder.png'}
              width={125}
              height={125}
              fetchPriority="high"
              loading="eager"
              className="object-cover overflow-hidden"
              unoptimized
            />
          <div className="p-4 border-b border-neutral-800 text-white">
            <h3 className="text-lg font-bold">{group.title}</h3>
            <p className="text-sm text-neutral-400">
              First Released: {group["first-release-date"] || "Unknown"}
            </p>
            <p className="text-sm text-neutral-400">
              Primary Type: {group["primary-type"] || "Unknown"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
})
