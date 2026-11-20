import { QuestionEnvelopeSchema, type AnswerResult, type Concept, type Deck, type Level, type MasteryRecord, type QuestionEnvelope, type QuestionRequest, type WidgetSpec } from "./schema";
import { PROMOTE_AT, applyResult, blankMastery, masteryPercent } from "./scheduler";

export interface RecentTurn {
  conceptId: string;
  widget: WidgetSpec["widget"];
}

export interface SessionCurrent {
  envelope: QuestionEnvelope;
  concept: Concept;
  level: Level;
}

export interface ConceptProgress {
  conceptId: string;
  term: string;
  percent: number;
  level: Level;
  dueAt: number;
}

export interface SessionProgress {
  answered: number;
  correct: number;
  conceptCount: number;
  percent: number;
  byConcept: ConceptProgress[];
}

export interface SessionSnapshot {
  current: SessionCurrent | null;
  progress: SessionProgress;
  isLoading: boolean;
}

/** Unseen concepts are due now, so overdue reviews still come first. */
function dueTime(conceptId: string, mastery: Record<string, MasteryRecord>, now: number): number {
  return mastery[conceptId]?.dueAt ?? now;
}

function neighborsFor(deck: Deck, chosen: Concept): Concept[] {
  const related = new Set(chosen.related);
  const relatedConcepts = deck.concepts.filter((concept) => related.has(concept.id));
  const extras = deck.concepts.filter((concept) => concept.id !== chosen.id && !related.has(concept.id));
  return [...relatedConcepts, ...extras].slice(0, 4);
}

function earliestDue(
  concepts: Concept[],
  mastery: Record<string, MasteryRecord>,
  now: number,
): Concept {
  return concepts.reduce((best, concept) =>
    dueTime(concept.id, mastery, now) < dueTime(best.id, mastery, now) ? concept : best,
  );
}

function weakest(
  concepts: Concept[],
  mastery: Record<string, MasteryRecord>,
  now: number,
): Concept {
  const strength = (concept: Concept) => {
    const record = mastery[concept.id];
    return record ? masteryPercent(record) : 0;
  };
  return concepts.reduce((best, concept) => {
    const bestScore = strength(best);
    const score = strength(concept);
    if (score !== bestScore) return score < bestScore ? concept : best;
    return dueTime(concept.id, mastery, now) < dueTime(best.id, mastery, now) ? concept : best;
  });
}

/**
 * Picks the most overdue concept, or the weakest when nothing is due.
 * Skips the concept just asked when the deck has another one.
 */
export function nextQuestionRequest(
  deck: Deck,
  mastery: Record<string, MasteryRecord>,
  recent: RecentTurn[],
  now: number,
): QuestionRequest | null {
  if (deck.concepts.length === 0) return null;

  const lastId = recent.length > 0 ? recent[recent.length - 1].conceptId : undefined;
  const pool =
    deck.concepts.length > 1 && lastId
      ? deck.concepts.filter((concept) => concept.id !== lastId)
      : deck.concepts;

  const due = pool.filter((concept) => dueTime(concept.id, mastery, now) <= now);
  const chosen = due.length > 0 ? earliestDue(due, mastery, now) : weakest(pool, mastery, now);
  const level = mastery[chosen.id]?.level ?? 1;

  return {
    concept: chosen,
    neighbors: neighborsFor(deck, chosen),
    level,
    recentWidgets: recent.slice(-6).map((turn) => turn.widget),
  };
}

export function fallbackEnvelope(request: QuestionRequest): QuestionEnvelope {
  return {
    conceptIds: [request.concept.id],
    level: request.level,
    spec: {
      widget: "typeAnswer",
      props: {
        prompt: `Which term matches this description? ${request.concept.definition}`,
        accepted: [request.concept.term],
        explanation: request.concept.definition,
      },
    },
  };
}

export function requestKey(request: QuestionRequest): string {
  return JSON.stringify({
    conceptId: request.concept.id,
    level: request.level,
    recentWidgets: request.recentWidgets,
  });
}

export interface SessionRunner {
  start: () => Promise<void>;
  submit: (result: AnswerResult) => void;
  getSnapshot: () => SessionSnapshot;
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
}

