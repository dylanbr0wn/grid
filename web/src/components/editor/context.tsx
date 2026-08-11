'use client';
import {
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  ScreenReaderInstructions,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEffect, useId } from "react";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CustomAlbum, LastFmAlbum } from "@/lib/albums";
import { useAlbumsStore } from "@/lib/albums-store";

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable: `
    To pick up a sortable item, press the space bar.
    While sorting, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `,
};

export function EditorContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const id = useId();
  const rows = useAlbumsStore((s) => s.rows);
  const columns = useAlbumsStore((s) => s.columns);
  const { setActiveAlbum, updateDimensions, handleDragOver, handleDragEnd } = useAlbumsStore();

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // update dimensions on mount to ensure we have the correct number of placeholders, and to fix any potential issues with stale dimensions after hot reload
  useEffect(() => {
    updateDimensions(rows, columns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DndContext
      id={id}
      accessibility={{
        screenReaderInstructions,
      }}
      sensors={sensors}
      onDragStart={({ active }) => {
        if (!active.data.current) return;
        setActiveAlbum(active.data.current.album as LastFmAlbum | CustomAlbum);
      }}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragCancel={() => {
        setActiveAlbum(null);
        useAlbumsStore.setState({ overflowItem: null });
      }}
      modifiers={[restrictToWindowEdges]}
    >
      {children}
    </DndContext>
  );
}
