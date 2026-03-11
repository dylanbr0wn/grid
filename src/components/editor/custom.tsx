"use client";
import { useEffect, useRef, useState } from "react";
import {
  cn,
  CUSTOM_CONTAINER_KEY,
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
import { CustomAlbum as CustomAlbumType, isCustomAddId } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";
import CustomContextMenu from "./custom-contextmenu";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const handle = useRef<ReturnType<typeof setTimeout>>(undefined);

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

export function CustomAlbum({
  album,
  disabled,
  priority = false,
}: CustomAlbumProps) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const setTextBackground = useAlbumsStore((state) => state.setTextBackground);
  const setTextColor = useAlbumsStore((state) => state.setTextColor);

  if (isCustomAddId(album.id) || !album.mbid) {
    return <CustomAddButton id={album.id} disabled={disabled} />;
  }

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
          name={album.album!}
          artist={album.artist!}
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

type CustomAddButtonProps = {
  id: string;
  disabled?: boolean | Disabled;
};

function isDisabled(disabled?: boolean | Disabled | undefined): boolean {
  return typeof disabled === "boolean" ? disabled : disabled?.droppable ?? false;
}

function CustomAddButton({ id, disabled }: CustomAddButtonProps) {
  const albums = useAlbumsStore(
    (state) => state.albums[CUSTOM_CONTAINER_KEY].albums,
  );


  if (isDisabled(disabled) || albums.length > 1) {
    return <CustomAlbumAddDialog />;
  }

  return (
    <Sortable key={id} id={id} sortData={{}} disabled={{
      draggable: true,
      droppable: isDisabled(disabled),
    }}>
      <CustomAlbumAddDialog />
    </Sortable>
  );
}

function CustomAlbumAddDialog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const addCustomAlbum = useAlbumsStore((state) => state.addCustomAlbum);
  function handleAddCustomAlbum(_album: CustomAlbumType) {
    addCustomAlbum(_album);
    setSearchQuery("");
    setOpen(false);
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={cn(
          "flex grow items-center justify-center box-border origin-center font-normal whitespace-nowrap w-32 h-32 aspect-square bg-neutral-950 text-neutral-500 font-code relative group cursor-pointer active:bg-neutral-900 hover:bg-neutral-900 outline-1 outline-neutral-800 data-[state=open]:bg-neutral-800",
        )}
      >
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center transition-colors gap-2 hover:text-green-700 group-active:text-green-500 group-active:hover:text-green-500 duration-150">
           <IconPlus className="size-6" />
          <div className="flex gap-1 items-center">
            <div>Add Album</div>
          </div>
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
  );
}
