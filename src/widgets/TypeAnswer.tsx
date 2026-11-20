"use client";

import type { WidgetProps, WidgetSpec } from "@/lib/schema";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ActionBar, Hint, Prompt } from "./ui";
import { matchesAccepted } from "./grade";
import { useLockingSubmit } from "./useLockingSubmit";

type Props = WidgetProps<Extract<WidgetSpec, { widget: "typeAnswer" }>>;

export function TypeAnswer({ spec, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const { locked, lockAndSubmit } = useLockingSubmit(onSubmit);
  const matched = locked && matchesAccepted(value, spec.accepted);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        const correct = matchesAccepted(value, spec.accepted);
        const answer = spec.accepted[0] ?? "";
        lockAndSubmit({
          correct,
          score: correct ? 1 : 0,
          feedback: correct ? spec.explanation : `The answer is ${answer}. ${spec.explanation}`,
        });
      }}
    >
      <Prompt>{spec.prompt}</Prompt>
      <Hint>Type the answer. Capitalization and small typos are fine.</Hint>
      <label className="mt-6 block">
        <span className="sr-only">Your answer</span>
        <input
          className="field"
          value={value}
          disabled={locked}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Type your answer"
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      {locked && !matched ? (
        <p className="mt-3 text-sm text-correct">Answer: {spec.accepted[0]}</p>
      ) : null}
      {locked ? null : (
        <ActionBar>
          <Button type="submit" fullWidth disabled={value.trim() === ""}>
            Check
          </Button>
        </ActionBar>
      )}
    </form>
  );
}
