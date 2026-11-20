"use client";

import { sampleDeck } from "@/fixtures";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchQuestion } from "./aiClient";
import type { AnswerResult } from "./schema";
import {
  createSessionRunner,
  type SessionCurrent,
  type SessionProgress,
  type SessionRunner,
  type SessionSnapshot,
} from "./session";
import { useRecallStore } from "./store";

const EMPTY_PROGRESS: SessionProgress = {
  answered: 0,
  correct: 0,
  conceptCount: 0,
  percent: 0,
  byConcept: [],
};

/**
 * Study-session hook for the focus screen.
 * `current` stays on the question just shown until the next envelope arrives.
 * `isLoading` is true during that gap (the following question is prefetched).
 */
export function useSession(deckId: string): {
  current: SessionCurrent | null;
  submit: (result: AnswerResult) => void;
  progress: SessionProgress;
  isLoading: boolean;
} {
  const deck = useRecallStore((state) => state.decks.find((item) => item.id === deckId));
  const runnerRef = useRef<SessionRunner | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [snapshot, setSnapshot] = useState<SessionSnapshot>({
    current: null,
    progress: EMPTY_PROGRESS,
    isLoading: true,
  });

  useEffect(() => {
    const ensure = () => {
      setHydrated(true);
      const state = useRecallStore.getState();
      if (deckId === sampleDeck.id && !state.decks.some((item) => item.id === deckId)) {
        state.loadSampleDeck();
      }
    };
    const unsubscribe = useRecallStore.persist.onFinishHydration(ensure);
    if (useRecallStore.persist.hasHydrated()) ensure();
    return unsubscribe;
  }, [deckId]);

  useEffect(() => {
    if (!deck) {
      runnerRef.current = null;
      return;
    }
    const runner = createSessionRunner({
      deck,
      getMastery: () => useRecallStore.getState().mastery[deck.id] ?? {},
      putMastery: (record) => useRecallStore.getState().recordMastery(deck.id, record),
      fetchQuestion: (request) => fetchQuestion(request),
    });
    runnerRef.current = runner;
    const unsubscribe = runner.subscribe(() => setSnapshot(runner.getSnapshot()));
    void runner.start();
    return () => {
      unsubscribe();
      runner.dispose();
      if (runnerRef.current === runner) runnerRef.current = null;
    };
  }, [deck]);

  const submit = useCallback((result: AnswerResult) => {
    runnerRef.current?.submit(result);
  }, []);

  const missing = hydrated && !deck;
  return {
    current: deck ? snapshot.current : null,
    submit,
    progress: deck ? snapshot.progress : EMPTY_PROGRESS,
    isLoading: !hydrated || (!missing && snapshot.isLoading),
  };
}
