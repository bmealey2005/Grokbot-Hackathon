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

export function hash32(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function limitWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, max).join(" ");
}

/** Drop details that do not share their content words with the source notes. */
export function groundedFacts(facts: string[], source: string): string[] {
  const haystack = source.toLowerCase();
  const kept: string[] = [];
  for (const fact of facts) {
    const cleaned = fact.trim();
    if (!cleaned) continue;
    const words = cleaned.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
    if (words.length === 0) {
      if (haystack.includes(cleaned.toLowerCase())) kept.push(cleaned);
    } else {
      const hits = words.filter((word) => haystack.includes(word)).length;
      if (hits / words.length >= 0.5) kept.push(cleaned);
    }
    if (kept.length === 3) break;
  }
  return kept;
}

/** Stable ids are the slug plus a 1-based index, assigned on the server. */
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

export function buildDeck(title: string, raw: RawConcept[], sourceForId: string): Deck {
  const cleanTitle = title.trim() || "Study deck";
  return {
    id: `${slugify(cleanTitle).slice(0, 32)}-${hash32(sourceForId)}`,
    title: cleanTitle,
    concepts: assignConceptIds(raw),
    createdAt: Date.now(),
  };
}
