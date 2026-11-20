"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { WidgetProps, WidgetSpec } from "@/lib/schema";
import { useState } from "react";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { ActionBar, Hint, Prompt } from "./ui";
import { pairwiseOrderScore, shuffle } from "./grade";
import { useLockingSubmit } from "./useLockingSubmit";

type Props = WidgetProps<Extract<WidgetSpec, { widget: "orderSteps" }>>;
type Step = { id: string; text: string; correctIndex: number };

export function OrderSteps({ spec, onSubmit }: Props) {
  const [order, setOrder] = useState<Step[]>(() =>
    shuffle(spec.steps.map((text, correctIndex) => ({ id: `step-${correctIndex}`, text, correctIndex }))),
  );
  const { locked, lockAndSubmit } = useLockingSubmit(onSubmit);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    setOrder(arrayMove(order, index, next));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((step) => step.id === active.id);
    const newIndex = order.findIndex((step) => step.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setOrder(arrayMove(order, oldIndex, newIndex));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const correctIds = spec.steps.map((_, index) => `step-${index}`);
        const score = pairwiseOrderScore(correctIds, order.map((step) => step.id));
        lockAndSubmit({
          correct: score === 1,
          score,
          feedback:
            score === 1
              ? spec.explanation
              : `Some steps are out of sequence. Correct order: ${spec.steps.join(", ")}. ${spec.explanation}`,
        });
      }}
    >
      <Prompt>{spec.prompt}</Prompt>
      <Hint>Drag a step, or use the arrows. First to last.</Hint>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order.map((step) => step.id)} strategy={verticalListSortingStrategy}>
          <ol className="mt-6 space-y-3">
            {order.map((step, index) => (
              <SortableStep
                key={step.id}
                step={step}
                index={index}
                locked={locked}
                onMove={(direction) => move(index, direction)}
                disableUp={index === 0}
                disableDown={index === order.length - 1}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {locked ? null : (
        <ActionBar>
          <Button type="submit" fullWidth>
            Check
          </Button>
        </ActionBar>
      )}
    </form>
  );
}

function SortableStep({
  step,
  index,
  locked,
  onMove,
  disableUp,
  disableDown,
}: {
  step: Step;
  index: number;
  locked: boolean;
  onMove: (direction: -1 | 1) => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id, disabled: locked });
  const inPlace = step.correctIndex === index;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        "flex min-h-12 items-center gap-2 rounded-xl border bg-card px-2 py-1",
        locked && inPlace && "border-correct bg-correct-soft",
        locked && !inPlace && "border-wrong bg-wrong-soft",
        !locked && "border-line",
      )}
    >
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-lg text-muted hover:bg-paper disabled:opacity-30"
        aria-label={`Move “${step.text}” up`}
        disabled={locked || disableUp}
        onClick={() => onMove(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        className="inline-flex h-11 cursor-grab touch-none items-center rounded-lg px-2 text-muted active:cursor-grabbing"
        aria-label={`Drag “${step.text}”`}
        disabled={locked}
        {...attributes}
        {...listeners}
      >
        ::
      </button>
      <span className="min-w-0 flex-1 leading-6">{step.text}</span>
      {locked && !inPlace ? <span className="pr-2 text-sm text-wrong">Should be {step.correctIndex + 1}</span> : null}
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-lg text-muted hover:bg-paper disabled:opacity-30"
        aria-label={`Move “${step.text}” down`}
        disabled={locked || disableDown}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
    </li>
  );
}
