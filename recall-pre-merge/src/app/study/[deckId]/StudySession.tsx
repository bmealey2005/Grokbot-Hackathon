"use client";

import { AppHeader, FeedbackCard, LevelBadge, ProgressBar, QuestionSkeleton } from "@/components";
import { appendSessionTurn } from "@/components/sessionLog";
import { useMounted } from "@/components/useMounted";
import { useRecallStore } from "@/lib/store";
import type { AnswerResult } from "@/lib/schema";
import { useSession } from "@/lib/useSession";
import { QuestionConceptProvider } from "@/widgets/QuestionContext";
import { renderWidget } from "@/widgets/registry";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export function StudySession({ deckId }: { deckId: string }) {
  const { current, submit, progress, isLoading } = useSession(deckId);
  const deck = useRecallStore((state) => state.decks.find((item) => item.id === deckId));
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const [pending, setPending] = useState<AnswerResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const guard = useRef(false);
  const questionKey = current ? `${progress.answered}:${current.concept.id}:${current.envelope.spec.widget}` : "loading";

  const continueNext = useCallback(() => {
    if (!pending || !current || guard.current) return;
    guard.current = true;
    appendSessionTurn(deckId, {
      widget: current.envelope.spec.widget,
      score: pending.score,
      correct: pending.correct || pending.score >= 0.8,
      at: Date.now(),
    });
    setNotice(null);
    setPending(null);
    submit(pending);
  }, [pending, current, deckId, submit]);

  useEffect(() => {
    if (!isLoading) guard.current = false;
  }, [isLoading, questionKey]);

  useEffect(() => {
    if (!pending) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      continueNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, continueNext]);

  function report() {
    if (!current || pending || isLoading || guard.current) return;
    guard.current = true;
    appendSessionTurn(deckId, {
      widget: current.envelope.spec.widget,
      score: 0.5,
      correct: false,
      reported: true,
      at: Date.now(),
    });
    setNotice("Question skipped.");
    submit({ correct: false, score: 0.5 });
  }

  function onWidgetSubmit(result: AnswerResult) {
    setNotice(null);
    setPending(result);
  }

  const showQuestion = Boolean(mounted && current && (pending || !isLoading));
  const missing = Boolean(mounted && !current && !isLoading);
  const tone = !pending ? "" : pending.correct || pending.score >= 0.8 ? "right" : pending.score > 0 ? "close" : "wrong";

  return (
    <div data-sticky-actions>
      <div className="fixed inset-x-0 top-0 z-40">
        <ProgressBar value={progress.percent} label="Deck mastery" />
      </div>
      <main id="content" className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 pt-6 pb-28 md:px-6 md:pt-10 md:pb-16">
        <AppHeader
          action={
            <Link href={`/results/${deckId}`} className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-muted hover:text-ink">
              End session
            </Link>
          }
        />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-sm font-medium text-muted">{deck?.title ?? "Study"}</h1>
          <p className="text-sm text-muted">
            {progress.answered} answered · {progress.correct} correct
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {notice}
        </p>

        {missing ? (
          <div className="mt-16">
            <h2 className="font-display text-4xl tracking-tight">This deck is not on this device.</h2>
            <p className="mt-3 max-w-md leading-7 text-muted">
              Recall keeps decks in this browser. Paste your notes again, or start from the sample deck.
            </p>
            <Link href="/" className="mt-6 inline-flex min-h-12 items-center font-medium text-accent">
              Back home
            </Link>
          </div>
        ) : null}

        {!missing && !showQuestion ? <QuestionSkeleton /> : null}

        <AnimatePresence mode="wait">
          {showQuestion && current ? (
            <motion.div
              key={questionKey}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={
                tone === "wrong" && !reduce
                  ? { opacity: 1, y: 0, x: [0, -8, 8, -4, 4, 0] }
                  : tone === "right" && !reduce
                    ? { opacity: 1, y: 0, scale: [1, 1.015, 1] }
                    : { opacity: 1, y: 0, x: 0, scale: 1 }
              }
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="mt-6"
            >
              <div className="mb-5">
                <LevelBadge level={current.level} />
              </div>
              <QuestionConceptProvider concept={current.concept}>
                {renderWidget(current.envelope.spec, onWidgetSubmit)}
              </QuestionConceptProvider>
              {pending ? (
                <FeedbackCard result={pending} onContinue={continueNext} />
              ) : (
                <button type="button" className="mt-4 min-h-11 text-sm text-muted underline-offset-4 hover:underline" onClick={report}>
                  Report question
                </button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
