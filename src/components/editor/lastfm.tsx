import { SortType } from "@/lib/sort";
import LastFMPallete, { LastFMAlbums } from "./lastfm-container";
import { fetchAlbums } from "@/lib/lastfm";
import { Suspense } from "react";
import UserForm from "../user-form";

type LastFMProps = {
  user: string | undefined;
  sort: SortType;
};

export default function LastFM({ sort, user }: LastFMProps) {
  if (!user) {
    return (
      <LastFMPallete user={user}>
        <div className="shrink-0 h-full flex flex-col items-center justify-center p-4 text-sm text-neutral-500 w-full col-span-3 gap-5">
          <div>Import your lastfm scrobbles.</div>
          <UserForm />
        </div>
      </LastFMPallete>
    );
  }

  const albums = fetchAlbums(user, sort as string);
  return (
    <LastFMPallete user={user}>
      <Suspense
          fallback={
            <div className="p-4 text-sm text-neutral-500 col-span-3">
              Loading Last.fm albums...
            </div>
          }
        >
          <LastFMAlbums initialAlbumsPromise={albums} />
        </Suspense>
    </LastFMPallete>
  );
}
