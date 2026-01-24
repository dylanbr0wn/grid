import { ScrollArea } from "@base-ui-components/react";

type AlbumPalleteProps = {
  title: string;
  children?: React.ReactNode;
};

export default function AlbumPallete({
  title,
  children,
}: AlbumPalleteProps) {
  return (
    <div
      className=" min-h-0 min-h-[184px] border-b border-neutral-800 relative flex flex-col"
      style={{ width: 3 * 128 + 16 }}
    >
      <div className="w-full h-[39px] border-b border-neutral-800 flex items-center justify-center shrink-0">
        <h5 className=" text-sm tracking-[0.5rem]  mb-0 uppercase font-code">
          {title}
        </h5>
      </div>
      <ScrollArea.Root
        style={{ height: `calc(100% - 40px)` }}
        className="relative w-full shrink-0 overflow-hidden"
      >
        <ScrollArea.Viewport
          className="w-full shrink-0 max-h-full min-h-36 h-full grid grid-cols-3 px-2 relative overscroll-contain overflow-x-hidden pt-2"
        >
          {children}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
          <ScrollArea.Thumb className="w-full bg-neutral-500" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
