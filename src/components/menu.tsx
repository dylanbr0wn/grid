"use client";

import { useState } from "react";
import * as htmlToImage from "html-to-image";
import NumberInput from "@/components/number-input";
import { useGridSize } from "@/lib/grid";
import { cn, PLACEHOLDER_IMG } from "@/lib/util";
import * as motion from "motion/react-client";
import { newPlaceholderAlbum, useGrid } from "./editor/context";
import { Album } from "./album";
import { CustomAlbum } from "./editor/custom";
import { IconDownload, IconLayoutGridAdd, IconX } from "@tabler/icons-react";
import Image from "next/image";

async function downloadGrid(columns: number, rows: number) {
  const node = document.getElementById("fm-grid");
  const dpr = window.devicePixelRatio;
  if (!node) return;
  const dataUrl = await htmlToImage.toJpeg(node, {
    canvasHeight: (rows * 128 * 2) / dpr,
    canvasWidth: (columns * 128 * 2) / dpr,
    backgroundColor: "#000000",
    imagePlaceholder: PLACEHOLDER_IMG,
    quality: 1,
    type: "image/jpeg",
    includeQueryParams: true,
    filter: (node) => {
      return !(node as HTMLElement).classList?.contains("no-export");
    },
  });
  const date = new Date();
  const link = document.createElement("a");
  link.download = `grid_${date.getDate().toString().padStart(2, "0")}${date
    .getMonth()
    .toString()
    .padStart(2, "0")}${date.getFullYear()}_${date
    .getHours()
    .toString()
    .padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}.jpeg`;
  link.href = dataUrl;
  link.click(); // Triggers the download
  link.remove();
}

export default function Menu() {
  const [loading, setLoading] = useState(false);

  const { setAlbums, albums, rows, columns, setColumns, setRows } = useGrid();

  async function download() {
    if (!columns || !rows) return;
    setLoading(true);
    try {
      await downloadGrid(columns, rows);
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  function handleAutoLoad() {
    setAlbums((albums) => {
      const totalCount = rows * columns;
      let current = albums["grid"].albums.filter(
        (a) => a.type !== "placeholder"
      );
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
        | Album
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
        | Album
        | CustomAlbum
      )[];

      current = [...current, ...lastfmToAdd];

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
        (a) => a.type === "custom"
      );
      customAlbums = [...customAlbumsFromGrid, ...customAlbums];

      const lastfmAlbumsFromGrid = albums["grid"].albums.filter(
        (a) => a.type === "lastfm"
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
    (a) => a.type === "placeholder"
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
    <div className="relative shrink-0">
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
              gridIsEmpty && "opacity-50 pointer-events-none"
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
            disabled={loading}
            onClick={download}
            className=" border-l border-transparent hover:border-white p-1 text-base text-neutral-300 disabled:opacity-50 hover:bg-neutral-900 data-[loading=true]:cursor-wait data-[loading=true]:bg-neutral-900 flex items-center gap-2"
            data-loading={loading}
          >
            <IconDownload className="size-4" />
            <span>{loading ? "Loading..." : "Download .PNG"}</span>
          </button>
        </div>
      </div>
    </div>
    // <div className="flex flex-col w-96 h-full shrink-0 items-center p-5 gap-5 border-t border-neutral-800 bg-neutral-950 z-20">
    //   <button
    //       className="p-2 text-base text-neutral-300 text-center bg-neutral-950 hover:bg-neutral-900 relative group flex justify-between items-center gap-3 whitespace-nowrap"
    //       onClick={handleAutoLoad}
    //     >
    //       <IconLayoutGridAdd className="size-4" />
    //       <span>Auto Fill Grid</span>
    //       <motion.div
    //         className={cn(
    //           "absolute right-0 left-0 bottom-0 h-px bg-neutral-400 group-focus-within:h-0.5 group-focus-within:z-1 transition-colors group-focus:bg-white group-focus:h-0.75"
    //         )}
    //         layout
    //         transition={{
    //           duration: 0.15,
    //         }}
    //       />
    //     </button>
    //     <button
    //       className={
    //         cn(
    //           "p-2 text-base text-rose-700 text-center bg-neutral-950 hover:bg-neutral-900 relative group flex justify-between items-center gap-3 whitespace-nowrap",
    //           gridIsEmpty && "opacity-50 pointer-events-none"
    //         )
    //       }
    //       onClick={handleClear}
    //       disabled={gridIsEmpty}
    //     >
    //       <IconX className="size-4" />
    //       <span>Clear Grid</span>
    //       <motion.div
    //         className={cn(
    //           "absolute right-0 left-0 bottom-0 h-px bg-rose-700 group-focus-within:h-0.5 group-focus-within:z-1 transition-colors group-focus:h-0.75"
    //         )}
    //         layout
    //         transition={{
    //           duration: 0.15,
    //         }}
    //       />
    //     </button>
    //   <div className="w-1/3 flex items-center justify-end">
    //     <button
    //       disabled={loading}
    //       onClick={download}
    //       className=" border border-gray-200 p-2 w-32 text-base text-neutral-300 disabled:opacity-50 bg-neutral-950 hover:bg-neutral-900 data-[loading=true]:cursor-wait data-[loading=true]:bg-neutral-900"
    //       data-loading={loading}
    //     >
    //       {loading ? "Loading..." : "Download"}
    //     </button>
    //   </div>
    // </div>
  );
}
