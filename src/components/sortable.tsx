"use client";

import { cn } from "@/lib/util";
import { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { Disabled } from "@dnd-kit/sortable/dist/types";
import { CSS } from "@dnd-kit/utilities";
import { JSX, PropsWithChildren } from "react";

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

  const canDrag = typeof disabled === "boolean" ? !disabled : !disabled?.draggable;

  if (!canDrag) {
    <div
      ref={setNodeRef}
      className={cn("pointer-events-none")}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...props}
      {...attributes}
    >
      {children}
    </div>;
  }

  return (
    <div
      className={cn(
        isDragging && "opacity-50 z-0",
        isOver &&
          "after:absolute after:inset-0 after:z-10 after:bg-white after:bg-opacity-10",
        props.className,
      )}
      style={
        {
          transition,
          transform: CSS.Transform.toString(transform),
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
