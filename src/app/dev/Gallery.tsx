"use client";

import { AppHeader, Card, FeedbackCard, LevelBadge } from "@/components";
import { WIDGET_LABELS } from "@/components/format";
import { useMounted } from "@/components/useMounted";
import { sampleDeck, widgetSpecs } from "@/fixtures";
import type { AnswerResult, WidgetSpec } from "@/lib/schema";
import { QuestionConceptProvider } from "@/widgets/QuestionContext";
import { renderWidget } from "@/widgets/registry";
import { useState } from "react";

const ORDER: WidgetSpec["widget"][] = [
  "multipleChoice",
  "trueFalse",
  "cloze",
  "typeAnswer",
  "matchPairs",
  "orderSteps",
  "slider",
  "explain",
];

export function Gallery() {
  const mounted = useMounted();
  return (
    <main id="content" className="mx-auto min-h-dvh w-full max-w-[760px] px-4 py-8 md:px-6 md:py-10">
      <AppHeader />
      <h1 className="mt-12 font-display text-4xl tracking-tight md:text-5xl">Every question format</h1>
      <p className="mt-3 text-muted">The same eight widgets a study session can ask.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <LevelBadge level={1} />
        <LevelBadge level={2} />
        <LevelBadge level={3} />
      </div>
      {mounted ? (
        ORDER.map((name) => <Preview key={name} spec={widgetSpecs[name]} />)
      ) : (
        <p className="mt-10 text-muted">Loading formats…</p>
      )}
    </main>
  );
}

function Preview({ spec }: { spec: WidgetSpec }) {
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<AnswerResult | null>(null);
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium tracking-[0.14em] text-muted uppercase">{WIDGET_LABELS[spec.widget]}</h2>
      <Card className="mt-3">
        <QuestionConceptProvider concept={sampleDeck.concepts[0]}>
          <div key={round}>{renderWidget(spec, setResult)}</div>
        </QuestionConceptProvider>
        {result ? (
          <FeedbackCard
            result={result}
            continueLabel="Try again"
            onContinue={() => {
              setResult(null);
              setRound((value) => value + 1);
            }}
          />
        ) : null}
      </Card>
    </section>
  );
}
