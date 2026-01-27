'use client';

import { use } from "react";
import { GridContext } from "./context";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import AlbumPallete from "../lastfm";
import { SortableAlbum } from "../album";

export default function Sidebar() {
  const { albums, setTextBackground, setTextColor } = use(GridContext);
  return (
    <>
      {Object.keys(albums).map((containerKey) => {
        if (containerKey === "grid") return null;
        const container = albums[containerKey];
        return (
          <AlbumPallete key={containerKey} title={container.title}>
            <SortableContext
              id={containerKey}
              items={container.albums}
              strategy={rectSortingStrategy}
            >
              {container.albums.map((album, index) => (
                <SortableAlbum
                  key={album.id}
                  album={album}
                  index={container.albums.length + index}
                  setTextBackground={setTextBackground}
                  setTextColor={setTextColor}
                />
              ))}
            </SortableContext>
          </AlbumPallete>
        );
      })}
    </>
  );
}
