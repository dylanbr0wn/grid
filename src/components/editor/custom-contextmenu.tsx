"use client";

import { ContextMenu, ContextMenuRootChangeEventDetails } from "@base-ui/react";
import { IconCheck, IconChevronRight, IconTrash } from "@tabler/icons-react";
import { CustomAlbum as CustomAlbumType, newPlaceholderAlbum } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";
import { CUSTOM_CONTAINER_KEY } from "@/lib/util";

type CustomContextMenuProps = {
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
}: CustomContextMenuProps) {
  const setTextBackground = useAlbumsStore((state) => state.setTextBackground);
  const setTextColor = useAlbumsStore((state) => state.setTextColor);

  const setAlbums = useAlbumsStore((state) => state.setAlbums);

  function removeAlbum() {
    setAlbums((albums) => {
      const containerId = Object.keys(albums).find((key) =>
        albums[key].albums.some((a) => a.id === album.id)
      );
      if (!containerId) return albums;

      if (containerId === CUSTOM_CONTAINER_KEY) {
        return {
          ...albums,
          [CUSTOM_CONTAINER_KEY]: {
            ...albums[CUSTOM_CONTAINER_KEY],
            albums: albums[CUSTOM_CONTAINER_KEY].albums.filter(
              (a) => a.id !== album.id
            ),
          },
        };
      }
      if (containerId === "grid") {
        return {
          ...albums,
          grid: {
            ...albums.grid,
            albums: albums.grid.albums.map((a) => {
              if (a.id === album.id) {
                return newPlaceholderAlbum();
              }
              return a;
            }),
          },
        };
      }
      console.error("Album not found in any container");
      return albums;
    });
  }

  function handleOpenChange(open: boolean, event: ContextMenuRootChangeEventDetails) {
    if (!open) {
      event.event.preventDefault();
    }
    setOpen(open);
  }

  return (
    <ContextMenu.Root key={album.id} open={open} onOpenChange={handleOpenChange}>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="outline-none">
          <ContextMenu.Popup className="origin-(--transform-origin) bg-neutral-950 py-px text-neutral-300 shadow-lg shadow-neutral-200 outline outline-neutral-500 dark:shadow-none dark:-outline-offset-1 dark:outline-neutral-700 z-100">
            <ContextMenu.SubmenuRoot>
              <ContextMenu.SubmenuTrigger className="flex cursor-default items-center justify-between gap-4 py-2 pr-4 pl-4 text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-neutral-50 data-highlighted:before:absolute data-highlighted:before:inset-x-px data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-900 data-popup-open:relative data-popup-open:z-0 data-popup-open:before:absolute data-popup-open:before:inset-x-px data-popup-open:before:inset-y-0 data-popup-open:before:z-[-1]  data-popup-open:before:bg-neutral-900 data-highlighted:data-popup-open:before:bg-neutral-900">
                Text color <IconChevronRight className="size-3" />
              </ContextMenu.SubmenuTrigger>
              <ContextMenu.Portal>
                <ContextMenu.Positioner
                  className="outline-none"
                  alignOffset={-4}
                  sideOffset={-4}
                >
                  <ContextMenu.Popup className="origin-(--transform-origin) bg-neutral-950 py-px text-neutral-300 shadow-lg shadow-neutral-200 outline outline-neutral-500 dark:shadow-none dark:-outline-offset-1 dark:outline-neutral-700">
                    <ContextMenu.RadioGroup
                      value={album.textColor}
                      onValueChange={(value) => setTextColor?.(album.id, value)}
                    >
                      <ContextMenu.RadioItem
                        value="white"
                        className="grid cursor-default gap-2 py-2 pr-4 pl-2.5 grid-cols-[0.75rem_1fr] text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-neutral-50 data-highlighted:before:absolute data-highlighted:before:inset-x-px data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-900"
                      >
                        <ContextMenu.RadioItemIndicator className="col-start-1">
                          <IconCheck className="size-3" />
                        </ContextMenu.RadioItemIndicator>
                        <span className="col-start-2">White</span>
                      </ContextMenu.RadioItem>
                      <ContextMenu.RadioItem
                        value="black"
                        className="grid grid-cols-[0.75rem_1fr] cursor-default gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-neutral-50 data-highlighted:before:absolute data-highlighted:before:inset-x-px data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-900"
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
              className="grid grid-cols-[0.75rem_1fr] cursor-default gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-neutral-50 data-highlighted:before:absolute data-highlighted:before:inset-x-px data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-900"
              onCheckedChange={(checked) =>
                setTextBackground?.(album.id, checked)
              }
            >
              <ContextMenu.CheckboxItemIndicator className="col-start-1">
                <IconCheck className="size-3" />
              </ContextMenu.CheckboxItemIndicator>
              <span className="col-start-2">Toggle text background</span>
            </ContextMenu.CheckboxItem>
            <ContextMenu.Separator className="h-px bg-neutral-700" />
            <ContextMenu.Item
              className="grid grid-cols-[0.75rem_1fr] text-red-800 cursor-default gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-red-700 data-highlighted:before:absolute data-highlighted:before:inset-x-px data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-red-950/30"
              onClick={removeAlbum}
            >
              <IconTrash className="size-4" />
              <span className="col-start-2">Remove Album</span>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
