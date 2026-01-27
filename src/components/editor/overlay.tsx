"use client";

import { DragOverlay } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { createPortal } from "react-dom";
import { GridContext } from "./context";
import { use } from "react";
import { Album } from "../album";

export default function Overlay() {
  const { activeAlbum } = use(GridContext);

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
        <Album album={activeAlbum} dragOverlay priority={true} />
      ) : null}
    </DragOverlay>,
    document.body
  );
}
