'use client';
import { ScrollArea } from "@base-ui-components/react";
import { memo, use, useCallback } from "react";
import { SortableAlbum } from "../album";
import {
  arrayMove,
  arraySwap,
  SortableContext,
  SortingStrategy,
} from "@dnd-kit/sortable";
import { GridContext, isPlaceholderId } from "./context";
import { cn } from "@/lib/util";

export default function Grid() {
  const { rows, columns, albums } =
    use(GridContext);

  const gridSortingStrategy = useCallback<SortingStrategy>(
    ({ rects, activeIndex, overIndex, index }) => {
      const overItem = albums["grid"].albums[overIndex];

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
    [albums]
  );

  return (
    <ScrollArea.Root
      className="h-[calc(100%-80px)] relative"
      style={
        {
          "--col-count": columns,
        } as React.CSSProperties
      }
    >
      <ScrollArea.Viewport className="h-full flex justify-center items-center-safe">
        <div
          id="fm-grid"
          className={
            "shrink-0 grid h-full relative select-none outline outline-neutral-800 -outline-offset-1 place-items-center"
          }
          style={
            {
              width: columns * 128,
              height: rows * 128,
            } as React.CSSProperties
          }
        >
          <BackgroundGrid rows={rows} columns={columns} />
          <div className="grid grid-cols-[repeat(var(--col-count),1fr)] auto-rows-min h-full col-span-full row-span-full">
            <SortableContext
              id="grid"
              items={albums["grid"].albums}
              strategy={gridSortingStrategy}
            >
              {albums["grid"].albums.map((album, index) => (
                <SortableAlbum
                  key={album.id}
                  album={album}
                  index={index}
                  disabled={isPlaceholderId(album.id)}
                  priority={true}
                />
              ))}
            </SortableContext>
          </div>
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
        <ScrollArea.Thumb className="w-full bg-neutral-500" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

type BackgroundGridProps = {
  rows: number;
  columns: number;
};

const BackgroundGrid = memo(function BackgroundGrid({
  rows,
  columns,
}: BackgroundGridProps) {
  const albums = new Array(rows * columns).fill(0);
  return (
    <div
      className={
        "shrink-0 col-span-full row-span-full grid grid-cols-[repeat(var(--col-count),1fr)] auto-rows-min h-full -z-1 pointer-events-none select-none overflow-hidden no-export"
      }
      style={
        {
          width: columns * 128,
          height: rows * 128,
        } as React.CSSProperties
      }
    >
      {albums.map((_, index) => {
        return (
          <div
            key={index}
            className={cn(
              "w-32 h-32 bg-neutral-950 -z-1 border-neutral-800 -translate-x-[0.5px] -translate-y-[0.5px]",
              index % columns > 0 && "border-l",
              index >= columns && "border-t"
            )}
          />
        );
      })}
    </div>
  );
});
