"use client";

import { DndContext } from "@dnd-kit/core";
import { motion } from "framer-motion";
import type { AnswerResult, WidgetSpec } from "@/lib/schema";

/**
 * Agent 2 replaces this stub with one component per widget.
 * `@dnd-kit` is installed for OrderSteps. Framer Motion is installed for transitions.
 */
export function renderWidget(
  spec: WidgetSpec,
  onSubmit: (result: AnswerResult) => void,
) {
  return (
    <DndContext>
      <motion.div
        data-widget={spec.widget}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p>{spec.widget}</p>
        <button
          type="button"
          onClick={() =>
            onSubmit({
              correct: false,
              score: 0,
              feedback: "Stub widget. Agent 2 implements grading.",
            })
          }
        >
          Submit
        </button>
      </motion.div>
    </DndContext>
  );
}
