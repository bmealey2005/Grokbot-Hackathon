"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { sampleDeck } from "@/fixtures";
import { extractDeck } from "@/lib/aiClient";
import { Deck, type Concept } from "@/lib/schema";
import { masteryPercent } from "@/lib/scheduler";
import { useRecallStore } from "@/lib/store";
import { useSession } from "@/lib/useSession";
import { Action, Icon } from "./recall-primitives";
import { Question } from "./recall-question";

const MAX_NOTE_LENGTH = 40_000;
const SESSION_LENGTH = 6;
const MASTERY_LABELS = ["", "Recognize", "Recall", "Apply"];

function Brand() {
  return (
    <Link href="/" className="recall-brand">
      <span className="recall-mark"><Icon kind="book" /></span>
      <span>Recall</span>
    </Link>
  );
}

function Evidence({ concept }: { concept: Concept }) {
  return (
    <aside className="recall-evidence" aria-label="Source evidence">
      <div className="recall-evidence-heading"><Icon kind="book" /><h2>Source evidence</h2></div>
      <h3>{concept.term}</h3>
      <p>{concept.definition}</p>
      {concept.facts.length > 0 && <ul>{concept.facts.slice(0, 3).map((fact, index) => <li key={index}>{fact}</li>)}</ul>}
    </aside>
  );
}

