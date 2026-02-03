"use client";

import { useState } from "react";
import * as htmlToImage from "html-to-image";
import NumberInput from "@/components/number-input";
import { useGridSize } from "@/lib/grid";
import { cn } from "@/lib/util";
import * as motion from "motion/react-client";
import { newPlaceholderAlbum, useGrid } from "./context";
import { Album } from "../album";
import { CustomAlbum } from "./custom";
import { IconLayoutGridAdd, IconX } from "@tabler/icons-react";

async function downloadGrid(columns: number, rows: number) {
  const node = document.getElementById("fm-grid");
  const dpr = window.devicePixelRatio;
  if (!node) return;
  const dataUrl = await htmlToImage.toJpeg(node, {
    canvasHeight: (rows * 128 * 2) / dpr,
    canvasWidth: (columns * 128 * 2) / dpr,
    backgroundColor: "#000000",
    imagePlaceholder: "/placeholder.png",
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

export default function Toolbar() {
  const { rows, setRows, columns, setColumns } = useGridSize();

  const [loading, setLoading] = useState(false);

  const { setAlbums } = useGrid()

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
    setAlbums(albums => {
      const totalCount = rows * columns;
      let current = albums['grid'].albums.filter(a => a.type !== 'placeholder');
      const toAdd = totalCount - current.length;

      if (toAdd <= 0) {
        return {
          ...albums,
          grid: {
            ...albums.grid,
            albums: current.slice(0, totalCount)
          }
        }
      }
      // take from custom albums, except the last entry which is the "add more" placeholder
      const lastIndex = albums['custom']?.albums.length - 1 || 0;
      const customAlbums = albums['custom']?.albums.slice(0, -1) || [];
      const albumsToAdd = customAlbums.slice(0, toAdd) as (Album | CustomAlbum)[]

      current = [...current, ...albumsToAdd];

      if (current.length >= totalCount) {
        return {
          ...albums,
          custom: {
            ...albums.custom,
            albums: [
              ...customAlbums.slice(albumsToAdd.length),
              albums['custom'].albums[lastIndex]
            ]
          },
          grid: {
            ...albums.grid,
            albums: current.slice(0, totalCount)
          }
        }
      }

      // if still not enough, fill from lastfm albums
      const lastfmAlbums = albums['lastfm']?.albums || [];
      const stillToAdd = totalCount - current.length;
      const lastfmToAdd = lastfmAlbums.slice(0, stillToAdd) as (Album | CustomAlbum)[];

      current = [...current, ...lastfmToAdd];

      return {
        ...albums,
        custom: {
          ...albums.custom,
          albums: [
            ...customAlbums.slice(albumsToAdd.length),
            albums['custom'].albums[lastIndex]
          ]
        },
        lastfm: {
          ...albums.lastfm,
          albums: lastfmAlbums.slice(lastfmToAdd.length)
        },
        grid: {
          ...albums.grid,
          albums: current
        }
      };

    })
  }

  function handleClear() {
    setAlbums(albums => {
      let customAlbums = albums['custom']?.albums || [];
      const customAlbumsFromGrid = albums['grid'].albums.filter(a => a.type === 'custom');
      customAlbums = [...customAlbumsFromGrid, ...customAlbums];

      const lastfmAlbumsFromGrid = albums['grid'].albums.filter(a => a.type === 'lastfm');
      let lastfmAlbums = albums['lastfm']?.albums || [];
      lastfmAlbums = [...lastfmAlbumsFromGrid, ...lastfmAlbums];

      const emptyGridAlbums = Array(rows * columns).fill(null).map(() => newPlaceholderAlbum());

      return {
        ...albums,
        custom: {
          ...albums.custom,
          albums: customAlbums
        },
        lastfm: {
          ...albums.lastfm,
          albums: lastfmAlbums
        },
        grid: {
          ...albums.grid,
          albums: emptyGridAlbums
        }
      };
    })
  }

  return (
    <div className="flex h-20 w-full shrink-0 items-center p-5 gap-5 border-t border-neutral-800 bg-neutral-950 z-20">
      <div className="w-1/3 flex gap-3 items-center">
        <button
          className="p-2 text-base text-neutral-300 text-center bg-neutral-950 hover:bg-neutral-900 relative group flex justify-between items-center gap-3 whitespace-nowrap"
          onClick={handleAutoLoad}
        >
          <IconLayoutGridAdd className="size-4" />
          <span>Auto Fill Grid</span>
          <motion.div
            className={cn(
              "absolute right-0 left-0 bottom-0 h-px bg-neutral-400 group-focus-within:h-0.5 group-focus-within:z-1 transition-colors group-focus:bg-white group-focus:h-0.75"
            )}
            layout
            transition={{
              duration: 0.15,
            }}
          />
        </button>
        <button
          className="p-2 text-base text-rose-700 text-center bg-neutral-950 hover:bg-neutral-900 relative group flex justify-between items-center gap-3 whitespace-nowrap"
          onClick={handleClear}
        >
          <IconX className="size-4" />
          <span>Clear Grid</span>
          <motion.div
            className={cn(
              "absolute right-0 left-0 bottom-0 h-px bg-rose-700 group-focus-within:h-0.5 group-focus-within:z-1 transition-colors group-focus:h-0.75"
            )}
            layout
            transition={{
              duration: 0.15,
            }}
          />
        </button>
      </div>
      <div className="w-1/3 flex items-center justify-center gap-1">
        <NumberInput
          required
          leftIcon={<div className="text-neutral-500">X</div>}
          min={1}
          max={10}
          value={rows}
          onChange={cleanAndSetRows}
        />
        <NumberInput
          required
          leftIcon={<div className="text-neutral-500">Y</div>}
          min={1}
          max={10}
          value={columns}
          onChange={cleanAndSetCols}
        />
      </div>
      <div className="w-1/3 flex items-center justify-end">
        <button
          disabled={loading}
          onClick={download}
          className=" border border-gray-200 p-2 w-32 text-base text-neutral-300 disabled:opacity-50 bg-neutral-950 hover:bg-neutral-900 data-[loading=true]:cursor-wait data-[loading=true]:bg-neutral-900"
          data-loading={loading}
        >
          {loading ? "Loading..." : "Download"}
        </button>
      </div>
    </div>
  );
}
