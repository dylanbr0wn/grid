'use client'
import "client-only"

import React, {ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {
  Active,
  Announcements,
  closestCenter,
  CollisionDetection,
  DragOverlay,
  DndContext,
  DropAnimation,
  KeyboardSensor,
  KeyboardCoordinateGetter,
  Modifiers,
  MouseSensor,
  MeasuringConfiguration,
  PointerActivationConstraint,
  ScreenReaderInstructions,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  useSortable,
  SortableContext,
  sortableKeyboardCoordinates,
  SortingStrategy,
  rectSortingStrategy,
  AnimateLayoutChanges,
  NewIndexGetter,
} from '@dnd-kit/sortable';
import { Album } from './album';
import { Wrapper } from './wrapper';
import { List } from './list';

type SortableProps = {
  activationConstraint?: PointerActivationConstraint;
  animateLayoutChanges?: AnimateLayoutChanges;
  adjustScale?: boolean;
  collisionDetection?: CollisionDetection;
  coordinateGetter?: KeyboardCoordinateGetter;
  Container?: any; // To-do: Fix me
  dropAnimation?: DropAnimation | null;
  getNewIndex?: NewIndexGetter;
  handle?: boolean;
  itemCount?: number;
  items?: {
    album: string
    img: string
    artist: string
    id: string
  }[];
  measuring?: MeasuringConfiguration;
  modifiers?: Modifiers;
  renderItem?: any;
  removable?: boolean;
  reorderItems?: typeof arrayMove;
  strategy?: SortingStrategy;
  style?: React.CSSProperties;
  useDragOverlay?: boolean;
  getItemStyles?(args: {
    id: UniqueIdentifier;
    index: number;
    isSorting: boolean;
    isDragOverlay: boolean;
    overIndex: number;
    isDragging: boolean;
  }): React.CSSProperties;
  wrapperStyle?(args: {
    active: Pick<Active, 'id'> | null;
    index: number;
    isDragging: boolean;
    id: UniqueIdentifier;
  }): React.CSSProperties;
  isDisabled?(id: UniqueIdentifier): boolean;
}


const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable: `
    To pick up a sortable item, press the space bar.
    While sorting, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `,
};

export function Sortable({
  activationConstraint,
  animateLayoutChanges,
  adjustScale = false,
  Container = List,
  collisionDetection = closestCenter,
  coordinateGetter = sortableKeyboardCoordinates,
  dropAnimation = dropAnimationConfig,
  getItemStyles = () => ({}),
  getNewIndex,
  handle = false,
  itemCount = 16,
  items: initialItems,
  isDisabled = () => false,
  measuring,
  modifiers,
  removable,
  renderItem,
  reorderItems = arrayMove,
  strategy = rectSortingStrategy,
  style,
  useDragOverlay = true,
  wrapperStyle = () => ({}),
}: SortableProps) {
   const [items, setItems] = useState(initialItems || []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint,
    }),
    useSensor(TouchSensor, {
      activationConstraint,
    }),
    useSensor(KeyboardSensor, {
      // Disable smooth scrolling in Cypress automated tests
      coordinateGetter,
    })
  );
  const isFirstAnnouncement = useRef(true);
  const getIndex = (id: string) => items.findIndex(item => item.id === id);
  const activeIndex = activeId != null ? getIndex(activeId) : -1;

  const onRemove = (id: UniqueIdentifier) => {
    const index = getIndex(id as string);
    if (index !== -1) {
      setItems((items) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        return newItems;
      });
    }
  }

  useEffect(() => {
    if (activeId == null) {
      isFirstAnnouncement.current = true;
    }
  }, [activeId]);

  const trimmedItems = useMemo(() => items.slice(0,itemCount), [items, itemCount]);

  return (
    <DndContext
      accessibility={{
        screenReaderInstructions,
      }}
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={({active}) => {
        if (!active) {
          return;
        }

        setActiveId(active.id as string);
      }}
      onDragEnd={({over}) => {
        setActiveId(null);

        if (over) {
          const overIndex = getIndex(over.id as string);
          if (activeIndex !== overIndex) {
            setItems((items) => reorderItems(items, activeIndex, overIndex));
          }
        }
      }}
      onDragCancel={() => setActiveId(null)}
      measuring={measuring}
      modifiers={modifiers}
    >
      <Wrapper style={style} center>
        <SortableContext id='' items={trimmedItems} strategy={strategy}>
          <Container>
            {trimmedItems.map((value, index) => (
              <SortableItem
                key={value.id}
                value={value}
                handle={handle}
                index={index}
                style={getItemStyles}
                wrapperStyle={wrapperStyle}
                renderItem={renderItem}
                onRemove={onRemove}
                animateLayoutChanges={animateLayoutChanges}
                useDragOverlay={useDragOverlay}
                getNewIndex={getNewIndex}
              />
            ))}
          </Container>
        </SortableContext>
      </Wrapper>
      {useDragOverlay && typeof document !== "undefined"
        ? createPortal(
            <DragOverlay
              adjustScale={adjustScale}
              dropAnimation={dropAnimation}
            >
              {activeId != null ? (
                <Album
                  value={items[activeIndex]}
                  handle={handle}
                  renderItem={renderItem}
                  wrapperStyle={wrapperStyle({
                    active: {id: activeId},
                    index: activeIndex,
                    isDragging: true,
                    id: items[activeIndex].id,
                  })}
                  style={getItemStyles({
                    id: items[activeIndex].id,
                    index: activeIndex,
                    isSorting: activeId !== null,
                    isDragging: true,
                    overIndex: -1,
                    isDragOverlay: true,
                  })}
                  dragOverlay
                />
              ) : null}
            </DragOverlay>,
            document.body
          )
        : null}
    </DndContext>
  );
}

