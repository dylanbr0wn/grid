"use client";

import { cn } from "@/lib/util";
import { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { Disabled } from "@dnd-kit/sortable/dist/types";
import { CSS } from "@dnd-kit/utilities";
import { JSX, PropsWithChildren } from "react";

/**
 * Props for the generic drag-and-drop wrapper.
 * `sortData` is passed to dnd-kit's `data` field and made available in drag event handlers.
 * `disabled` can be a boolean or a dnd-kit `Disabled` object to independently control drag/drop.
 */
type SortableProps = PropsWithChildren & {
  id: UniqueIdentifier;
  disabled?: boolean | Disabled;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sortData: any;
} & Omit<JSX.IntrinsicElements["div"], "id">;

export function Sortable({
  children,
  id,
  disabled,
  sortData,
  className,
  style,
  ...props
}: SortableProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
    isOver,
  } = useSortable({
    id: id,
    disabled,
    data: sortData,
  });

  const canDrag =
    typeof disabled === "boolean" ? !disabled : !disabled?.draggable;

  if (!canDrag) {
    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          ...style,
        }}
        className={cn(
          "focus-visible:outline-none",
          className,
        )}
        {...props}
        {...attributes}
        tabIndex={-1}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        isDragging && "opacity-50 z-0",
        isOver &&
          "after:absolute after:inset-0 after:z-10 after:bg-white after:bg-opacity-10",
        className,
      )}
      style={
        {
          transition,
          transform: CSS.Transform.toString(transform),
          ...style,
        } as React.CSSProperties
      }
      {...listeners}
      ref={setNodeRef}
      {...attributes}
      {...props}
    >
      {children}
    </div>
  );
}
