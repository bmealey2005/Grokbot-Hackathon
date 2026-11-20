"use client";

import { StudyClientError, gradeAnswer } from "@/lib/aiClient";
import type { Concept, WidgetProps, WidgetSpec } from "@/lib/schema";
import { useState } from "react";
import { Button } from "@/components/Button";
import { CheckIcon, WrongIcon } from "@/components/icons";
import { ActionBar, Hint, Prompt } from "./ui";
import { useQuestionConcept } from "./QuestionContext";
import { useLockingSubmit } from "./useLockingSubmit";

type Props = WidgetProps<Extract<WidgetSpec, { widget: "explain" }>>;

const MIN_LENGTH = 20;

export function Explain({ spec, onSubmit }: Props) {
  const provided = useQuestionConcept();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [missing, setMissing] = useState<string[] | null>(null);
  const { locked, lockAndSubmit } = useLockingSubmit(onSubmit);
  const ready = answer.trim().length >= MIN_LENGTH;

  async function grade() {
    if (!ready || grading || locked) return;
    setGrading(true);
    setError(null);
    try {
      const result = await gradeAnswer({
        concept: provided ?? fallbackConcept(spec),
        prompt: spec.prompt,
        rubric: [...spec.rubric],
        answer: answer.trim(),
      });
      setMissing(result.missing ?? []);
      lockAndSubmit(result);
    } catch (error) {
      setError(error instanceof StudyClientError ? error.message : "We could not grade that just now. Try once more.");
    } finally {
      setGrading(false);
    }
  }

  const missed = new Set(missing ?? []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void grade();
      }}
    >
      <Prompt>{spec.prompt}</Prompt>
      <Hint>Explain it in your own words. A sentence or two is enough.</Hint>
      <label className="mt-6 block">
        <span className="sr-only">Your explanation</span>
        <textarea
          className="field min-h-36 resize-y"
          value={answer}
          disabled={locked || grading}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void grade();
            }
          }}
        />
      </label>
      <p className="mt-2 text-sm text-muted">
        {ready ? "Ready to check." : `${answer.trim().length} of ${MIN_LENGTH} characters.`}
      </p>
      {error ? (
        <p className="mt-2 text-sm text-wrong" role="alert">
          {error}
        </p>
      ) : null}
      {missing ? (
        <ul className="mt-5 space-y-2">
          {spec.rubric.map((point) => {
            const hit = !missed.has(point);
            return (
              <li key={point} className="flex items-start gap-2 text-sm leading-6">
                {hit ? <CheckIcon className="mt-0.5 text-correct" /> : <WrongIcon className="mt-0.5 text-wrong" />}
                <span>{point}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {locked ? null : (
        <ActionBar>
          <Button type="submit" fullWidth disabled={!ready || grading}>
            {grading ? "Checking…" : "Check"}
          </Button>
        </ActionBar>
      )}
    </form>
  );
}

function fallbackConcept(spec: Props["spec"]): Concept {
  return {
    id: "explain",
    term: "This concept",
    definition: spec.prompt,
    facts: [...spec.rubric],
    related: [],
  };
}
