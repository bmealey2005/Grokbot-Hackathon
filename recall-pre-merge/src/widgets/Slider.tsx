"use client";

import type { WidgetProps, WidgetSpec } from "@/lib/schema";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ActionBar, Hint, Prompt } from "./ui";
import { scoreSlider } from "./grade";
import { useLockingSubmit } from "./useLockingSubmit";

type Props = WidgetProps<Extract<WidgetSpec, { widget: "slider" }>>;

export function Slider({ spec, onSubmit }: Props) {
  const span = spec.max - spec.min || 1;
  const midpoint = (spec.min + spec.max) / 2;
  const initial = midpoint === spec.answer ? spec.min : midpoint;
  const [value, setValue] = useState(initial);
  const { locked, lockAndSubmit } = useLockingSubmit(onSubmit);
  const step = Number.isInteger(spec.min) && Number.isInteger(spec.max) && Number.isInteger(spec.answer) ? 1 : span / 100;
  const unit = spec.unit ? ` ${spec.unit}` : "";
  const low = spec.answer - spec.tolerance;
  const high = spec.answer + spec.tolerance;
  const bandLeft = Math.max(0, ((low - spec.min) / span) * 100);
  const bandWidth = Math.min(100 - bandLeft, ((spec.tolerance * 2) / span) * 100);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const graded = scoreSlider(value, spec.answer, spec.tolerance);
        lockAndSubmit({
          ...graded,
          feedback: `${formatNum(spec.answer)}${unit} is the target. ${formatNum(low)} to ${formatNum(high)}${unit} counts. ${spec.explanation}`,
        });
      }}
    >
      <Prompt>{spec.prompt}</Prompt>
      <Hint>Estimate the value, then check.</Hint>
      <p className="stat-num mt-8 text-ink">
        {formatNum(value)}
        <span className="ml-2 font-sans text-lg text-muted">{spec.unit}</span>
      </p>
      <label className="mt-4 block">
        <span className="sr-only">Estimate in {spec.unit ?? "units"}</span>
        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={step}
          value={value}
          disabled={locked}
          className="w-full accent-accent"
          onChange={(event) => setValue(Number(event.target.value))}
        />
      </label>
      <div className="mt-1 flex justify-between text-sm text-muted">
        <span>
          {formatNum(spec.min)}
          {unit}
        </span>
        <span>
          {formatNum(spec.max)}
          {unit}
        </span>
      </div>
      {locked ? (
        <div className="mt-5">
          <div className="relative h-3 rounded-full bg-paper-deep">
            <div
              className="absolute inset-y-0 rounded-full bg-correct/30"
              style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-correct"
              style={{ left: `${((spec.answer - spec.min) / span) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-correct">
            Target {formatNum(spec.answer)}
            {unit}. The band is the accepted range.
          </p>
        </div>
      ) : null}
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

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
