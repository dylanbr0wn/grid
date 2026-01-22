import Input from "@/components/input";
import SearchForm from "./form";
import { searchReleases } from "@/lib/music-brainz";
import { Suspense } from "react";
import SearchResult from "./result";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ user: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let { query } = await searchParams;

  if (query && typeof query !== "string") {
    query = "";
  }

  const releases = searchReleases(query || "", 10);

  return (
    <div className="min-h-0 flex flex-col p-4">
      <SearchForm />
      <Suspense fallback={<div className="text-white mt-4">Loading...</div>}>
        <SearchResult releaseGroups={releases!} />
      </Suspense>
    </div>
  );
}
