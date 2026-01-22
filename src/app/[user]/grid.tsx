"use client";
import "client-only";
import { ScrollArea } from "@base-ui-components/react/scroll-area";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal, unstable_batchedUpdates } from "react-dom";

import {
  DragOverlay,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  ScreenReaderInstructions,
  TouchSensor,
  useSensor,
  useSensors,
  CollisionDetection,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  UniqueIdentifier,
  MeasuringStrategy,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  useSortable,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arraySwap,
  rectSwappingStrategy,
  SortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Album, AlbumProps } from "./album";
import { useGridSize } from "@/lib/grid";
import { cn } from "@/lib/util";
import { CSS } from "@dnd-kit/utilities";

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
const CONTAINER_ID = "container";

const placeholderAlbum: Album = {
  album: "",
  artist: "",
  img: "",
  plays: 0,
  id: PLACEHOLDER_ID,
};

function isPlaceholderId(id: UniqueIdentifier) {
  return typeof id === "string" && id.startsWith(PLACEHOLDER_ID);
}

function isContainerId(id: UniqueIdentifier) {
  return typeof id === "string" && id.startsWith(CONTAINER_ID);
}

type GridProps = {
  albums: Album[];
};

type Container = {
  albums: Album[];
  maxLength?: number;
};

type ItemsMap = Record<UniqueIdentifier, Container>;