interface SortableItemProps {
  animateLayoutChanges?: AnimateLayoutChanges;
  disabled?: boolean;
  getNewIndex?: NewIndexGetter;
  value: {
    album: string
    img: string
    artist: string
    id: string
  }
  index: number;
  handle: boolean;
  useDragOverlay?: boolean;
  onRemove?(id: UniqueIdentifier): void;
  style(values: any): React.CSSProperties;
  renderItem?(args: any): React.ReactElement;
  wrapperStyle: SortableProps['wrapperStyle'];
}

export function SortableItem({
  disabled,
  animateLayoutChanges,
  getNewIndex,
  handle,
  value,
  index,
  onRemove,
  style,
  renderItem,
  useDragOverlay,
  wrapperStyle,
}: SortableItemProps) {
  const {
    active,
    attributes,
    isDragging,
    isSorting,
    listeners,
    overIndex,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({
    id: value.id,
    animateLayoutChanges,
    disabled,
    getNewIndex,
  });

  return (
    <Album
      ref={setNodeRef}
      value={value}
      disabled={disabled}
      dragging={isDragging}
      sorting={isSorting}
      handle={handle}
      handleProps={
        handle
          ? {
              ref: setActivatorNodeRef,
            }
          : undefined
      }
      renderItem={renderItem}
      index={index}
      style={style({
        index,
        id: value.id,
        isDragging,
        isSorting,
        overIndex,
      })}
      transform={transform}
      transition={transition}
      wrapperStyle={wrapperStyle?.({index, isDragging, active, id: value.id})}
      listeners={listeners}
      data-index={index}
      data-id={value.id}
      dragOverlay={!useDragOverlay && isDragging}
      // {...attributes}
    />
  );
}



type GridContainerProps = {
  children: React.ReactNode;
  columns: number;
}

export function GridContainer({children, columns}: GridContainerProps) {
  return (
    <ul
      className={"w-fit grid grid-cols-[repeat(var(--col-count),1fr)] p-5"}
      style={
        {
          '--col-count': columns,
        } as React.CSSProperties
      }
    >
      {children}
    </ul>
  );
}

type GridProps = {
  items: {
    album: string
    img: string
    artist: string
    id: string
  }[]
  size: number
}

const props: Partial<SortableProps> = {
  adjustScale: true,
  Container: (props: any) => <GridContainer {...props} columns={5} />,
  strategy: rectSortingStrategy,
  wrapperStyle: () => ({
    width: 140,
    height: 140,
  }),
};

export default function Grid({items, size }:GridProps) {
  return <Sortable Container={(props: { children: ReactNode }) => <GridContainer {...props} columns={size} />} items={items} itemCount={size*size} />;
}