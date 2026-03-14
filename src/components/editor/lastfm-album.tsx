import { useAlbumsStore } from "@/lib/albums-store";
import { LastFmAlbum as LastFmAlbumType } from "@/lib/albums";
import { useState } from "react";
import { Sortable } from "../sortable";
import { getBrightnessStyle, getImageBrightness } from "@/lib/util";
import LastFmContextMenu from "./lastfm-contextmenu";
import AlbumCover from "../album/album-cover";

export type LastFmAlbumProps = {
  priority?: boolean;
  album: LastFmAlbumType;
};

export default function LastFmAlbum({ album, priority = false }: LastFmAlbumProps) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const setTextBackground = useAlbumsStore((state) => state.setTextBackground);
  const setTextColor = useAlbumsStore((state) => state.setTextColor);

  if (!album) {
    return null;
  }

  return (
    <Sortable
      key={album.id}
      id={album.id}
      disabled={contextMenuOpen}
      sortData={{
        album,
      }}
    >
      <LastFmContextMenu
        open={contextMenuOpen}
        setOpen={setContextMenuOpen}
        album={album}
      >
        <AlbumCover
          src={album.img}
          imgs={album.imgs}
          name={album.album}
          artist={album.artist}
          width={128}
          height={128}
          id={`${album.id}-image`}
          data-id={album.id}
          priority={priority}
          textBackground={album.textBackground}
          textColor={album.textColor}
          onLoad={(ev: React.SyntheticEvent<HTMLImageElement>) => {
            const img = ev.currentTarget;
            const { textColor, textBackground } = getBrightnessStyle(
              getImageBrightness(img),
            );
            setTextBackground?.(album.id, textBackground);
            setTextColor?.(album.id, textColor);
          }}
        />
      </LastFmContextMenu>
    </Sortable>
  );
};
