"use client";
import LastFMPallete from "./lastfm-container";
import UserForm from "../user-form";
import { useGridStore } from "@/lib/session-store";
import LastFMAlbums from "./lastfm-albums";

export default function LastFM() {
  const user = useGridStore((state) => state.user);
  return (
    <LastFMPallete>
      {!user && (
        <div className="shrink-0 h-full flex flex-col items-center justify-center p-4 text-sm text-neutral-500 w-full col-span-3 gap-5">
          <UserForm />
        </div>
      )}
      <LastFMAlbums />
    </LastFMPallete>
  );
}
