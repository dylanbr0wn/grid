import { ScrollArea } from "@base-ui-components/react";
import { rectSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Album, SortableAlbum } from "./album";

type LastFmAlbumsProps = {
  albums: Album[];
  setTextColor?: (index: number, color: string) => void;
  setTextBackground?: (index: number, background: boolean) => void;
};

export default function LastFmAlbums({
  albums,
  setTextBackground,
  setTextColor,
}: LastFmAlbumsProps) {
  return (
    <div
      className="h-full shrink-0 border-r border-neutral-800 overflow-hidden relative flex flex-col"
      style={{ width: 3 * 128 + 16 }}
    >
      <div className="h-10 border-b border-neutral-800 flex items-center justify-center shrink-0">
        <h5 className=" text-sm tracking-[0.5rem]  mb-0 uppercase font-code">
          last.fm
        </h5>
      </div>
      <ScrollArea.Root
        className="relative w-full"
        style={{
          height: "calc(100% - 40px)",
        }}
      >
        <ScrollArea.Viewport
          className="max-h-full grid grid-cols-3 px-2 relative overscroll-contain overflow-x-hidden "
          style={{
            width: 128 * 3 + 16,
          }}
        >
          <SortableContext
            id="extras"
            items={albums}
            strategy={rectSortingStrategy}
          >
            {albums.map((value, index) => (
              <SortableAlbum
                key={value.id}
                value={value}
                index={albums.length + index}
                setTextBackground={setTextBackground}
                setTextColor={setTextColor}
              />
            ))}
          </SortableContext>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
          <ScrollArea.Thumb className="w-full bg-neutral-500" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
