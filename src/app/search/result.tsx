'use client'
import { ImageWithFallback } from "@/components/image";
import { searchReleases } from "@/lib/music-brainz";
import { use } from "react";

type SearchResultProps = {
  query: string;
};

export default function SearchResult({ query }: SearchResultProps) {
  if (!query) {
    return null;
  }
  const groups = use(searchReleases(query, 10));
  if (!groups || groups.count === 0) {
    return <div className="text-white mt-4">No results found.</div>;
  }
  return (
    <div className="h-[400px] min-h-0 border border-white mt-4 bg-neutral-900 overflow-auto">
      {groups["release-groups"].map((group) => (
        <div key={group.id} className="flex gap-3 h-[125px]">
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
        </div>
      ))}
    </div>
  );
}
