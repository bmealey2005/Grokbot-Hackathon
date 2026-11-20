import type { WidgetSpec } from "@/lib/schema";

export interface SessionTurn {
  widget: WidgetSpec["widget"];
  score: number;
  correct: boolean;
  reported?: boolean;
  at: number;
}

function key(deckId: string) {
  return `recall-session:${deckId}`;
}

export function readSessionLog(deckId: string): SessionTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(key(deckId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionTurn[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendSessionTurn(deckId: string, turn: SessionTurn) {
  const next = [...readSessionLog(deckId), turn];
  sessionStorage.setItem(key(deckId), JSON.stringify(next));
}

export function resetSessionLog(deckId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(key(deckId));
}