export default function Grid({ albums: initialAlbums }: GridProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  // const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const overflowItem = useRef<Album | null>(null);
  const { rows, columns } = useGridSize();
  // const { sort, setSort } = useSort();
  const id = useId();

  const [albums, setAlbums] = useState<ItemsMap>({
    grid: {
      maxLength: rows * columns,
      albums: new Array(rows * columns).fill(0).map((_, index) => {
        return {
          ...placeholderAlbum,
          id: `${PLACEHOLDER_ID}_${index}`,
        };
      }),
    },
    extras: { albums: initialAlbums },
  });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const isFirstAnnouncement = useRef(true);

  const findContainer = useCallback(
    (id: UniqueIdentifier) => {
      if (id in albums) {
        return id;
      }

      return Object.keys(albums).find((key) =>
        albums[key].albums.some((a) => a.id === id)
      );
    },
    [albums]
  );

  // const setTextColor = useCallback((index: number, color: string) => {
  // 	setAlbums((albums) => {
  // 		if (index === -1) return albums
  // 		const newItems = [...(albums ?? [])]
  // 		newItems[index] = {
  // 			...newItems[index],
  // 			textColor: color,
  // 		}
  // 		return newItems
  // 	})
  // }, [])

  // const setTextBackground = useCallback(
  // 	(index: number, background: boolean) => {
  // 		setAlbums((albums) => {
  // 			if (index === -1) return albums
  // 			const newItems = [...(albums ?? [])]
  // 			newItems[index] = {
  // 				...newItems[index],
  // 				textBackground: background,
  // 			}
  // 			return newItems
  // 		})
  // 	},
  // 	[]
  // )

  // const updateSort = useCallback(
  // 	(newSort: SortType) => {
  // 		setSort(newSort)
  // 		setAlbums((albums) => sortAlbums(albums ?? [], newSort))
  // 	},
  // 	[setSort]
  // )

  const gridSortingStrategy = useCallback<SortingStrategy>(({
  rects,
  activeIndex,
  overIndex,
  index,
}) => {
  const activeItem = albums["grid"].albums[activeIndex];
  const overItem = albums["grid"].albums[overIndex];

  console.log("gridSortingStrategy", { activeItem, overItem });
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
}, [albums])

  const onDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      const overId = over?.id;

      if (overId == null || overId === TRASH_ID) {
        return;
      }

      const overContainer = findContainer(overId);
      const activeContainer = findContainer(active.id);

      if (!activeContainer) {
        return;
      }
      if (!overContainer) {
        return
      }
      if (activeContainer !== overContainer) {
        setAlbums((albums) => {
          const activeItems = albums[activeContainer];
          const overItems = albums[overContainer];
          const overIndex = overItems.albums.findIndex((a) => a.id === overId);
          const activeIndex = activeItems.albums.findIndex(
            (a) => a.id === active.id
          );

          recentlyMovedToNewContainer.current = true;

          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height;

          const modifier = isBelowOverItem ? 1 : 0;

          const newIndex =
            overIndex >= 0 ? (overIndex + modifier) : (overItems.albums.length -1);

          if (overContainer === "grid") {
            const gridMax = albums["grid"].maxLength || 0;
            if (overItems.albums.length >= gridMax) {

              let newExtrasAlbums = [...albums["extras"].albums].filter(
                (item) => item.id !== active.id
              );

              // first see if we can just remove the next placeholder
              const placeholderIndex = overItems.albums.slice(newIndex, overItems.albums.length - 1).findIndex((a) =>
                isPlaceholderId(a.id)
              );
              if (placeholderIndex !== -1) {
                return {
                  ...albums,
                  [activeContainer]: {
                    ...albums[activeContainer],
                    albums: newExtrasAlbums,
                  },
                  [overContainer]: {
                    ...overItems,
                    albums: [
                      ...overItems.albums.slice(0, newIndex),
                      activeItems.albums[activeIndex],
                      ...overItems.albums.slice(
                        newIndex,
                        overItems.albums.length
                      ).filter((_, i) => i !== placeholderIndex),
                    ],
                  },
                }
              }
              // Move the last item from grid to extras
              const itemToMove = overItems.albums[overItems.albums.length - 1];


              if (!isPlaceholderId(itemToMove.id)) {
                overflowItem.current = itemToMove;
                newExtrasAlbums = [itemToMove, ...newExtrasAlbums];
              }

              return {
                ...albums,
                [activeContainer]: {
                  ...albums[activeContainer],
                  albums: newExtrasAlbums,
                },
                [overContainer]: {
                  ...overItems,
                  albums: [
                    ...overItems.albums.slice(0, newIndex),
                    activeItems.albums[activeIndex],
                    ...overItems.albums.slice(
                      newIndex,
                      overItems.albums.length - 1
                    ),
                  ],
                },
              };
            }
          }

          const newActiveAlbums = activeItems.albums.filter(
            (item) => item.id !== active.id
          );
          let newOverAlbums = overItems.albums;

          // If we had previously moved an item to extras, and now have space, bring it back
          if (
            overflowItem.current && overContainer === "extras"
          ) {
            const itemToReturn = overflowItem.current;
            overflowItem.current = null;
            newActiveAlbums.push(itemToReturn);
            newOverAlbums = newOverAlbums.filter((item) => item.id !== itemToReturn.id);
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
                  overItems.maxLength
                    ? overItems.maxLength - 1
                    : undefined
                ),
              ],
            },
          };
        });
      }
    },
    [findContainer]
  );

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const activeContainer = findContainer(active.id);
      overflowItem.current = null;
      if (!activeContainer) {
        setActiveId(null);
        return;
      }

      const overId = over?.id;

      if (overId == null) {
        setActiveId(null);
        return;
      }

      if (overId === TRASH_ID) {
        setAlbums((items) => ({
          ...items,
          [activeContainer]: {
            ...items[activeContainer],
            albums: items[activeContainer].albums.filter(
              (a) => a.id !== active.id
            ),
          },
        }));
        setActiveId(null);
        return;
      }

      const overContainer = findContainer(overId);

      if (overContainer) {
        const activeIndex = albums[activeContainer].albums.findIndex(
          (a) => active.id === a.id
        );
        const overIndex = albums[overContainer].albums.findIndex(
          (a) => overId === a.id
        );

        let newAlbums = arrayMove(
          albums[overContainer].albums,
          activeIndex,
          overIndex
        );
        if (isPlaceholderId(overId)) {
          console.log("swapping with placeholder");
          newAlbums = arraySwap(
            albums[overContainer].albums,
            activeIndex,
            overIndex
          );
        }

        if (activeIndex !== overIndex) {
          setAlbums((albums) => ({
            ...albums,
            [overContainer]: {
              ...albums[overContainer],
              albums: newAlbums,
            },
          }));
        }
      }
      setActiveId(null);
    },
    [albums, findContainer]
  );

  useEffect(() => {
    if (activeId == null) {
      isFirstAnnouncement.current = true;
    }
  }, [activeId]);

  if (!albums) return null;
  if (!columns || !rows) return null;

  return (
    <DndContext
      id={id}
      accessibility={{
        screenReaderInstructions,
      }}
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(active.id)}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragCancel={() => setActiveId(null)}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="h-full flex w-screen relative">
        <div
          className="h-full shrink-0 border-r border-neutral-800 overflow-hidden relative flex flex-col"
          style={{ width: 3 * 128 + 16 }}
        >
          <div className="h-10 border-b border-neutral-800 flex items-center justify-center shrink-0">
            <h5 className=" text-sm tracking-[0.5rem]  mb-0 uppercase font-code">
              extras
            </h5>
          </div>
          <ScrollArea.Root
            className="relative w-full"
            style={{
              height: "calc(100% - 40px)",
            }}
          >
            <ScrollArea.Viewport
              className="max-h-full grid grid-cols-3 px-2 relative overscroll-contain overflow-x-hidden "
              style={{
                width: 128 * 3 + 16,
              }}
            >
              <SortableContext
                id="extras"
                items={albums["extras"].albums}
                strategy={rectSortingStrategy}
              >
                {albums["extras"].albums.map((value, index) => (
                  <SortableItem
                    key={value.id}
                    value={value}
                    index={albums["extras"].albums.length + index}
                    // setTextBackground={setTextBackground}
                    // setTextColor={setTextColor}
                  />
                ))}
              </SortableContext>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
              <ScrollArea.Thumb className="w-full bg-neutral-500" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
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
                    "shrink-0 grid grid-cols-[repeat(var(--col-count),1fr)] auto-rows-min h-full relative select-none"
                  }
                  style={
                    {
                      width: columns * 128,
                      height: rows * 128,
                    } as React.CSSProperties
                  }
                >
                <div
                  className={
                    "shrink-0 grid grid-cols-[repeat(var(--col-count),1fr)] auto-rows-min h-full absolute top-0 left-0 -z-1 pointer-events-none select-none border border-dashed border-neutral-700 divide-x divide-y divide-dashed divide-neutral-700"
                  }
                  style={
                    {
                      width: columns * 128,
                      height: rows * 128,
                    } as React.CSSProperties
                  }
                >
                  {new Array(rows * columns).fill(0).map((_, index) => {
                    return (
                      <Placeholder
                        key={`${CONTAINER_ID}_${index}`}
                        id={`${CONTAINER_ID}_${index}`}
                        index={index}
                      />
                    );
                  })}
                </div>
                  {albums["grid"].albums.map((album, index) =>
                    <SortableItem
                        key={album.id}
                        value={album}
                        index={index}
                        disabled={isPlaceholderId(album.id)}
                        // setTextBackground={setTextBackground}
                        // setTextColor={setTextColor}
                        priority={true}
                      />
                  )}
                </div>
              </SortableContext>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
              <ScrollArea.Thumb className="w-full bg-neutral-500" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </div>
      </div>
      {typeof document !== "undefined"
        ? createPortal(
            <DragOverlay
              adjustScale={true}
              modifiers={[restrictToWindowEdges]}
              dropAnimation={{ duration: 0.1, easing: "ease-in" }}
            >
              {activeId ? (
                <Album
                  album={
                    albums[findContainer(activeId) ?? "grid"].albums.find(
                      (a) => a.id === activeId
                    )!
                  }
                  // index={activeIndex}
                  dragOverlay
                  priority={true}
                />
              ) : null}
            </DragOverlay>,
            document.body
          )
        : null}
    </DndContext>
  );
}

