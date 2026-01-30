'use client'
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import AlbumPallete from "../pallette";
import { useContainer, useGrid } from "./context";
import { SortableAlbum } from "../album";

const containerKey = "custom";

export default function CustomPallete() {
  const { container } = useContainer(containerKey);
  const { setTextBackground, setTextColor } = useGrid();
  return (
    <AlbumPallete container={container}>
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
}
