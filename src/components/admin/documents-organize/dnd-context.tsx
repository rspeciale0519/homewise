"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ReactNode } from "react";

interface DndContextProviderProps {
  children: ReactNode;
  overlay?: ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel?: () => void;
}

const resilientCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return rectIntersection(args);
};

// For uncategorized-bulk drags the user grabs a small grip handle but the
// overlay preview is a wider card — snap the overlay's center to the cursor
// so the visual stays anchored. Other drag types (in-section card moves,
// category header reorder) already feel right with default positioning, so
// the modifier is a no-op for them.
const snapBulkCenterToCursor: Modifier = (args) => {
  const activeType = args.active?.data.current?.type as string | undefined;
  if (activeType === "uncategorized-bulk") {
    return snapCenterToCursor(args);
  }
  return args.transform;
};

export function DndContextProvider({
  children,
  overlay,
  onDragStart,
  onDragEnd,
  onDragCancel,
}: DndContextProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={resilientCollision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
      <DragOverlay
        dropAnimation={{
          duration: 150,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
        adjustScale={false}
        zIndex={10000}
        modifiers={[snapBulkCenterToCursor]}
      >
        {overlay ?? null}
      </DragOverlay>
    </DndContext>
  );
}
