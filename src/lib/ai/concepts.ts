import type { Concept, Deck } from "@/lib/schema";

export interface RawConcept {
  term: string;
  definition: string;
  facts?: string[];
  related?: string[];
}

export function slugify(term: string): string {
  const slug = term
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "concept";
}

export function limitWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, max).join(" ");
}

/** Stable ids are the slug plus a 1-based index, assigned on import. */
export function assignConceptIds(raw: RawConcept[]): Concept[] {
  const staged = raw.map((item, index) => ({
    id: `${slugify(item.term)}-${index + 1}`,
    term: item.term.trim(),
    definition: limitWords(item.definition, 25),
    facts: (item.facts ?? [])
      .map((fact) => fact.trim())
      .filter(Boolean)
      .slice(0, 3),
    relatedTerms: item.related ?? [],
  }));
  const ids = new Set(staged.map((item) => item.id));
  const byTerm = new Map(staged.map((item) => [item.term.toLowerCase(), item.id]));

  return staged.map((item) => {
    const related: string[] = [];
    for (const token of item.relatedTerms) {
      const key = token.trim();
      if (!key) continue;
      const id = byTerm.get(key.toLowerCase()) ?? (ids.has(key) ? key : undefined);
      if (!id || id === item.id || related.includes(id)) continue;
      related.push(id);
    }
    return {
      id: item.id,
      term: item.term,
      definition: item.definition,
      facts: item.facts,
      related,
    };
  });
}

export function buildDeck(title: string, raw: RawConcept[]): Deck {
  const cleanTitle = title.trim() || "Study deck";
  return {
    id: `reading-${crypto.randomUUID()}`,
    title: cleanTitle,
    concepts: assignConceptIds(raw),
    createdAt: Date.now(),
  };
}
