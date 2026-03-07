"use client";
import { memo, useEffect, useRef, useState } from "react";
import {
  cn,
  getBrightnessStyle,
  getImageBrightness,
  PLACEHOLDER_IMG,
} from "@/lib/util";
import { Dialog, Field } from "@base-ui/react";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { SearchResults } from "../result";
import { Disabled } from "@dnd-kit/sortable/dist/types";
import * as motion from "motion/react-client";
import AlbumCover from "../album/album-cover";

import { Sortable } from "../sortable";
import { CustomAlbum as CustomAlbumType } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";
import CustomContextMenu from "./custom-contextmenu";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const handle = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    clearTimeout(handle.current);
    handle.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handle.current);
    };
  }, [value, delay]);

  return debouncedValue;
}

type CustomAlbumProps = {
  album: CustomAlbumType;
  priority?: boolean;
  disabled?: boolean | Disabled;
};

export const CustomAlbum = memo(function CustomAlbum({
  album,
  disabled,
  priority = false,
}: CustomAlbumProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const addCustomAlbum = useAlbumsStore((state) => state.addCustomAlbum);
  const setTextBackground = useAlbumsStore((state) => state.setTextBackground);
  const setTextColor = useAlbumsStore((state) => state.setTextColor);

  function handleAddCustomAlbum(_album: CustomAlbumType) {
    addCustomAlbum({
      ...album,
      ..._album,
    });
    setSearchQuery("");
    setOpen(false);
  }

  if (album.mbid && album.img && album.album && album.artist) {
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
            name={album.album}
            artist={album.artist}
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

  return (
    <Sortable
      key={album.id}
      id={album.id}
      sortData={{
        album,
      }}
      disabled={{
        draggable: true,
        droppable: false,
      }}
    >
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          className={cn(
            "flex grow items-center justify-center outline-none box-border origin-center font-normal whitespace-nowrap w-32 h-32 aspect-square bg-neutral-900 border border-neutral-800 text-neutral-500 font-code relative group cursor-pointer active:bg-neutral-900 hover:bg-neutral-950/50",
          )}
        >
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center transition-colors">
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 items-center group-hover:translate-y-0 transition-all translate-y-4 text-green-700 group-hover:scale-100 scale-80 group-active:text-green-500 ">
              <div>Add Album</div>
            </div>
          </div>
          <div className={cn("group-hover:blur")}>
            <IconPlus className="size-4" />
          </div>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-20 transition-all duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:opacity-70 supports-[-webkit-touch-callout:none]:absolute" />
          <Dialog.Popup className="fixed top-1/5 left-1/2 min-w-120 -translate-x-1/2 bg-neutral-950 p-4 text-white outline outline-neutral-800 transition-all duration-150 data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 dark:outline-neutral-700 w-132">
            <Dialog.Title className="-mt-1.5 mb-1 text-lg font-medium font-mono">
              Add Album
            </Dialog.Title>
            <Dialog.Description className="mb-6 text-base text-gray-600"></Dialog.Description>
            <Field.Root
              className={cn(
                "flex w-full flex-col gap-1 relative group items-center hover:bg-neutral-900 focus-within:z-1 focus-within:bg-neutral-900 text-neutral-300 pl-2",
              )}
            >
              <div className="w-full flex items-center gap-3">
                <IconSearch className="size-4 text-neutral-500 pointer-events-none" />
                <Field.Control
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  value={searchQuery}
                  name="Search"
                  onChange={(e) => setSearchQuery?.(e.target.value)}
                  placeholder="Search for an album..."
                  className={cn("h-10 w-full outline-none text-left text-base")}
                />
              </div>
              <motion.div
                className={cn(
                  "absolute right-0 left-0 bottom-0 h-px bg-neutral-400 group-focus-within:h-0.5 group-focus-within:z-1 data transition-colors",
                  focused && " bg-white",
                )}
                layout
                transition={{
                  duration: 0.15,
                }}
                style={{
                  height: focused ? 3 : 1,
                }}
              />
            </Field.Root>
            <SearchResults
              query={debouncedSearchQuery}
              onSelect={handleAddCustomAlbum}
            />
            <Dialog.Close className="absolute top-0 right-0 h-8 w-8 bg-red-500 text-base font-medium text-white select-none hover:bg-red-700 focus-visible:outline focus-visible:-outline-offset-1 focus-visible:outline-blue-800 active:bg-red-900">
              x
            </Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </Sortable>
  );
});
