"use client";

import { StudyClientError, extractDeck } from "@/lib/studyClient";
import type { Concept, Deck } from "@/lib/schema";
import { SAMPLE_DECK_ID } from "@/fixtures";
import { useRecallStore } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppHeader, Button, Card } from "@/components";
import { resetSessionLog } from "@/components/sessionLog";

type Phase = "compose" | "loading" | "review";

export function HomeScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("compose");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function makeQuiz() {
    const text = notes.trim();
    if (text.length < 8) {
      setError("Paste a bit more text so there's something to study.");
      return;
    }
    setError(null);
    setPhase("loading");
    try {
      const response = await extractDeck({ text, title: title.trim() || undefined });
      if (response.deck.concepts.length === 0) {
        setError("No concepts came back. Try notes with a few clear terms.");
        setPhase("compose");
        return;
      }
      const id = response.deck.id === SAMPLE_DECK_ID ? `deck-${Date.now()}` : response.deck.id;
      setDraft({
        ...response.deck,
        id,
        title: title.trim() || response.deck.title,
      });
      setPhase("review");
    } catch (error) {
      setError(
        error instanceof StudyClientError
          ? error.message
          : "Those notes did not come through. Try again, or start with the sample deck.",
      );
      setPhase("compose");
    }
  }

  function studySample() {
    const id = useRecallStore.getState().loadSampleDeck();
    resetSessionLog(id);
    router.push(`/study/${id}`);
  }

  function startDraft() {
    if (!draft) return;
    const concepts = draft.concepts.map((concept) => ({
      ...concept,
      term: concept.term.trim(),
      definition: concept.definition.trim(),
    }));
    if (concepts.length === 0 || concepts.some((concept) => !concept.term || !concept.definition)) {
      setError("Every concept needs a term and a definition.");
      return;
    }
    const next = { ...draft, title: draft.title.trim() || "Untitled deck", concepts };
    useRecallStore.getState().saveDeck(next);
    resetSessionLog(next.id);
    router.push(`/study/${next.id}`);
  }

  return (
    <div data-sticky-actions>
      <main id="content" className="mx-auto flex min-h-dvh w-full max-w-[760px] flex-col px-4 pt-6 pb-28 md:px-6 md:pt-10 md:pb-16">
        <AppHeader />
        <p className="mt-14 text-sm font-medium tracking-[0.16em] text-accent uppercase">Active recall</p>
        <h1 className="hero-title mt-4 text-ink">
          Stop flipping cards.
          <span className="mt-1 block text-accent italic">Start remembering.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
          Paste your notes. Recall asks one question at a time, in the format that fits what you know, then brings it back before you forget.
        </p>

        {phase === "review" && draft ? (
          <Review
            draft={draft}
            error={error}
            onChange={setDraft}
            onBack={() => {
              setError(null);
              setPhase("compose");
            }}
            onStart={startDraft}
          />
        ) : (
          <Card className="mt-10">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void makeQuiz();
              }}
            >
              <label className="block text-sm font-medium" htmlFor="deck-title">
                Title, if you want one
              </label>
              <input
                id="deck-title"
                className="field mt-2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Cell biology, exam Friday"
                disabled={phase === "loading"}
              />
              <label className="mt-5 block text-sm font-medium" htmlFor="notes">
                Notes, a term list, or a Quizlet export
              </label>
              <textarea
                id="notes"
                className="field mt-2 min-h-52 resize-y"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="The mitochondrion produces most of a cell's ATP. Osmosis moves water toward higher solute concentration."
                disabled={phase === "loading"}
              />
              {error ? (
                <p className="mt-3 text-sm text-wrong" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mt-4">
                <Button type="button" variant="secondary" fullWidth onClick={studySample} disabled={phase === "loading"}>
                  Try a sample deck
                </Button>
              </div>
              <div className="action-bar">
                <Button type="submit" fullWidth disabled={phase === "loading"}>
                  {phase === "loading" ? "Reading your notes…" : "Make my quiz"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <ol className="mt-12 grid gap-4 text-sm leading-6 text-muted sm:grid-cols-3">
          <li>
            <span className="block font-medium text-ink">01</span>
            One question at a time.
          </li>
          <li>
            <span className="block font-medium text-ink">02</span>
            The format changes as you learn.
          </li>
          <li>
            <span className="block font-medium text-ink">03</span>
            Weak ideas come back before you forget them.
          </li>
        </ol>
        <p className="mt-10 text-sm text-faint">Nothing to sign in to. Decks stay on this device.</p>
      </main>
    </div>
  );
}

function Review({
  draft,
  error,
  onChange,
  onBack,
  onStart,
}: {
  draft: Deck;
  error: string | null;
  onChange: (deck: Deck) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  function update(id: string, patch: Partial<Pick<Concept, "term" | "definition">>) {
    onChange({
      ...draft,
      concepts: draft.concepts.map((concept) => (concept.id === id ? { ...concept, ...patch } : concept)),
    });
  }

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl tracking-tight">Check the concepts</h2>
          <p className="mt-2 text-muted">Edit a term, or drop anything you do not want to study.</p>
        </div>
        <button type="button" className="min-h-11 shrink-0 text-sm font-medium text-accent" onClick={onBack}>
          Edit notes
        </button>
      </div>
      <label className="mt-6 block text-sm font-medium" htmlFor="review-title">
        Deck title
      </label>
      <input
        id="review-title"
        className="field mt-2"
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
      />
      {draft.concepts.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-card p-5 text-muted">
          No concepts left. Edit your notes and make the quiz again.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {draft.concepts.map((concept) => (
            <li key={concept.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-start gap-2">
                <label className="sr-only" htmlFor={`term-${concept.id}`}>
                  Term
                </label>
                <input
                  id={`term-${concept.id}`}
                  className="field"
                  value={concept.term}
                  onChange={(event) => update(concept.id, { term: event.target.value })}
                />
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-wrong-soft hover:text-wrong"
                  aria-label={`Remove ${concept.term || "concept"}`}
                  onClick={() =>
                    onChange({ ...draft, concepts: draft.concepts.filter((item) => item.id !== concept.id) })
                  }
                >
                  ×
                </button>
              </div>
              <label className="sr-only" htmlFor={`definition-${concept.id}`}>
                Definition for {concept.term || "concept"}
              </label>
              <textarea
                id={`definition-${concept.id}`}
                className="field mt-2 min-h-20 resize-y"
                value={concept.definition}
                onChange={(event) => update(concept.id, { definition: event.target.value })}
              />
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p className="mt-4 text-sm text-wrong" role="alert">
          {error}
        </p>
      ) : null}
      <div className="action-bar">
        <Button type="button" fullWidth onClick={onStart} disabled={draft.concepts.length === 0}>
          Start studying
        </Button>
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/study/cell-biology-basics" className="underline underline-offset-4">
          Or study the sample deck instead
        </Link>
      </p>
    </section>
  );
}
