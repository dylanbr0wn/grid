import { SortType } from "@/lib/sort";
import LastFMPallete, {
  LastFMAlbums,
} from "./lastfm-container";
import { fetchAlbums } from "@/lib/lastfm";
import { Suspense } from "react";
import UserForm from "../user-form";
import { redirect, RedirectType } from "next/navigation";
import { LAST_FM_SORT_KEY } from "@/lib/util";

type LastFMProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function LastFM({ searchParams }: LastFMProps) {
  let { [LAST_FM_SORT_KEY]: sort } = searchParams;

  const { lastfmUser: user } = searchParams;

  if (!sort || typeof sort !== "string") {
    sort = "playcount";
  }

  if (user && typeof user !== "string") {
    redirect("/", RedirectType.replace);
  }

  if (!user) {
    return (
      <LastFMPallete user={user} sort={sort as SortType}>
        <div className="shrink-0 h-full flex flex-col items-center justify-center p-4 text-sm text-neutral-500 w-full col-span-3 gap-5">
          <div>Import your lastfm scrobbles.</div>
          <UserForm />
        </div>
      </LastFMPallete>
    );
  }

  const albums = fetchAlbums(user, sort as string);
  return (
    <LastFMPallete user={user} sort={sort as SortType}>
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
