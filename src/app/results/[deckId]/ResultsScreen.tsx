"use client";

import { AppHeader, ConceptTile, ResultsSkeleton, buttonClassName } from "@/components";
import { WIDGET_LABELS, formatDue } from "@/components/format";
import { readSessionLog, type SessionTurn } from "@/components/sessionLog";
import { useMounted } from "@/components/useMounted";
import { sampleDeck } from "@/fixtures";
import { masteryPercent } from "@/lib/scheduler";
import type { Level } from "@/lib/schema";
import { useRecallStore } from "@/lib/store";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ResultsScreen({ deckId }: { deckId: string }) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <main id="content" className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <AppHeader />
        <ResultsSkeleton />
      </main>
    );
  }
  return <ResultsReady deckId={deckId} />;
}

function ResultsReady({ deckId }: { deckId: string }) {
  const deck = useRecallStore((state) => state.decks.find((item) => item.id === deckId));
  const mastery = useRecallStore((state) => state.mastery[deckId]);
  const [turns] = useState<SessionTurn[]>(() => readSessionLog(deckId));
  const [looked, setLooked] = useState(false);

  useEffect(() => {
    if (deckId === sampleDeck.id) {
      const state = useRecallStore.getState();
      if (!state.decks.some((item) => item.id === deckId)) state.loadSampleDeck();
    }
    setLooked(true);
  }, [deckId]);

  if (!deck) {
    if (!looked || deckId === sampleDeck.id) {
      return (
        <main id="content" className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 md:px-6">
          <AppHeader />
          <ResultsSkeleton />
        </main>
      );
    }
    return (
      <main id="content" className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 md:px-6">
        <AppHeader />
        <h1 className="mt-16 font-display text-4xl tracking-tight">No results for this deck.</h1>
        <p className="mt-3 max-w-md leading-7 text-muted">It isn't saved in this browser.</p>
        <Link href="/" className="mt-6 font-medium text-accent">
          Make a quiz
        </Link>
      </main>
    );
  }

  const now = Date.now();
  const graded = turns.filter((turn) => !turn.reported);
  const accuracy =
    graded.length === 0 ? null : Math.round((100 * graded.filter((turn) => turn.correct).length) / graded.length);
  const widgets = [...new Set(turns.map((turn) => turn.widget))];
  const tiles = deck.concepts.map((concept) => {
    const record = mastery?.[concept.id];
    return {
      id: concept.id,
      term: concept.term,
      percent: record ? masteryPercent(record) : 0,
      level: (record?.level ?? 1) as Level,
      dueLabel: record ? formatDue(record.dueAt, now) : "Not studied yet",
    };
  });

  return (
    <main id="content" className="mx-auto min-h-dvh w-full max-w-5xl px-4 pt-6 pb-28 md:px-6 md:pt-10 md:pb-16">
      <AppHeader />
      <p className="mt-12 text-sm font-medium tracking-[0.16em] text-accent uppercase">{deck.title}</p>
      <h1 className="mt-3 max-w-2xl font-display text-4xl tracking-tight md:text-6xl">What you'll remember</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
        Strong ideas can wait. Shaky ones are due again soon.
      </p>

      <dl className="mt-8 grid grid-cols-3 gap-3">
        <Stat label="This session" value={accuracy === null ? "—" : `${accuracy}%`} />
        <Stat label="Answered" value={String(graded.length)} />
        <Stat label="Concepts" value={String(deck.concepts.length)} />
      </dl>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted">Formats this session</h2>
        {widgets.length === 0 ? (
          <p className="mt-2 text-ink">No questions yet. Start a session and this list fills in.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {widgets.map((widget) => (
              <li key={widget} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm">
                {WIDGET_LABELS[widget]}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <ConceptTile key={tile.id} term={tile.term} percent={tile.percent} level={tile.level} dueLabel={tile.dueLabel} />
        ))}
      </ul>

      <div className="action-bar mt-8 max-w-md">
        <Link href={`/study/${deckId}`} className={buttonClassName("primary", undefined, true)}>
          Study weak spots
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-3 py-4 md:px-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="stat-num mt-2 text-ink">{value}</dd>
    </div>
  );
}
