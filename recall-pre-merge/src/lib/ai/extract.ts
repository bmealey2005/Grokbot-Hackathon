import { buildLocalDeck } from "@/lib/localPractice";
import { Deck } from "@/lib/schema";
import { buildDeck } from "./concepts";
import { parseQuizlet } from "./quizlet";

/** Import Quizlet rows when they match, otherwise use the local notes parser. */
export function localDeckFromText(text: string, title?: string): Deck {
  const pairs = parseQuizlet(text);
  if (pairs) return Deck.parse(buildDeck(title?.trim() || "Imported cards", pairs));
  return Deck.parse(buildLocalDeck(text, title));
}
