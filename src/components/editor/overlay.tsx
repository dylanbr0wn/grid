"use client";

import { DragOverlay } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { createPortal } from "react-dom";
import AlbumCover from "../album/album-cover";
import { cn } from "@/lib/util";
import { useGrid } from "@/hooks/grid";

export default function Overlay() {
  const { activeAlbum } = useGrid();

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <DragOverlay
      adjustScale={true}
      modifiers={[restrictToWindowEdges]}
      dropAnimation={{ duration: 0.1, easing: "ease-in" }}
    >
      {activeAlbum ? (
        <div className={cn("z-50 opacity-100 scale-105 cursor-grabbing")}>
          <AlbumCover
            id={`${activeAlbum.id}-drag-overlay`}
            src={activeAlbum.img}
            imgs={activeAlbum.imgs}
            name={activeAlbum.album}
            artist={activeAlbum.artist}
            width={128}
            height={128}
            priority={true}
            textBackground={activeAlbum.textBackground}
            textColor={activeAlbum.textColor}
          />
        </div>
      ) : null}
    </DragOverlay>,
    document.body,
  );
}
