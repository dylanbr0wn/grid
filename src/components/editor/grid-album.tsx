import { Sortable } from "../sortable";
import CustomAlbum from "./custom-album";
import {
  CustomAddAlbum,
  CustomAlbum as CustomAlbumType,
  LastFmAlbum as LastFmAlbumType,
  PlaceholderAlbum as PlaceholderAlbumType,
} from "@/lib/albums";
import LastFmAlbum from "./lastfm-album";

type GridAlbumProps = {
  disabled?: boolean;
  album: LastFmAlbumType | PlaceholderAlbumType | CustomAlbumType | CustomAddAlbum;
  priority?: boolean;
}

export default function GridAlbum({
  album,
  priority = false,
}: GridAlbumProps) {
  if (album.type === "custom") {
    return (
      <CustomAlbum
        album={album}
        priority={priority}
        disabled={!album.mbid}
      />
    );
  }

  if (album.type === "placeholder") {
    return (
      <Sortable
        id={album.id}
        disabled
        sortData={{
          album,
        }}
        className="pointer-events-none select-none outline-none focus-visible:ring-0"
      >
        <div className="w-32 h-32 bg-transparent" />
      </Sortable>
    );
  }

  if (album.type === "lastfm") {
    return (
      <LastFmAlbum
        album={album}
        priority={priority}
      />
    );
  }
  return null;
}
