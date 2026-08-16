import { cn } from "@/lib/util";
import LastFMIcon from "../lastfm-icon";
import { IconX } from "@tabler/icons-react";
import { useAlbumsStore } from "@/lib/albums-store";
import { useClearLastFmUser } from "@/lib/lastfm-user";

export default function UserButton() {
  const user = useAlbumsStore((state) => state.user);
  const initialized = useAlbumsStore((state) => state.initialized);
  const logout = useClearLastFmUser();

  return (
    <button
      onClick={logout}
      className="h-full flex items-center justify-center relative text-sm group/button"
    >
      {!!user && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center transition-colors group-hover/button:bg-neutral-900">
          <div className="flex gap-1  opacity-0 group-hover/button:opacity-100 items-center group-hover/button:translate-y-0 transition-all translate-y-4 text-lastfm group-hover/button:scale-100 scale-80">
            <IconX className="size-4  " />
            <div>Clear</div>
          </div>
        </div>
      )}
      {user && (
        <div
          className={cn(
            "bg-neutral-400 absolute bottom-0 left-0 right-0 h-px group-active/button:h-0.75 transition-all ",
            !!user && "group-hover/button:bg-lastfm ",
          )}
        />
      )}
      {initialized && (
        <div
          className={cn(
            "px-4 text-neutral-300 flex gap-1 items-center transition-all",
          )}
        >
          <LastFMIcon className="size-5 mr-2 fill fill-lastfm" />
          <div>{user || "Last.fm"}</div>
        </div>
      )}
    </button>
  );
}
