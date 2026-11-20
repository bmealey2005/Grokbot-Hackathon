"use client";

import type { WidgetProps, WidgetSpec } from "@/lib/schema";
import { useEffect } from "react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { CheckIcon, WrongIcon } from "@/components/icons";
import { cx } from "@/components/cx";
import { ActionBar, Hint, Kbd, Prompt } from "./ui";
import { useLockingSubmit } from "./useLockingSubmit";

type Props = WidgetProps<Extract<WidgetSpec, { widget: "multipleChoice" }>>;

export function MultipleChoice({ spec, onSubmit }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const { locked, lockAndSubmit } = useLockingSubmit(onSubmit);

  useEffect(() => {
    if (locked) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < spec.options.length) {
        event.preventDefault();
        setSelected(index);
        return;
      }
      if (event.key === "Enter" && selected !== null) {
        event.preventDefault();
        grade(selected);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function grade(index: number) {
    const correct = index === spec.correctIndex;
    const answer = spec.options[spec.correctIndex] ?? "";
    lockAndSubmit({
      correct,
      score: correct ? 1 : 0,
      feedback: correct ? spec.explanation : `The answer is “${answer}”. ${spec.explanation}`,
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selected === null) return;
        grade(selected);
      }}
    >
      <Prompt>{spec.prompt}</Prompt>
      <Hint>
        Choose one.
        <span className="hidden md:inline"> Keys 1 to {spec.options.length}, then Enter.</span>
      </Hint>
      <div role="radiogroup" aria-label="Answer choices" className="mt-6 space-y-3">
        {spec.options.map((option, index) => {
          const isSelected = selected === index;
          const isAnswer = index === spec.correctIndex;
          const showRight = locked && isAnswer;
          const showWrong = locked && isSelected && !isAnswer;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={locked}
              onClick={() => setSelected(index)}
              className={cx(
                "flex min-h-12 w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-base leading-6 transition-colors disabled:opacity-100",
                showRight && "border-correct bg-correct-soft",
                showWrong && "border-wrong bg-wrong-soft",
                !locked && isSelected && "border-accent bg-accent-soft",
                !locked && !isSelected && "border-line bg-card hover:border-ink/20",
                locked && !showRight && !showWrong && "border-line opacity-70",
              )}
            >
              <Kbd>{index + 1}</Kbd>
              <span className="min-w-0 flex-1">{option}</span>
              {showRight ? <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-correct" /> : null}
              {showWrong ? <WrongIcon className="mt-0.5 h-5 w-5 shrink-0 text-wrong" /> : null}
            </button>
          );
        })}
      </div>
      {locked ? null : (
        <ActionBar>
          <Button type="submit" fullWidth disabled={selected === null}>
            Check
          </Button>
        </ActionBar>
      )}
    </form>
  );
}
