"use client";
import { ScrollArea } from "@base-ui/react";
import { useCallback } from "react";
import {
  arrayMove,
  arraySwap,
  SortableContext,
  SortingStrategy,
} from "@dnd-kit/sortable";
import { isPlaceholderId } from "@/lib/albums";
import dynamic from "next/dynamic";
import { useAlbumsStore } from "@/lib/albums-store";
import GridAlbum from "./grid-album";

const Background = dynamic(() => import("./grid-background"), {
  ssr: false,
  loading: () => null,
});

export default function Grid() {
  const albums = useAlbumsStore((state) => state.albums);
  const columns = useAlbumsStore((state) => state.columns);
  const rows = useAlbumsStore((state) => state.rows);

  const gridSortingStrategy = useCallback<SortingStrategy>(
    ({ rects, activeIndex, overIndex, index }) => {
      const overItem = albums["grid"].albums[overIndex];
      if (overIndex < 0 || !overItem) {
        return null;
      }

      let newRects = arrayMove(rects, overIndex, activeIndex);
      if (isPlaceholderId(overItem.id)) {
        newRects = arraySwap(rects, overIndex, activeIndex);
      }

      const oldRect = rects[index];
      const newRect = newRects[index];

      if (!newRect || !oldRect) {
        return null;
      }

      return {
        x: newRect.left - oldRect.left,
        y: newRect.top - oldRect.top,
        scaleX: newRect.width / oldRect.width,
        scaleY: newRect.height / oldRect.height,
      };
    },
    [albums],
  );

  return (
    <ScrollArea.Root
      className="h-full relative w-full"
      style={
        {
          "--col-count": columns,
          "--row-count": rows,
        } as React.CSSProperties
      }
    >
      <ScrollArea.Viewport className="h-full flex justify-center items-center-safe">
        <div
          id="fm-grid"
          className={
            "shrink-0 grid h-full relative select-none place-items-start"
          }
          style={
            {
              width: columns * 128,
              height: rows * 128,
            } as React.CSSProperties
          }
        >
          <Background />
          <div className="grid grid-cols-[repeat(var(--col-count),1fr)] grid-rows-[repeat(var(--row-count),1fr)] auto-rows-min h-full col-span-full row-span-full">
            <SortableContext
              id="grid"
              items={albums["grid"].albums}
              strategy={gridSortingStrategy}
            >
              {albums["grid"].albums.map((album) => (
                <GridAlbum
                  key={album.id}
                  album={album}
                  disabled={isPlaceholderId(album.id)}
                  priority={true}
                />
              ))}
            </SortableContext>
          </div>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-75 data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-75">
        <ScrollArea.Thumb className="w-full bg-neutral-500" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
