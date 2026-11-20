import { sampleDeck } from "@/fixtures";
import type { StateStorage } from "zustand/middleware";
import { beforeEach, describe, expect, it } from "vitest";
import { blankMastery } from "./scheduler";
import { EMPTY_PERSISTED, RECALL_STORE_KEY, createRecallStore, readPersisted, useRecallStore } from "./store";

function memoryStorage(initial?: string): StateStorage & { dump: Map<string, string> } {
  const dump = new Map<string, string>();
  if (initial !== undefined) dump.set(RECALL_STORE_KEY, initial);
  return {
    dump,
    getItem: (name) => dump.get(name) ?? null,
    setItem: (name, value) => {
      dump.set(name, value);
    },
    removeItem: (name) => {
      dump.delete(name);
    },
  };
}

async function hydrate(store: ReturnType<typeof createRecallStore>) {
  await store.persist.rehydrate();
}

describe("readPersisted", () => {
  it("recovers from missing, corrupt, and invalid saves", () => {
    expect(readPersisted(null)).toEqual(EMPTY_PERSISTED);
    expect(readPersisted("")).toEqual(EMPTY_PERSISTED);
    expect(readPersisted("{not json")).toEqual(EMPTY_PERSISTED);
    expect(readPersisted("{}")).toEqual(EMPTY_PERSISTED);
    expect(readPersisted(JSON.stringify({ state: { decks: "nope", mastery: {} } }))).toEqual(EMPTY_PERSISTED);
    expect(readPersisted(JSON.stringify({ state: null }))).toEqual(EMPTY_PERSISTED);
  });

  it("reads a valid save with or without the zustand wrapper", () => {
    const state = {
      decks: [sampleDeck],
      mastery: { [sampleDeck.id]: { mitochondria: blankMastery("mitochondria", 50) } },
    };
    expect(readPersisted(JSON.stringify(state)).decks[0]?.title).toBe("Cell Biology Basics");
    expect(readPersisted(JSON.stringify({ state, version: 0 })).mastery[sampleDeck.id]?.mitochondria.dueAt).toBe(50);
  });
});

describe("recall store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rehydrates a corrupt localStorage value and can still load the sample deck", async () => {
    const storage = memoryStorage("{not json");
    const store = createRecallStore(storage);
    await hydrate(store);

    expect(store.getState().decks).toEqual([]);
    expect(store.getState().mastery).toEqual({});
    expect(store.getState().loadSampleDeck()).toBe(sampleDeck.id);
    expect(store.getState().decks).toHaveLength(1);
    expect(store.getState().mastery[sampleDeck.id]?.mitochondria.level).toBe(1);

    const saved = readPersisted(storage.dump.get(RECALL_STORE_KEY) ?? null);
    expect(saved.decks).toHaveLength(1);
  });

  it("loads the sample deck once and does not reset mastery", () => {
    const store = createRecallStore(memoryStorage());
    store.getState().loadSampleDeck();
    const conceptId = sampleDeck.concepts[0]?.id ?? "mitochondria";
    const existing = store.getState().mastery[sampleDeck.id]?.[conceptId];
    expect(existing).toBeDefined();
    store.getState().recordMastery(sampleDeck.id, { ...existing!, streak: 4, level: 3 });
    store.getState().loadSampleDeck();

    expect(store.getState().decks).toHaveLength(1);
    expect(store.getState().mastery[sampleDeck.id]?.[conceptId]?.streak).toBe(4);
    expect(store.getState().mastery[sampleDeck.id]?.[conceptId]?.level).toBe(3);
  });

  it("keeps the singleton usable after a bad localStorage value", async () => {
    localStorage.setItem(RECALL_STORE_KEY, "{\"state\":{\"decks\":[{\"id\":1}]}}");
    await useRecallStore.persist.rehydrate();
    expect(useRecallStore.getState().decks).toEqual([]);
    useRecallStore.getState().loadSampleDeck();
    expect(useRecallStore.getState().decks[0]?.title).toBe("Cell Biology Basics");
  });
});
