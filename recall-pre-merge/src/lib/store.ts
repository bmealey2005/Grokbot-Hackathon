"use client";

import { sampleDeck } from "@/fixtures";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { z } from "zod";
import { blankMastery } from "./scheduler";
import {
  Deck,
  MasteryRecordSchema,
  type Deck as DeckValue,
  type MasteryRecord,
} from "./schema";

export interface PersistedRecall {
  decks: DeckValue[];
  mastery: Record<string, Record<string, MasteryRecord>>;
}

export const EMPTY_PERSISTED: PersistedRecall = { decks: [], mastery: {} };

const PersistedRecallSchema = z.object({
  decks: z.array(Deck),
  mastery: z.record(z.string(), z.record(z.string(), MasteryRecordSchema)),
});

export const RECALL_STORE_KEY = "recall-store";

function unwrapPersist(input: unknown): unknown {
  if (input && typeof input === "object" && "state" in input) {
    return (input as { state: unknown }).state;
  }
  return input;
}

/** Drops unreadable or invalid saves instead of crashing the session. */
export function sanitizePersisted(input: unknown): PersistedRecall {
  const parsed = PersistedRecallSchema.safeParse(unwrapPersist(input));
  return parsed.success ? parsed.data : EMPTY_PERSISTED;
}

export function readPersisted(serialized: string | null): PersistedRecall {
  if (serialized == null || serialized.trim() === "") return EMPTY_PERSISTED;
  try {
    return sanitizePersisted(JSON.parse(serialized));
  } catch {
    return EMPTY_PERSISTED;
  }
}

function repairedStorageValue(raw: string | null): string {
  let version = 0;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { version?: unknown };
      if (parsed && typeof parsed === "object" && typeof parsed.version === "number") {
        version = parsed.version;
      }
    } catch {
      version = 0;
    }
  }
  return JSON.stringify({ state: readPersisted(raw), version });
}

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

function safeStorage(backing: StateStorage): StateStorage {
  return {
    getItem: (name) => {
      try {
        const raw = backing.getItem(name);
        if (isPromiseLike(raw)) {
          return Promise.resolve(raw)
            .then((value) => repairedStorageValue(value))
            .catch(() => repairedStorageValue(null));
        }
        return repairedStorageValue(raw);
      } catch {
        return repairedStorageValue(null);
      }
    },
    setItem: (name, value) => backing.setItem(name, value),
    removeItem: (name) => backing.removeItem(name),
  };
}

function browserStorage(): StateStorage {
  return {
    getItem: (name) => (typeof window === "undefined" ? null : window.localStorage.getItem(name)),
    setItem: (name, value) => {
      if (typeof window !== "undefined") window.localStorage.setItem(name, value);
    },
    removeItem: (name) => {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
    },
  };
}

export interface RecallStore extends PersistedRecall {
  loadSampleDeck: () => string;
  saveDeck: (deck: DeckValue) => void;
  recordMastery: (deckId: string, record: MasteryRecord) => void;
}

function withBlankMastery(
  deck: DeckValue,
  existing: Record<string, MasteryRecord> | undefined,
  now: number,
): Record<string, MasteryRecord> {
  const mastery = { ...(existing ?? {}) };
  for (const concept of deck.concepts) {
    if (!mastery[concept.id]) mastery[concept.id] = blankMastery(concept.id, now);
  }
  return mastery;
}

type StoreSet = (
  partial:
    | Partial<RecallStore>
    | ((state: RecallStore) => Partial<RecallStore>),
) => void;

function createRecallState(
  set: StoreSet,
  get: () => RecallStore,
): RecallStore {
  return {
    decks: [],
    mastery: {},
    loadSampleDeck: () => {
      const state = get();
      const hasDeck = state.decks.some((deck) => deck.id === sampleDeck.id);
      const now = Date.now();
      set({
        decks: hasDeck ? state.decks : [...state.decks, sampleDeck],
        mastery: {
          ...state.mastery,
          [sampleDeck.id]: withBlankMastery(sampleDeck, state.mastery[sampleDeck.id], now),
        },
      });
      return sampleDeck.id;
    },
    saveDeck: (deck) => {
      const state = get();
      const decks = state.decks.some((item) => item.id === deck.id)
        ? state.decks.map((item) => (item.id === deck.id ? deck : item))
        : [...state.decks, deck];
      set({
        decks,
        mastery: {
          ...state.mastery,
          [deck.id]: withBlankMastery(deck, state.mastery[deck.id], Date.now()),
        },
      });
    },
    recordMastery: (deckId, record) => {
      const state = get();
      const deckMastery = state.mastery[deckId] ?? {};
      set({
        mastery: {
          ...state.mastery,
          [deckId]: { ...deckMastery, [record.conceptId]: record },
        },
      });
    },
  };
}

export function createRecallStore(storage?: StateStorage) {
  return create<RecallStore>()(
    persist(createRecallState, {
      name: RECALL_STORE_KEY,
      storage: createJSONStorage(() => safeStorage(storage ?? browserStorage())),
      partialize: (state) => ({ decks: state.decks, mastery: state.mastery }),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersisted(persisted),
      }),
    }),
  );
}

export const useRecallStore = createRecallStore();
