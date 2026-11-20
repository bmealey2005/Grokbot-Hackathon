"use client";

import type { WidgetProps, WidgetSpec } from "@/lib/schema";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ActionBar, Hint } from "./ui";
import { scoreBlanks } from "./grade";
import { useLockingSubmit } from "./useLockingSubmit";

type Props = WidgetProps<Extract<WidgetSpec, { widget: "cloze" }>>;

export function Cloze({ spec, onSubmit }: Props) {
  const pieces = spec.text.split("{{blank}}");
  const blankCount = Math.max(0, pieces.length - 1);
  const [values, setValues] = useState<string[]>(() => Array.from({ length: blankCount }, () => ""));
  const [hits, setHits] = useState<boolean[] | null>(null);
  const { locked, lockAndSubmit } = useLockingSubmit(onSubmit);

  function grade() {
    const graded = scoreBlanks(values, spec.answers);
    setHits(graded.hits);
    const matched = graded.hits.filter(Boolean).length;
    lockAndSubmit({
      correct: graded.correct,
      score: graded.score,
      feedback: graded.correct
        ? spec.explanation
        : `${matched} of ${graded.hits.length} blanks match. ${spec.explanation}`,
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        grade();
      }}
    >
      <p className="prompt text-balance text-ink">
        {pieces.map((piece, index) => (
          <span key={`${piece}-${index}`}>
            {piece}
            {index < blankCount ? (
              <>
                <input
                  className="cloze-input"
                  aria-label={`Blank ${index + 1}`}
                  value={values[index] ?? ""}
                  disabled={locked}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{ width: `${Math.max(8, (values[index] ?? "").length + 1)}ch` }}
                  aria-invalid={hits ? !hits[index] : undefined}
                  data-correct={hits?.[index] ? "true" : undefined}
                  onChange={(event) => {
                    const next = [...values];
                    next[index] = event.target.value;
                    setValues(next);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                {hits && !hits[index] ? (
                  <span className="text-base text-correct"> {spec.answers[index]?.[0]}</span>
                ) : null}
              </>
            ) : null}
          </span>
        ))}
      </p>
      <Hint>Fill each blank. Small typos still count.</Hint>
      {locked ? null : (
        <ActionBar>
          <Button type="submit" fullWidth disabled={values.some((value) => value.trim() === "")}>
            Check
          </Button>
        </ActionBar>
      )}
    </form>
  );
}
