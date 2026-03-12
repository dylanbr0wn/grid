"use client";

import { useState } from "react";
import NumberInput from "@/components/number-input";
import { cn } from "@/lib/util";
import {
  IconCopy,
  IconDownload,
  IconLayoutGridAdd,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import {
  CustomAddAlbum,
  CustomAlbum,
  LastFmAlbum,
  newPlaceholderAlbum,
  PlaceholderAlbum,
} from "@/lib/albums";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-client";
import { gridToBlob, gridToJpeg, gridToPng } from "@/lib/export";
import { useAlbumsStore } from "@/lib/albums-store";

async function downloadGrid(
  columns: number,
  rows: number,
  format: "jpeg" | "png" = "jpeg",
) {
  const node = document.getElementById("fm-grid");
  const dpr = window.devicePixelRatio;
  if (!node) return;
  let dataUrl: string;
  if (format === "jpeg") {
    dataUrl = await gridToJpeg(
      node,
      columns * 128 * dpr + 16,
      rows * 128 * dpr + 16,
    );
  } else {
    dataUrl = await gridToPng(
      node,
      columns * 128 * dpr + 16,
      rows * 128 * dpr + 16,
    );
  }
  const date = new Date();
  const link = document.createElement("a");
  link.download = `grid_${date.getDate().toString().padStart(2, "0")}${(
    date.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}${date.getFullYear()}_${date
    .getHours()
    .toString()
    .padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}.${format}`;
  link.href = dataUrl;
  link.click(); // Triggers the download
  link.remove();
}

export default function Menu() {
  const [loading, setLoading] = useState({
    jpeg: false,
    png: false,
    copy: false,
  });

  const albums = useAlbumsStore((state) => state.albums);
  const setAlbums = useAlbumsStore((state) => state.setAlbums);
  const columns = useAlbumsStore((state) => state.columns);
  const setColumns = useAlbumsStore((state) => state.setColumns);
  const rows = useAlbumsStore((state) => state.rows);
  const setRows = useAlbumsStore((state) => state.setRows);

  async function download(type: "jpeg" | "png" = "jpeg") {
    if (!columns || !rows) return;
    setLoading((prev) => ({ ...prev, [type]: true }));
    try {
      await downloadGrid(columns, rows, type);
    } catch (e) {
      console.error(e);
    }

    setLoading((prev) => ({ ...prev, [type]: false }));
  }

  async function copyToClipboard() {
    if (!columns || !rows) return;
    setLoading((prev) => ({ ...prev, copy: true }));
    try {
      const node = document.getElementById("fm-grid");
      const dpr = window.devicePixelRatio;
      if (!node) return;
      const blob = await gridToBlob(
        node,
        columns * 128 * dpr + 16,
        rows * 128 * dpr + 16,
      );
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
      } else {
        console.error("Failed to generate image blob for clipboard.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading((prev) => ({ ...prev, copy: false }));
    }
  }

  function handleAutoLoad() {
    setAlbums((albums) => {
      const totalCount = rows * columns;
      let current: (CustomAlbum | LastFmAlbum | PlaceholderAlbum | CustomAddAlbum)[] = albums[
        "grid"
      ].albums.filter((a) => a.type !== "placeholder");
      const toAdd = totalCount - current.length;

      if (toAdd <= 0) {
        return {
          ...albums,
          grid: {
            ...albums.grid,
            albums: current.slice(0, totalCount),
          },
        };
      }
      // take from custom albums, except the last entry which is the "add more" placeholder
      const lastIndex = albums["custom"]?.albums.length - 1 || 0;
      const customAlbums = albums["custom"]?.albums.slice(0, -1) || [];
      const albumsToAdd = customAlbums.slice(0, toAdd) as (
        | LastFmAlbum
        | CustomAlbum
      )[];

      current = [...current, ...albumsToAdd];

      if (current.length >= totalCount) {
        return {
          ...albums,
          custom: {
            ...albums.custom,
            albums: [
              ...customAlbums.slice(albumsToAdd.length),
              albums["custom"].albums[lastIndex],
            ],
          },
          grid: {
            ...albums.grid,
            albums: current.slice(0, totalCount),
          },
        };
      }

      // if still not enough, fill from lastfm albums
      const lastfmAlbums = albums["lastfm"]?.albums || [];
      const stillToAdd = totalCount - current.length;
      const lastfmToAdd = lastfmAlbums.slice(0, stillToAdd) as (
        | LastFmAlbum
        | CustomAlbum
      )[];

      current = [...current, ...lastfmToAdd];

      if (current.length < totalCount) {
        // if still not enough, fill the rest with placeholders
        const emptySlots = totalCount - current.length;
        const placeholders = Array(emptySlots)
          .fill(null)
          .map(() => newPlaceholderAlbum());
        current = [...current, ...placeholders];
      }

      return {
        ...albums,
        custom: {
          ...albums.custom,
          albums: [
            ...customAlbums.slice(albumsToAdd.length),
            albums["custom"].albums[lastIndex],
          ],
        },
        lastfm: {
          ...albums.lastfm,
          albums: lastfmAlbums.slice(lastfmToAdd.length),
        },
        grid: {
          ...albums.grid,
          albums: current,
        },
      };
    });
  }

  function handleClear() {
    setAlbums((albums) => {
      let customAlbums = albums["custom"]?.albums || [];
      const customAlbumsFromGrid = albums["grid"].albums.filter(
        (a) => a.type === "custom",
      );
      customAlbums = [...customAlbumsFromGrid, ...customAlbums];

      const lastfmAlbumsFromGrid = albums["grid"].albums.filter(
        (a) => a.type === "lastfm",
      );
      let lastfmAlbums = albums["lastfm"]?.albums || [];
      lastfmAlbums = [...lastfmAlbumsFromGrid, ...lastfmAlbums];

      const emptyGridAlbums = Array(rows * columns)
        .fill(null)
        .map(() => newPlaceholderAlbum());

      return {
        ...albums,
        custom: {
          ...albums.custom,
          albums: customAlbums,
        },
        lastfm: {
          ...albums.lastfm,
          albums: lastfmAlbums,
        },
        grid: {
          ...albums.grid,
          albums: emptyGridAlbums,
        },
      };
    });
  }

  const gridIsEmpty = albums["grid"].albums.every(
    (a) => a.type === "placeholder",
  );

  const anyAvailableAlbums =
    (albums["custom"]?.albums.length || 0) -
      1 +
      (albums["lastfm"]?.albums.length || 0) >
    0;

  function cleanAndSetRows(value: number | null) {
    if (value === null) return;
    if (value < 1) value = 1;
    if (value > 10) value = 10;
    setRows(value);
  }
  function cleanAndSetCols(value: number | null) {
    if (value === null) return;
    if (value < 1) value = 1;
    if (value > 10) value = 10;
    setColumns(value);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="relative shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex flex-col -translate-x-px w-50 h-full">
          <div className="flex flex-col justify-center h-full">
            <div className="items-center gap-2 p-1 flex">
              <Image
                alt="Grid Logo"
                src="/img/logo.png"
                width={20}
                height={20}
                className="shrink-0 w-5 h-5 block"
              />
              <span className="font-medium font-mono text-lg tracking-widest">
                GRID
              </span>
            </div>
            <div className="p-1 mt-3 text-neutral-500 border-b border-neutral-800 text-sm lowercase">
              quick actions
            </div>
            <button
              disabled={!anyAvailableAlbums}
              onClick={handleAutoLoad}
              className="hover:border-white border-l border-transparent p-1 transition-colors flex items-center gap-2 hover:bg-neutral-900 disabled:opacity-50 disabled:pointer-events-none"
            >
              <IconLayoutGridAdd className="size-4" />
              <span>Auto fill grid</span>
            </button>
            <button
              className={cn(
                "p-1 text-base text-rose-600 text-center hover:bg-neutral-900 relative group flex items-center gap-2 whitespace-nowrap border-l border-transparent hover:border-rose-600 transition-colors",
                gridIsEmpty && "opacity-50 pointer-events-none",
              )}
              onClick={handleClear}
              disabled={gridIsEmpty}
            >
              <IconX className="size-4" />
              <span>Clear Grid</span>
            </button>
            <div className="p-1 mt-3 text-neutral-500 border-b border-neutral-800 text-sm lowercase">
              Layout
            </div>
            <div className="group flex items-center border-l border-transparent hover:border-white transition-colors focus-within:border-white">
              <NumberInput
                required
                placeholder="columns"
                leftIcon={<div className="text-neutral-500">X</div>}
                min={1}
                max={10}
                value={columns}
                onChange={cleanAndSetCols}
              />
              <NumberInput
                required
                placeholder="rows"
                leftIcon={<div className="text-neutral-500">Y</div>}
                min={1}
                max={10}
                value={rows}
                onChange={cleanAndSetRows}
              />
            </div>
            <div className="p-1 mt-3 text-neutral-500 border-b border-neutral-800 text-sm lowercase">
              Export
            </div>
            <button
              disabled={loading.jpeg}
              onClick={() => download("jpeg")}
              className=" border-l border-transparent hover:border-white p-1 text-base text-neutral-300 disabled:opacity-50 hover:bg-neutral-900 data-[loading=true]:cursor-wait data-[loading=true]:bg-neutral-900 flex items-center gap-2"
              data-loading={loading.jpeg}
            >
              <IconDownload className="size-4" />
              <span>{loading.jpeg ? "Loading..." : ".JPEG"}</span>
            </button>
            <button
              disabled={loading.png}
              onClick={() => download("png")}
              className=" border-l border-transparent hover:border-white p-1 text-base text-neutral-300 disabled:opacity-50 hover:bg-neutral-900 data-[loading=true]:cursor-wait data-[loading=true]:bg-neutral-900 flex items-center gap-2"
              data-loading={loading.png}
            >
              <IconDownload className="size-4" />
              <span>{loading.png ? "Loading..." : ".PNG"}</span>
            </button>
            <button
              disabled={loading.copy}
              onClick={copyToClipboard}
              className=" border-l border-transparent hover:border-white p-1 text-base text-neutral-300 disabled:opacity-50 hover:bg-neutral-900 data-[loading=true]:cursor-wait data-[loading=true]:bg-neutral-900 flex items-center gap-2"
              data-loading={loading.copy}
            >
              <IconCopy className="size-4" />
              <span>{loading.copy ? "Loading..." : "Copy to Clipboard"}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
