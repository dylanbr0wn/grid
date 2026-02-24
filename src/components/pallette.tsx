'use client';
import { ScrollArea } from "@base-ui/react";
import { cn } from "@/lib/util";
import { Container } from "@/context/grid";

function calcHeight(albumCount: number) {
  const rows = Math.ceil(albumCount / 3);
  const height =  rows * 128 + (rows - 1) * 8 + 16;

  if (height < 128) {
    return 256;
  }
  return height;
}

type AlbumPalleteProps = {
  container: Container;
  children?: React.ReactNode;
  header?: React.ReactNode;
};

export default function AlbumPallete({
  children,
  header,
  container,
}: AlbumPalleteProps) {
  const height = calcHeight(container.albums.length);
  return (
    <div
      className={cn(
        "min-h-46 relative flex flex-col",
        Math.ceil(container.albums.length / 3) <= 3 && "shrink-0",
        Math.ceil(container.albums.length / 3) > 3 && "min-h-1/2"
      )}
      style={{ width: 3 * 128 + 16, height: height  + 40 }}
    >
      <div className="w-full h-9.75 border-b border-neutral-800 flex items-center shrink-0 gap-1">
        {header ?? (
          <h5 className="text-neutral-300 text-sm mx-3 mb-0 font-code">
            {container.title}
          </h5>
        )}
      </div>
      <ScrollArea.Root
        style={{ height }}
        className="relative w-full overflow-hidden"
      >
        <ScrollArea.Viewport className="w-full max-h-full grid grid-cols-3 px-2 relative overscroll-contain overflow-x-hidden pt-2">
          {children}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-75 data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-75">
          <ScrollArea.Thumb className="w-full bg-neutral-500" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
