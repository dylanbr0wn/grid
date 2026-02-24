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
import {  useCallback, useEffect, useId, useRef, useState } from "react";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { generateId } from "@/lib/util";
import { AlbumTypes, CustomAlbum, LastFmAlbum, PlaceholderAlbum, } from "@/lib/albums";
import { useGridRows, useGridColumns } from "@/hooks/grid";
import { ContainerMap, GridContext, SetAlbumFunc } from "@/context/grid";








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



const PLACEHOLDER_ID = "placeholder";

export function newPlaceholderAlbum(): PlaceholderAlbum {
  return {
    id: `${PLACEHOLDER_ID}_${generateId()}`,
    type: "placeholder",
  };
}

function newCustomAlbum(): CustomAlbum {
  return {
    id: `custom_${generateId()}`,
    type: "custom",
  };
}

export function isPlaceholderId(id: UniqueIdentifier) {
  return typeof id === "string" && id.startsWith(PLACEHOLDER_ID);
}

export function EditorContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const id = useId();
  const { rows, setRows } = useGridRows();
  const { columns, setColumns } = useGridColumns();
  const [albums, setAlbums] = useState<ContainerMap>({
    grid: {
      title: "Grid",
      allowedTypes: ["placeholder", "lastfm", "custom"],
      maxLength: rows * columns,
      minLength: rows * columns,
      albums: Array.from({ length: rows * columns }).map(() => {
        return newPlaceholderAlbum();
      }),
    },
    custom: {
      title: "Custom Albums",
      allowedTypes: ["custom"],
      albums: [newCustomAlbum()],
    },
    lastfm: {
      title: "Last.fm",
      allowedTypes: ["lastfm"],
      albums: []
    },
  });
  const [activeAlbum, setActiveAlbum] = useState<LastFmAlbum | null>(null);
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
        !overItems.allowedTypes.includes(
          active.data.current?.album.type as AlbumTypes
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
  }, []);

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

      return {
        ...albums,
        [overContainer]: {
          ...albums[overContainer],
          albums: newAlbums,
        },
      };
    });
  }, []);

  const setAlbum = useCallback<SetAlbumFunc>((id, album) => {
    setAlbums((albums) => {
      const container = Object.keys(albums).find((key) =>
        albums[key].albums.some((a) => a.id === id)
      );
      if (!container) return albums;

      const newItems = albums[container].albums.map((item) =>
        item.id === id
          ? typeof album === "function"
            ? album(item as LastFmAlbum)
            : album
          : item
      );

      return {
        ...albums,
        [container]: {
          ...albums[container],
          albums: newItems,
        },
      };
    });
  }, []);

  const setTextColor = useCallback((id: UniqueIdentifier, color: string) => {

    setAlbums((albums) => {
      const container = Object.keys(albums).find((key) =>
        albums[key].albums.some((a) => a.id === id)
      );
      if (!container) return albums;

      const itemIndex = albums[container].albums.findIndex((a) => a.id === id);
      if (itemIndex === -1) return albums;
      const newItems = albums[container].albums.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              textColor: color,
            }
          : item
      );

      return {
        ...albums,
        [container]: {
          ...albums[container],
          albums: newItems,
        },
      };
    });
  }, []);

  const setTextBackground = useCallback(
    (id: UniqueIdentifier, background: boolean) => {
      setAlbums((albums) => {
        const container = Object.keys(albums).find((key) =>
          albums[key].albums.some((a) => a.id === id)
        );
        if (!container) return albums;

        const itemIndex = albums[container].albums.findIndex(
          (a) => a.id === id
        );
        if (itemIndex === -1) return albums;

        const newItems = albums[container].albums.map((item, i) =>
          i === itemIndex
            ? {
                ...item,
                textBackground: background,
              }
            : item
        );

        return {
          ...albums,
          [container]: {
            ...albums[container],
            albums: newItems,
          },
        };
      });
    },
    []
  );

  function addCustomAlbum(album: CustomAlbum) {
    setAlbums((albums) => {
      const customContainer = albums["custom"];
      return {
        ...albums,
        custom: {
          ...customContainer,
          albums: [
            ...customContainer.albums.slice(0, customContainer.albums.length - 1),
            album,
            ...customContainer.albums.slice(customContainer.albums.length - 1),
          ],
        },
      };
    });
  }

   function updateDimensions(rows: number, columns: number) {
      setAlbums((albums) => {
        const grid = albums["grid"];
        const newGridAlbums = [...grid.albums];

        if (rows * columns > grid.albums.length) {
          newGridAlbums.push(
            ...new Array(rows * columns - grid.albums.length).fill(0).map(() => {
              return newPlaceholderAlbum();
            })
          );
        } else if (rows * columns < grid.albums.length) {
          newGridAlbums.splice(rows * columns, grid.albums.length - rows * columns);
        }

        return {
          ...albums,
          grid: {
            ...grid,
            albums: newGridAlbums,
          },
        };
      });
    }

  function updateColumns(columns: number) {
    setColumns(columns);
    updateDimensions(rows, columns);
  }

  function updateRows(rows: number) {
    setRows(rows);
    updateDimensions(rows, columns);
  }



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateDimensions(rows, columns);
  }, [rows, columns]);

  return (
    <GridContext.Provider
      value={{
        setTextColor,
        setTextBackground,
        setAlbum,
        albums,
        setAlbums,
        activeAlbum,
        addCustomAlbum,
        rows,
        columns,
        setColumns: updateColumns,
        setRows: updateRows
      }}
    >
      <DndContext
        id={id}
        accessibility={{
          screenReaderInstructions,
        }}
        sensors={sensors}
        onDragStart={({ active }) => {
          if (!active.data.current) return;
          setActiveAlbum(active.data.current.album as LastFmAlbum);
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
    </GridContext.Provider>
  );
}
