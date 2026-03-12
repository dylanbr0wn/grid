"use client";
import LastFMPallete from "./lastfm-container";
import UserForm from "../user-form";
import LastFMAlbums from "./lastfm-albums";
import { useAlbumsStore } from "@/lib/albums-store";

export default function LastFM() {
  const user = useAlbumsStore((state) => state.user);
  return (
    <LastFMPallete>
      {!user && (
        <div className="shrink-0 flex flex-col items-center justify-start p-4 text-sm text-neutral-500 w-full col-span-3 gap-5">
          <UserForm />
        </div>
      )}
      <LastFMAlbums />
    </LastFMPallete>
  );
}