function ImportReading({ onImport, onCancel }: { onImport: (deck: Deck) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reading = useRef<HTMLTextAreaElement>(null);

  async function addFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("Choose a .txt or .md file.");
      return;
    }
    if (file.size > MAX_NOTE_LENGTH * 4) {
      setError("Choose a reading under 40,000 characters.");
      return;
    }
    try {
      const contents = await file.text();
      if (contents.length > MAX_NOTE_LENGTH) {
        setError("Choose a reading under 40,000 characters.");
        return;
      }
      setTitle(file.name.replace(/\.(txt|md)$/i, ""));
      setText(contents);
      reading.current?.focus();
    } catch {
      setError("The reading couldn’t be opened. You can paste its text instead.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (text.trim().length < 24) {
      setError("Add a few complete sentences to study.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await extractDeck({ title: title.trim() || undefined, text: text.trim() });
      const deck = Deck.parse(response.deck);
      if (deck.id === sampleDeck.id || deck.concepts.length === 0) throw new Error("No new reading");
      onImport(deck);
    } catch {
      setError("Recall couldn’t generate a study map from these notes. Your text is still here. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="recall-reading" aria-labelledby="add-reading">
      <h1 id="add-reading">Add a reading</h1>
      <p className="recall-intro">Turn your notes into a concept map and practice questions.</p>
      <form className="recall-import" onSubmit={submit}>
        <label>Reading title <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Give your reading a title" /></label>
        <label>Reading text <textarea ref={reading} value={text} maxLength={MAX_NOTE_LENGTH} onChange={(event) => setText(event.target.value)} placeholder="Paste your notes here" rows={8} /></label>
        <label className="recall-file">Upload a text file <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(event) => void addFile(event.target.files?.[0])} /></label>
        {error && <p className="recall-error" role="alert">{error}</p>}
        <div className="recall-actions"><Action loading={loading} disabled={loading} type="submit">{loading ? "Creating study map…" : "Create study map"}<Icon kind="arrow" /></Action><Action type="button" className="recall-secondary" onClick={onCancel}>Cancel</Action></div>
      </form>
    </section>
  );
}

export function RecallLibrary() {
  const router = useRouter();
  const savedDecks = useRecallStore((state) => state.decks);
  const saveDeck = useRecallStore((state) => state.saveDeck);
  const [selectedId, setSelectedId] = useState(sampleDeck.id);
  const [importing, setImporting] = useState(false);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const decks = [sampleDeck, ...savedDecks.filter((deck) => deck.id !== sampleDeck.id)];
  const selected = decks.find((deck) => deck.id === selectedId) ?? sampleDeck;
  const evidence = selected.concepts.find((concept) => concept.id === evidenceId) ?? selected.concepts[0];
  const shownConcepts = selected.concepts.slice(0, 8);

  return (
    <div className="recall-shell">
      <nav className="recall-sidebar" aria-label="Reading library">
        <Brand />
        <Action className="recall-secondary recall-add" onClick={() => setImporting(true)}><Icon kind="plus" />Add reading</Action>
        <h2>Library</h2>
        <ul className="recall-decks">
          {decks.map((deck) => <li key={deck.id}><button type="button" aria-pressed={!importing && deck.id === selected.id} onClick={() => {
            setSelectedId(deck.id);
            setEvidenceId(null);
            setImporting(false);
          }}><Icon kind="book" /><span>{deck.title}</span></button></li>)}
        </ul>
      </nav>
      <main className="recall-main">
        {importing ? <ImportReading onCancel={() => setImporting(false)} onImport={(deck) => {
          saveDeck(deck);
          setSelectedId(deck.id);
          setEvidenceId(null);
          setImporting(false);
        }} /> : (
          <>
            <header className="recall-reading-header">
              <h1>{selected.title}</h1>
              <p className="recall-intro">{selected.concepts.length} concepts to review</p>
              <div className="recall-actions"><Action onClick={() => router.push(`/study/${encodeURIComponent(selected.id)}`)}>Start practice<Icon kind="arrow" /></Action></div>
            </header>
            <div className="recall-content-grid">
              <section aria-labelledby="concept-map" className="recall-concepts">
                <h2 id="concept-map">Concept map</h2>
                <ul>
                  {shownConcepts.map((concept) => <li key={concept.id}><button type="button" aria-pressed={concept.id === evidence?.id} onClick={() => setEvidenceId(concept.id)}>
                    <span className="recall-concept-point" /><span><strong>{concept.term}</strong><span className="recall-concept-definition">{concept.definition}</span></span><Icon kind="arrow" />
                  </button></li>)}
                </ul>
                {selected.concepts.length > shownConcepts.length && <p className="recall-caption">Practice covers all {selected.concepts.length} concepts.</p>}
              </section>
              {evidence && <Evidence concept={evidence} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function FocusShell({ children, context }: { children: ReactNode; context?: string }) {
  return (
    <div className="recall-focus-shell">
      <nav className="recall-topbar" aria-label="Recall navigation">
        <Brand />
        {context && <span className="recall-top-context">{context}</span>}
        <Link href="/" className="recall-library-link">Library</Link>
      </nav>
      <main className="recall-focus-main">{children}</main>
    </div>
  );
}

export function RecallStudy({ deckId }: { deckId: string }) {
  const router = useRouter();
  const deck = useRecallStore((state) => state.decks.find((item) => item.id === deckId));
  const { current, submit, progress, isLoading } = useSession(deckId);
  const total = Math.min(SESSION_LENGTH, Math.max(3, deck?.concepts.length ?? SESSION_LENGTH));
  const title = deck?.title ?? (deckId === sampleDeck.id ? sampleDeck.title : "Study");
  return (
    <FocusShell context={title}>
      <div className="recall-session-progress">
        <span>Question {Math.min(progress.answered + 1, total)} of {total}</span>
        <progress max={total} value={Math.min(progress.answered, total)} aria-label="Practice progress" />
      </div>
      {!current ? <section className="recall-reading">
        <h1>{isLoading ? "Loading practice…" : "Reading not found"}</h1>
        {!isLoading && <Link href="/">Back to the library</Link>}
      </section> : <Question key={`${progress.answered}-${current.concept.id}`} current={current} isLoading={isLoading}
        finish={progress.answered + 1 >= total} onContinue={(result) => {
          submit(result);
          if (progress.answered + 1 >= total) router.push(`/results/${encodeURIComponent(deckId)}`);
        }} evidence={<Evidence concept={current.concept} />} />}
    </FocusShell>
  );
}

export function RecallResults({ deckId }: { deckId: string }) {
  const router = useRouter();
  const saved = useRecallStore((state) => state.decks.find((item) => item.id === deckId));
  const records = useRecallStore((state) => state.mastery[deckId]);
  const deck = saved ?? (deckId === sampleDeck.id ? sampleDeck : null);
  const reviewed = Object.values(records ?? {}).filter((record) => record.history.length > 0).length;

  return (
    <FocusShell context={deck?.title}>
      <section className="recall-reading">
        <h1>{deck ? "Practice results" : "Reading not found"}</h1>
        {deck && <><p className="recall-intro">{reviewed} of {deck.concepts.length} concepts practiced</p>
          <div className="recall-actions"><Action onClick={() => router.push(`/study/${encodeURIComponent(deck.id)}`)}>Practice again<Icon kind="arrow" /></Action></div>
          <ul className="recall-results" aria-label="Concept mastery">
            {deck.concepts.map((concept) => {
              const record = records?.[concept.id];
              const practiced = Boolean(record?.history.length);
              return <li key={concept.id}><strong>{concept.term}</strong><progress max={100} value={record ? masteryPercent(record) : 0} aria-label={`${concept.term} mastery`} /><span>{record && practiced ? MASTERY_LABELS[record.level] : "Ready to study"}</span></li>;
            })}
          </ul></>}
      </section>
    </FocusShell>
  );
}
