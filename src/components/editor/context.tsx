'use client';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  ScreenReaderInstructions,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  arraySwap,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useCallback, useEffect, useId, useRef } from "react";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { AlbumTypes, CustomAlbum, LastFmAlbum, PlaceholderAlbum, isCustomAddId, isPlaceholderId, newPlaceholderAlbum } from "@/lib/albums";
import { ContainerMap, useAlbumsStore } from "@/lib/albums-store";
import { useGridStore } from "@/lib/grid-store";
import { CUSTOM_CONTAINER_KEY } from "@/lib/util";

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable: `
    To pick up a sortable item, press the space bar.
    While sorting, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `,
};

function findContainer(id: UniqueIdentifier, containers: ContainerMap) {
  if (id in containers) {
    return id;
  }

  return Object.keys(containers).find((key) =>
    containers[key].albums.some((a) => a.id === id)
  );
}


export function EditorContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const id = useId();
  const rows = useGridStore((s) => s.rows);
  const columns = useGridStore((s) => s.columns);
  const { setAlbums, setActiveAlbum, updateDimensions } = useAlbumsStore();
  const overflowItem = useRef<LastFmAlbum | PlaceholderAlbum | CustomAlbum | null>(
    null
  );

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    const overId = over?.id;

    if (overId == null) {
      return;
    }
    // Go into setAlbums to avoid closure issues
    setAlbums((albums) => {
      const overContainer = findContainer(overId, albums);
      const activeContainer = findContainer(active.id, albums);

      if (
        !activeContainer ||
        !overContainer ||
        activeContainer === overContainer
      ) {
        return albums;
      }
      const activeItems = albums[activeContainer];
      const overItems = albums[overContainer];
      const overIndex = overItems.albums.findIndex((a) => a.id === overId);
      const activeIndex = activeItems.albums.findIndex(
        (a) => a.id === active.id
      );

      // If the type is not allowed in the over container, do nothing, it doesnt belong here
      if (
        active.data.current?.album?.type &&
        !overItems.allowedTypes.includes(
          active.data.current.album.type as AlbumTypes
        )
      ) {
        return albums;
      }

      const isBelowOverItem =
        over &&
        active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height;

      const modifier = isBelowOverItem ? 1 : 0;

      const newIndex =
        overIndex >= 0 ? overIndex + modifier : overItems.albums.length - 1;

      let newActiveAlbums = activeItems.albums.filter(
        (item) => item.id !== active.id
      );
      let newOverAlbums = overItems.albums;

      const overMaxLength = albums[overContainer].maxLength;

      if (overMaxLength && overItems.albums.length >= overMaxLength) {
        // first see if we can just remove the next placeholder
        const placeholder = newOverAlbums
          .slice(newIndex, newOverAlbums.length - 1)
          .find((a) => isPlaceholderId(a.id));

        if (placeholder) {
          overflowItem.current = placeholder;
          newOverAlbums = newOverAlbums.filter((a) => a.id !== placeholder.id);
        } else {
          // Move the last item from grid to extras
          const itemToMove = newOverAlbums[overItems.albums.length - 1];

          overflowItem.current = itemToMove;
          if (!isPlaceholderId(itemToMove.id)) {
            newActiveAlbums = [itemToMove, ...newActiveAlbums];
          }
        }
      } else {
        // Add a placeholder to maintain min length
        // If we had previously moved an item to extras, and now have space, bring it back
        if (overflowItem.current) {
          const itemToReturn = overflowItem.current;
          overflowItem.current = null;
          newActiveAlbums = [
            ...newActiveAlbums.slice(0, activeIndex),
            itemToReturn,
            ...newActiveAlbums.slice(activeIndex),
          ];
          newOverAlbums = newOverAlbums.filter(
            (item) => item.id !== itemToReturn.id
          );
        }
        if (
          albums[activeContainer].minLength &&
          newActiveAlbums.length < albums[activeContainer].minLength!
        ) {
          newActiveAlbums.push(newPlaceholderAlbum());
        }
      }

      return {
        ...albums,
        [activeContainer]: {
          ...albums[activeContainer],
          albums: newActiveAlbums,
        },
        [overContainer]: {
          ...overItems,
          albums: [
            ...newOverAlbums.slice(0, newIndex),
            albums[activeContainer].albums[activeIndex],
            ...newOverAlbums.slice(
              newIndex,
              overItems.maxLength ? overItems.maxLength - 1 : undefined
            ),
          ],
        },
      };
    });
  }, [setAlbums]);

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    overflowItem.current = null;
    setActiveAlbum(null);

    const overId = over?.id;

    if (overId == null) {
      return;
    }
    // Go into setAlbums to avoid closure issues
    setAlbums((albums) => {
      const activeContainer = findContainer(active.id, albums);
      const overContainer = findContainer(overId, albums);

      if (!activeContainer || !overContainer) {
        return albums;
      }

      // If the type is not allowed in the over container, do nothing, it doesnt belong here
      if (
        !albums[overContainer].allowedTypes.includes(
          active.data.current?.album.type as AlbumTypes
        )
      ) {
        return albums;
      }

      const activeIndex = albums[activeContainer].albums.findIndex(
        (a) => active.id === a.id
      );
      const overIndex = albums[overContainer].albums.findIndex(
        (a) => overId === a.id
      );
      if (activeIndex === overIndex) {
        return albums;
      }

      let newAlbums = arrayMove(
        albums[overContainer].albums,
        activeIndex,
        overIndex
      );
      if (isPlaceholderId(overId)) {
        newAlbums = arraySwap(
          albums[overContainer].albums,
          activeIndex,
          overIndex
        );
      }

      if (overContainer === CUSTOM_CONTAINER_KEY) {
        // make sure the custom add album stays at the end
        const customAddIndex = newAlbums.findIndex((a) =>
          isCustomAddId(a.id)
        );
        if (customAddIndex !== -1 && customAddIndex !== newAlbums.length - 1) {
          const placeholder = newAlbums[customAddIndex];
          newAlbums.splice(customAddIndex, 1);
          newAlbums.push(placeholder);

        }
      }

      return {
        ...albums,
        [overContainer]: {
          ...albums[overContainer],
          albums: newAlbums,
        },
      };
    });
  }, [setActiveAlbum, setAlbums]);

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
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragCancel={() => setActiveAlbum(null)}
      modifiers={[restrictToWindowEdges]}
    >
      {children}
    </DndContext>
  );
}
