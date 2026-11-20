"use client";

import type { WidgetProps, WidgetSpec } from "@/lib/schema";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { ActionBar, Hint, Kbd, Prompt } from "./ui";
import { useLockingSubmit } from "./useLockingSubmit";

type Props = WidgetProps<Extract<WidgetSpec, { widget: "trueFalse" }>>;

export function TrueFalse({ spec, onSubmit }: Props) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const { locked, lockAndSubmit } = useLockingSubmit(onSubmit);

  useEffect(() => {
    if (locked) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "t") {
        event.preventDefault();
        setChoice(true);
      } else if (key === "f") {
        event.preventDefault();
        setChoice(false);
      } else if (key === "enter" && choice !== null) {
        event.preventDefault();
        grade(choice);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function grade(value: boolean) {
    const correct = value === spec.answer;
    const word = spec.answer ? "true" : "false";
    lockAndSubmit({
      correct,
      score: correct ? 1 : 0,
      feedback: correct ? spec.explanation : `This statement is ${word}. ${spec.explanation}`,
    });
  }

  function classes(value: boolean) {
    const isSelected = choice === value;
    const isAnswer = spec.answer === value;
    return cx(
      "flex min-h-16 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-lg font-medium disabled:opacity-100",
      locked && isAnswer && "border-correct bg-correct-soft text-correct",
      locked && isSelected && !isAnswer && "border-wrong bg-wrong-soft text-wrong",
      locked && !isAnswer && !isSelected && "border-line opacity-60",
      !locked && isSelected && "border-accent bg-accent-soft text-accent",
      !locked && !isSelected && "border-line bg-card hover:border-ink/20",
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (choice === null) return;
        grade(choice);
      }}
    >
      <Prompt>{spec.statement}</Prompt>
      <Hint>
        True or false?
        <span className="hidden md:inline"> Keys T and F, then Enter.</span>
      </Hint>
      <div className="mt-6 flex gap-3" role="radiogroup" aria-label="True or false">
        <button type="button" role="radio" aria-checked={choice === true} disabled={locked} className={classes(true)} onClick={() => setChoice(true)}>
          <Kbd>T</Kbd>
          True
        </button>
        <button type="button" role="radio" aria-checked={choice === false} disabled={locked} className={classes(false)} onClick={() => setChoice(false)}>
          <Kbd>F</Kbd>
          False
        </button>
      </div>
      {locked ? null : (
        <ActionBar>
          <Button type="submit" fullWidth disabled={choice === null}>
            Check
          </Button>
        </ActionBar>
      )}
    </form>
  );
}
