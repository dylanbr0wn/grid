"use client";
import { useState } from "react";
import {
  getBrightnessStyle,
  getImageBrightness,
  PLACEHOLDER_IMG,
} from "@/lib/util";
import { Disabled } from "@dnd-kit/sortable/dist/types";
import AlbumCover from "../album/album-cover";

import { Sortable } from "../sortable";
import { CustomAlbum as CustomAlbumType, isCustomAddId } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";
import CustomContextMenu from "./custom-contextmenu";
import CustomAddButton from "./custom-album-add-button";

type CustomAlbumProps = {
  album: CustomAlbumType;
  priority?: boolean;
  disabled?: boolean | Disabled;
};

export default function CustomAlbum({
  album,
  disabled,
  priority = false,
}: CustomAlbumProps) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const setTextBackground = useAlbumsStore((state) => state.setTextBackground);
  const setTextColor = useAlbumsStore((state) => state.setTextColor);

  if (isCustomAddId(album.id) || !album.mbid) {
    return <CustomAddButton id={album.id} disabled={disabled} />;
  }

  return (
    <Sortable
      key={album.id}
      id={album.id}
      sortData={{
        album,
      }}
      disabled={contextMenuOpen || disabled}
    >
      <CustomContextMenu
        open={contextMenuOpen}
        setOpen={setContextMenuOpen}
        album={album}
      >
        <AlbumCover
          src={album.img || PLACEHOLDER_IMG}
          imgs={album.imgs}
          name={album.album || "Unknown Album"}
          artist={album.artist || "Unknown Artist"}
          width={128}
          height={128}
          id={`${album.id}-custom-album`}
          priority={priority}
          data-id={album.id}
          textBackground={album.textBackground}
          textColor={album.textColor}
          onLoad={(ev: React.SyntheticEvent<HTMLImageElement, Event>) => {
            const img = ev.currentTarget;
            const { textColor, textBackground } = getBrightnessStyle(
              getImageBrightness(img),
            );
            setTextBackground?.(album.id, textBackground);
            setTextColor?.(album.id, textColor);
          }}
        />
      </CustomContextMenu>
    </Sortable>
  );
}
