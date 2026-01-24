"use client";
import "client-only";
import { ScrollArea } from "@base-ui-components/react/scroll-area";

import React, {
  createContext,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  DragOverlay,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  ScreenReaderInstructions,
  TouchSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
  MeasuringStrategy,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  arraySwap,
  SortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import {
  Album,
  AlbumTypes,
  CustomAlbum,
  PlaceholderAlbum,
  SortableAlbum,
} from "./album";
import { useGridSize } from "@/lib/grid";
import { cn } from "@/lib/util";
import AlbumPallete from "./lastfm";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable: `
    To pick up a sortable item, press the space bar.
    While sorting, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `,
};

const TRASH_ID = "void";
const PLACEHOLDER_ID = "placeholder";

function newPlaceholderAlbum(): PlaceholderAlbum {
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

function isPlaceholderId(id: UniqueIdentifier) {
  return typeof id === "string" && id.startsWith(PLACEHOLDER_ID);
}

function findContainer(id: UniqueIdentifier, containers: ContainerMap) {
  if (id in containers) {
    return id;
  }

  return Object.keys(containers).find((key) =>
    containers[key].albums.some((a) => a.id === id),
  );
}

export type Container = {
  title: string;
  albums: (PlaceholderAlbum | Album | CustomAlbum)[];
  allowedTypes: AlbumTypes[];
  maxLength?: number;
  minLength?: number;
};

type ContainerMap = Record<UniqueIdentifier, Container>;

type SetAlbumFunc = (
    id: UniqueIdentifier,
    album: Album | ((album: Album) => Album),
  ) => void
type GridContextType = {
  setTextBackground: (id: UniqueIdentifier, background: boolean) => void;
  setTextColor: (id: UniqueIdentifier, color: string) => void;
  setAlbum: SetAlbumFunc;
};

const GridContext = createContext<GridContextType>({
  setTextBackground: () => {},
  setTextColor: () => {},
  setAlbum: () => {},
});

type GridProps = {
  albums: Album[];
};

export default function Grid({ albums: initialAlbums }: GridProps) {
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const overflowItem = useRef<Album | PlaceholderAlbum | CustomAlbum | null>(
    null,
  );
  const { rows, columns } = useGridSize();
  // const { sort, setSort } = useSort();
  const id = useId();

  const [albums, setAlbums] = useState<ContainerMap>({
    grid: {
      title: "Grid",
      allowedTypes: ["placeholder", "lastfm", "custom"],
      maxLength: rows * columns,
      minLength: rows * columns,
      albums: new Array(rows * columns).fill(0).map(() => {
        return newPlaceholderAlbum();
      }),
    },
    custom: {
      title: "Custom",
      allowedTypes: ["custom"],
      albums: new Array(3).fill(0).map(() => {
        return newCustomAlbum();
      }),
    },
    lastfm: {
      title: "Last.fm",
      allowedTypes: ["lastfm"],
      albums: initialAlbums,
    },
  });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const setTextColor = useCallback((id: UniqueIdentifier, color: string) => {
    setAlbums((albums) => {
      const container = Object.keys(albums).find((key) =>
        albums[key].albums.some((a) => a.id === id),
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
          : item,
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
          albums[key].albums.some((a) => a.id === id),
        );
        if (!container) return albums;

        const itemIndex = albums[container].albums.findIndex(
          (a) => a.id === id,
        );
        if (itemIndex === -1) return albums;

        const newItems = albums[container].albums.map((item, i) =>
          i === itemIndex
            ? {
                ...item,
                textBackground: background,
              }
            : item,
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
    [],
  );

  // const updateSort = useCallback(
  // 	(newSort: SortType) => {
  // 		setSort(newSort)
  // 		setAlbums((albums) => sortAlbums(albums ?? [], newSort))
  // 	},
  // 	[setSort]
  // )

  const gridSortingStrategy = useCallback<SortingStrategy>(
    ({ rects, activeIndex, overIndex, index }) => {
      const overItem = albums["grid"].albums[overIndex];

      let newRects = arrayMove(rects, overIndex, activeIndex);
      if (isPlaceholderId(overItem.id)) {
        newRects = arraySwap(rects, overIndex, activeIndex);
      }

      const oldRect = rects[index];
      const newRect = newRects[index];

      if (!newRect || !oldRect) {
        return null;
      }

      return {
        x: newRect.left - oldRect.left,
        y: newRect.top - oldRect.top,
        scaleX: newRect.width / oldRect.width,
        scaleY: newRect.height / oldRect.height,
      };
    },
    [albums],
  );

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    const overId = over?.id;

    if (overId == null || overId === TRASH_ID) {
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
        (a) => a.id === active.id,
      );

      // If the type is not allowed in the over container, do nothing, it doesnt belong here
      if (
        !overItems.allowedTypes.includes(
          active.data.current?.album.type as AlbumTypes,
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
        (item) => item.id !== active.id,
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
            (item) => item.id !== itemToReturn.id,
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
              overItems.maxLength ? overItems.maxLength - 1 : undefined,
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
          active.data.current?.album.type as AlbumTypes,
        )
      ) {
        return albums;
      }

      const activeIndex = albums[activeContainer].albums.findIndex(
        (a) => active.id === a.id,
      );
      const overIndex = albums[overContainer].albums.findIndex(
        (a) => overId === a.id,
      );
      if (activeIndex === overIndex) {
        return albums;
      }

      let newAlbums = arrayMove(
        albums[overContainer].albums,
        activeIndex,
        overIndex,
      );
      if (isPlaceholderId(overId)) {
        newAlbums = arraySwap(
          albums[overContainer].albums,
          activeIndex,
          overIndex,
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
        albums[key].albums.some((a) => a.id === id),
      );
      if (!container) return albums;


      const newItems = albums[container].albums.map((item) =>
        item.id === id
          ? typeof album === "function"
            ? album(item as Album)
            : album
          : item,
      );

      return {
        ...albums,
        [container]: {
          ...albums[container],
          albums: newItems,
        },
      };
    })
  }, [])

  if (!albums) return null;
  if (!columns || !rows) return null;

  return (
    <GridContext.Provider value={{
      setTextColor,
      setTextBackground,
      setAlbum
    }}>
      <DndContext
        id={id}
        accessibility={{
          screenReaderInstructions,
        }}
        sensors={sensors}
        onDragStart={({ active }) => {
          if (!active.data.current) return;
          setActiveAlbum(active.data.current.album as Album);
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
        <div className="h-full flex w-screen relative">
          <div className="shrink-0 flex flex-col h-full overflow-hidden border-neutral-800 border-r">
            {Object.keys(albums).map((containerKey) => {
              if (containerKey === "grid") return null;
              const container = albums[containerKey];
              return (
                <AlbumPallete title={container.title} key={containerKey}>
                  <SortableContext
                    id={containerKey}
                    items={container.albums}
                    strategy={rectSortingStrategy}
                  >
                    {container.albums.map((album, index) => (
                      <SortableAlbum
                        key={album.id}
                        album={album}
                        index={container.albums.length + index}
                        setTextBackground={setTextBackground}
                        setTextColor={setTextColor}
                      />
                    ))}
                  </SortableContext>
                </AlbumPallete>
              );
            })}
          </div>
          <div className="w-full h-full">
            <ScrollArea.Root
              className="h-[calc(100%-80px)] relative"
              style={
                {
                  "--col-count": columns,
                } as React.CSSProperties
              }
            >
              <ScrollArea.Viewport className="h-full flex justify-center items-center-safe">
                <SortableContext
                  id="grid"
                  items={albums["grid"].albums}
                  strategy={gridSortingStrategy}
                >
                  <div
                    id="fm-grid"
                    className={
                      "shrink-0 grid h-full relative select-none outline outline-neutral-800 -outline-offset-1 place-items-center"
                    }
                    style={
                      {
                        width: columns * 128,
                        height: rows * 128,
                      } as React.CSSProperties
                    }
                  >
                    <BackgroundGrid rows={rows} columns={columns} />
                    <div className="grid grid-cols-[repeat(var(--col-count),1fr)] auto-rows-min h-full col-span-full row-span-full">
                      {albums["grid"].albums.map((album, index) => (
                        <SortableAlbum
                          key={album.id}
                          album={album}
                          index={index}
                          disabled={isPlaceholderId(album.id)}
                          setTextBackground={setTextBackground}
                          setTextColor={setTextColor}
                          priority={true}
                        />
                      ))}
                    </div>
                  </div>
                </SortableContext>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
                <ScrollArea.Thumb className="w-full bg-neutral-500" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
          {typeof document !== "undefined"
            ? createPortal(
                <DragOverlay
                  adjustScale={true}
                  modifiers={[restrictToWindowEdges]}
                  dropAnimation={{ duration: 0.1, easing: "ease-in" }}
                >
                  {activeAlbum ? (
                    <Album album={activeAlbum} dragOverlay priority={true} />
                  ) : null}
                </DragOverlay>,
                document.body,
              )
            : null}
        </div>
      </DndContext>
    </GridContext.Provider>
  );
}

type BackgroundGridProps = {
  rows: number;
  columns: number;
};

const BackgroundGrid = React.memo(function BackgroundGrid({
  rows,
  columns,
}: BackgroundGridProps) {
  const albums = new Array(rows * columns).fill(0);
  return (
    <div
      className={
        "shrink-0 col-span-full row-span-full grid grid-cols-[repeat(var(--col-count),1fr)] auto-rows-min h-full -z-1 pointer-events-none select-none overflow-hidden"
      }
      style={
        {
          width: columns * 128,
          height: rows * 128,
        } as React.CSSProperties
      }
    >
      {albums.map((_, index) => {
        return (
          <div
            key={index}
            className={cn(
              "w-32 h-32 bg-neutral-950 -z-1 border-neutral-800 -translate-x-[0.5px] -translate-y-[0.5px]",
              index % columns > 0 && "border-l",
              index >= columns && "border-t",
            )}
          />
        );
      })}
    </div>
  );
});