type SortableItemProps = {
  disabled?: boolean;
  value: Album;
  index: number;
} & Pick<AlbumProps, "priority" | "setTextBackground" | "setTextColor">;

const SortableItem = React.memo(function SortableItem({
  disabled,
  value,
  index,
  ...props
}: SortableItemProps) {
  const {
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
    attributes,
    isOver,
  } = useSortable({
    id: value.id,
    disabled,
    transition: null,
  });

  if (disabled) {
    return <div
    ref={setNodeRef}
    className="pointer-events-none w-32 h-32 bg-transparent"
    style={{
      transform: CSS.Transform.toString(transform),
      transition,
    }}>i</div>;
  }

  return (
    <Album
      ref={setNodeRef}
      album={value}
      disabled={disabled}
      dragging={isDragging}
      isOver={isOver}
      index={index}
      transform={transform}
      transition={transition}
      listeners={listeners}
      data-index={index}
      data-id={value.id}
      {...props}
      {...attributes}
    />
  );
});

const Placeholder = React.memo(function Placeholder({ id, index }: { id: string; index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { index },
    disabled: true,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-32 h-32 bg-neutral-900 -z-1 last:border-r last:border-b border-dashed border-neutral-700",
        isOver && ""
      )}
    >
    </div>
  );
});
