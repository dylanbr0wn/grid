"use client";

import { ContextMenu } from "@base-ui/react";
import { IconCheck, IconChevronRight } from "@tabler/icons-react";
import { CustomAlbum as CustomAlbumType } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";

type LastFmContextMenuProps = {
  children: React.ReactNode;
  album: CustomAlbumType;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function CustomContextMenu({
  children,
  album,
  open,
  setOpen,
}: LastFmContextMenuProps) {
  const setTextBackground = useAlbumsStore((state) => state.setTextBackground);
  const setTextColor = useAlbumsStore((state) => state.setTextColor);

  return (
    <ContextMenu.Root key={album.id} open={open} onOpenChange={setOpen}>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="outline-none">
          <ContextMenu.Popup className="origin-(--transform-origin)  bg-neutral-950 py-1 text-neutral-300 shadow-lg shadow-gray-200 outline outline-gray-200 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300 z-100">
            <ContextMenu.SubmenuRoot>
              <ContextMenu.SubmenuTrigger className="flex cursor-default items-center justify-between gap-4 py-2 pr-4 pl-4 text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-neutral-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-neutral-900 data-popup-open:relative data-popup-open:z-0 data-popup-open:before:absolute data-popup-open:before:inset-x-1 data-popup-open:before:inset-y-0 data-popup-open:before:z-[-1]  data-popup-open:before:bg-neutral-900 data-highlighted:data-popup-open:before:bg-neutral-900">
                Text color <IconChevronRight className="size-3" />
              </ContextMenu.SubmenuTrigger>
              <ContextMenu.Portal>
                <ContextMenu.Positioner
                  className="outline-none"
                  alignOffset={-4}
                  sideOffset={-4}
                >
                  <ContextMenu.Popup className="origin-(--transform-origin) bg-neutral-950 py-1 text-neutral-300 shadow-lg shadow-neutral-200 outline-1 outline-neutral-200 dark:shadow-none dark:-outline-offset-1 dark:outline-neutral-300">
                    <ContextMenu.RadioGroup
                      value={album.textColor}
                      onValueChange={(value) => setTextColor?.(album.id, value)}
                    >
                      <ContextMenu.RadioItem
                        value="white"
                        className="grid cursor-default gap-2 py-2 pr-4 pl-2.5 grid-cols-[0.75rem_1fr] text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-neutral-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-900"
                      >
                        <ContextMenu.RadioItemIndicator className="col-start-1">
                          <IconCheck className="size-3" />
                        </ContextMenu.RadioItemIndicator>
                        <span className="col-start-2">White</span>
                      </ContextMenu.RadioItem>
                      <ContextMenu.RadioItem
                        value="black"
                        className="grid grid-cols-[0.75rem_1fr] cursor-default gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-neutral-50 data-highlighted:before:absolute data-highlighted:before:inset-x-1 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-900"
                      >
                        <ContextMenu.RadioItemIndicator className="col-start-1">
                          <IconCheck className="size-3" />
                        </ContextMenu.RadioItemIndicator>
                        <span className="col-start-2">Black</span>
                      </ContextMenu.RadioItem>
                    </ContextMenu.RadioGroup>
                  </ContextMenu.Popup>
                </ContextMenu.Positioner>
              </ContextMenu.Portal>
            </ContextMenu.SubmenuRoot>
            <ContextMenu.CheckboxItem
              checked={!!album.textBackground}
              className="grid grid-cols-[0.75rem_1fr] cursor-default gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-[highlighted=true]:relative data-[highlighted=true]:z-0 data-[highlighted=true]:text-neutral-50 data-[highlighted=true]:before:absolute data-[highlighted=true]:before:inset-x-1 data-[highlighted=true]:before:inset-y-0 data-[highlighted=true]:before:z-[-1] data-[highlighted=true]:before:bg-neutral-900"
              onMouseUp={() =>
                setTextBackground?.(album.id, !album.textBackground)
              }
            >
              <ContextMenu.CheckboxItemIndicator className="col-start-1">
                <IconCheck className="size-3" />
              </ContextMenu.CheckboxItemIndicator>
              <span className="col-start-2">Toggle text background</span>
            </ContextMenu.CheckboxItem>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
