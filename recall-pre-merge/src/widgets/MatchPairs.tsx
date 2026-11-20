"use client";

import type { WidgetProps, WidgetSpec } from "@/lib/schema";
import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { ActionBar, Hint, Prompt } from "./ui";
import { shuffle } from "./grade";
import { useLockingSubmit } from "./useLockingSubmit";

type Props = WidgetProps<Extract<WidgetSpec, { widget: "matchPairs" }>>;
type Item = { id: string; text: string; pairId: number };
type Match = { rightId: string; color: number };

const PAIR_COLORS = [
  "var(--pair-1)",
  "var(--pair-2)",
  "var(--pair-3)",
  "var(--pair-4)",
  "var(--pair-5)",
  "var(--pair-6)",
];

export function MatchPairs({ spec, onSubmit }: Props) {
  const left = useMemo<Item[]>(
    () => spec.pairs.map((pair, index) => ({ id: `left-${index}`, text: pair.left, pairId: index })),
    [spec.pairs],
  );
  const [right] = useState<Item[]>(() =>
    shuffle(spec.pairs.map((pair, index) => ({ id: `right-${index}`, text: pair.right, pairId: index }))),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [hint, setHint] = useState<string | null>(null);
  const { locked, lockAndSubmit } = useLockingSubmit(onSubmit);

  const selectedText = left.find((item) => item.id === selected)?.text;
  const pairedCount = Object.keys(matches).length;

  function assign(leftId: string, rightId: string) {
    setMatches((current) => {
      const next = { ...current };
      for (const [id, match] of Object.entries(next)) {
        if (match.rightId === rightId) delete next[id];
      }
      const used = new Set(Object.values(next).map((match) => match.color));
      let color = 0;
      while (used.has(color)) color += 1;
      next[leftId] = { rightId, color };
      return next;
    });
    setSelected(null);
    setHint(null);
  }

  function grade() {
    let correctCount = 0;
    for (const item of left) {
      const match = matches[item.id];
      const chosen = right.find((entry) => entry.id === match?.rightId);
      if (chosen && chosen.pairId === item.pairId) correctCount += 1;
    }
    const score = left.length === 0 ? 0 : correctCount / left.length;
    lockAndSubmit({
      correct: score === 1,
      score,
      feedback: score === 1 ? "Every pair matches." : `${correctCount} of ${left.length} pairs match.`,
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pairedCount !== left.length) return;
        grade();
      }}
    >
      <Prompt>{spec.prompt}</Prompt>
      <Hint>Tap a term, then tap its match. Numbers show what you paired.</Hint>
      {hint ? <p className="mt-2 text-sm text-close">{hint}</p> : null}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <ol className="space-y-3">
          {left.map((item) => {
            const match = matches[item.id];
            const chosen = right.find((entry) => entry.id === match?.rightId);
            const isCorrect = Boolean(locked && chosen && chosen.pairId === item.pairId);
            const isWrong = Boolean(locked && match && !isCorrect);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setSelected(item.id);
                    setHint(null);
                  }}
                  className={cx(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left disabled:opacity-100",
                    selected === item.id && !locked && "border-accent bg-accent-soft",
                    isCorrect && "border-correct bg-correct-soft",
                    isWrong && "border-wrong bg-wrong-soft",
                    !locked && selected !== item.id && "border-line bg-card",
                  )}
                >
                  <PairDot color={match?.color} />
                  <span className="min-w-0 flex-1 leading-6">{item.text}</span>
                </button>
                {isWrong ? (
                  <p className="mt-1 pl-3 text-sm text-correct">Match: {spec.pairs[item.pairId]?.right}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
        <div>
          {selectedText ? <p className="mb-3 text-sm font-medium text-accent md:hidden">Matching “{selectedText}”</p> : null}
          <ol className="space-y-3">
            {right.map((item) => {
              const owner = Object.entries(matches).find(([, match]) => match.rightId === item.id);
              const color = owner?.[1].color;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (!selected) {
                        setHint("Tap a term on the left first.");
                        return;
                      }
                      assign(selected, item.id);
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line bg-card px-3 py-3 text-left disabled:opacity-100"
                  >
                    <PairDot color={color} />
                    <span className="min-w-0 flex-1 leading-6">{item.text}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      {locked ? null : (
        <ActionBar>
          <Button type="submit" fullWidth disabled={pairedCount !== left.length}>
            Check
          </Button>
        </ActionBar>
      )}
    </form>
  );
}

function PairDot({ color }: { color: number | undefined }) {
  if (color === undefined) {
    return <span className="h-6 w-6 shrink-0 rounded-full border border-line" aria-hidden="true" />;
  }
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: PAIR_COLORS[color % PAIR_COLORS.length] }}
      aria-hidden="true"
    >
      {color + 1}
    </span>
  );
}