export function createSessionRunner(options: {
  deck: Deck;
  getMastery: () => Record<string, MasteryRecord>;
  putMastery: (record: MasteryRecord) => void;
  fetchQuestion: (request: QuestionRequest) => Promise<unknown>;
  now?: () => number;
}): SessionRunner {
  const listeners = new Set<() => void>();
  let recent: RecentTurn[] = [];
  let answered = 0;
  let correct = 0;
  let current: SessionCurrent | null = null;
  let isLoading = true;
  let generation = 0;
  let busy = false;
  let disposed = false;
  let prefetch: { key: string; promise: Promise<QuestionEnvelope> } | null = null;

  const now = () => options.now?.() ?? Date.now();

  function buildProgress(): SessionProgress {
    const mastery = options.getMastery();
    const byConcept: ConceptProgress[] = options.deck.concepts.map((concept) => {
      const record = mastery[concept.id];
      return {
        conceptId: concept.id,
        term: concept.term,
        percent: record ? masteryPercent(record) : 0,
        level: record?.level ?? 1,
        dueAt: record?.dueAt ?? 0,
      };
    });
    const percent =
      byConcept.length === 0
        ? 0
        : Math.round(byConcept.reduce((sum, item) => sum + item.percent, 0) / byConcept.length);
    return {
      answered,
      correct,
      conceptCount: options.deck.concepts.length,
      percent,
      byConcept,
    };
  }

  let snapshot: SessionSnapshot = {
    current: null,
    progress: buildProgress(),
    isLoading: true,
  };

  function publish() {
    if (disposed) return;
    snapshot = { current, progress: buildProgress(), isLoading };
    for (const listener of listeners) listener();
  }

  function armPrefetch(mastery: Record<string, MasteryRecord>, at: number, envelope: QuestionEnvelope) {
    if (!current) return;
    const futureRecent = [
      ...recent,
      { conceptId: current.concept.id, widget: envelope.spec.widget },
    ];
    const next = nextQuestionRequest(options.deck, mastery, futureRecent, at);
    if (!next) {
      prefetch = null;
      return;
    }
    const key = requestKey(next);
    prefetch = {
      key,
      promise: options
        .fetchQuestion(next)
        .then((raw) => {
          const parsed = QuestionEnvelopeSchema.safeParse(raw);
          return parsed.success ? parsed.data : fallbackEnvelope(next);
        })
        .catch(() => fallbackEnvelope(next)),
    };
  }

  async function resolveEnvelope(request: QuestionRequest): Promise<QuestionEnvelope> {
    const key = requestKey(request);
    const pending = prefetch?.key === key ? prefetch.promise : null;
    if (prefetch?.key === key) prefetch = null;
    try {
      const raw = pending ? await pending : await options.fetchQuestion(request);
      const parsed = QuestionEnvelopeSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    } catch {
      // The fixture route or the network failed. A local card keeps the session moving.
    }
    return fallbackEnvelope(request);
  }

  async function load() {
    const token = ++generation;
    const showLoadingNow = !isLoading || current !== null;
    isLoading = true;
    // The first load is already in a loading snapshot. Publishing again here would
    // set React state synchronously inside useSession's effect.
    if (showLoadingNow) publish();
    try {
      const mastery = options.getMastery();
      const at = now();
      const request = nextQuestionRequest(options.deck, mastery, recent, at);
      if (disposed || token !== generation) return;
      if (!request) {
        current = null;
        prefetch = null;
        isLoading = false;
        publish();
        return;
      }
      const envelope = await resolveEnvelope(request);
      if (disposed || token !== generation) return;
      current = { envelope, concept: request.concept, level: request.level };
      isLoading = false;
      armPrefetch(mastery, at, envelope);
      publish();
    } catch {
      if (disposed || token !== generation) return;
      isLoading = false;
      publish();
    }
  }

  return {
    start: () => load(),
    submit(result) {
      if (!current || busy || disposed) return;
      busy = true;
      const conceptId = current.concept.id;
      const widget = current.envelope.spec.widget;
      const at = now();
      const prior = options.getMastery()[conceptId] ?? blankMastery(conceptId, at);
      options.putMastery(applyResult(prior, result.score, at, widget));
      recent = [...recent, { conceptId, widget }];
      answered += 1;
      if (result.correct || result.score >= PROMOTE_AT) correct += 1;
      void load().finally(() => {
        busy = false;
      });
    },
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      generation += 1;
      listeners.clear();
    },
  };
}
