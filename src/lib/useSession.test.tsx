import { sampleDeck } from "@/fixtures";
import { envelopeFromFixture } from "@/fixtures/widgets";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecallStore } from "./store";
import { useSession } from "./useSession";

describe("useSession", () => {
  beforeEach(() => {
    localStorage.clear();
    useRecallStore.setState({ decks: [], mastery: {} });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        return new Response(JSON.stringify(envelopeFromFixture(body)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });

  it("returns the current question, submit, progress, and loading flag", async () => {
    const { result } = renderHook(() => useSession(sampleDeck.id));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.current).not.toBeNull();
    });

    const firstId = result.current.current?.concept.id;
    expect(result.current.progress.conceptCount).toBe(12);
    expect(result.current.progress.answered).toBe(0);
    expect(typeof result.current.submit).toBe("function");

    act(() => {
      result.current.submit({ correct: true, score: 1 });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.current?.concept.id).not.toBe(firstId);
      expect(result.current.progress.answered).toBe(1);
    });
  });
});
