import { z } from "zod";
import { WidgetSpec, type Concept, type GradeRequest, type QuestionRequest } from "@/lib/schema";

let registryCache: string | null = null;

/** JSON schema for the eight widgets, derived from the shared zod contract. */
export function widgetRegistryText(): string {
  if (!registryCache) {
    const schema = z.toJSONSchema(WidgetSpec) as Record<string, unknown>;
    delete schema.$schema;
    registryCache = JSON.stringify(schema);
  }
  return registryCache;
}

function formatConcept(concept: Concept): string {
  const facts = concept.facts.length ? concept.facts.map((fact) => `- ${fact}`).join("\n") : "- (none)";
  return [`term: ${concept.term}`, `definition: ${concept.definition}`, "facts:", facts].join("\n");
}

export function questionSystemPrompt(): string {
  return `You write one study question for Recall, a generative-UI flashcard app.
Return JSON of the form { "spec": <widget> }. The spec must match this JSON schema exactly:
${widgetRegistryText()}

Allowed widgets by mastery level:
- Level 1, Recognize: multipleChoice, trueFalse.
- Level 2, Recall: cloze, typeAnswer, matchPairs. For matchPairs, pair the target concept with its neighbors.
- Level 3, Apply: orderSteps only when the concept is a real sequence or process, slider only when the concept states a number, explain for why and how, and multipleChoice only as a short scenario that makes the student apply the idea.

Quality rules:
- Distractors are plausible, drawn from the neighbor concepts when any are provided, and similar in length and grammar to the correct answer.
- Never use "all of the above" or "none of the above".
- The student must not be able to guess the answer from wording alone. Do not echo the definition beside only the correct option, and do not hide a unique keyword in the correct choice.
- cloze text uses the marker {{blank}}. The number of {{blank}} markers equals answers.length. Each blank lists acceptable spellings.
- orderSteps lists steps in the correct order. Use it only for a sequence the concept actually describes.
- slider answer is inside [min, max]. Use it only for a numeric fact stated in the concept.
- explain includes 2 to 4 concrete rubric points a grader can check. Each point is one idea from the concept.
- Do not pick a widget listed under recently used widgets unless every other widget allowed for this level fails to fit the concept.
- Stay faithful to the concept, its facts, and the neighbors. Do not invent numbers, steps, or definitions.`;
}

export function questionUserPrompt(req: QuestionRequest): string {
  const neighbors = req.neighbors.length
    ? req.neighbors.map((concept) => formatConcept(concept)).join("\n\n")
    : "(none)";
  const recent = req.recentWidgets.length ? req.recentWidgets.join(", ") : "(none)";
  return `Write one question at level ${req.level}.

Target concept:
${formatConcept(req.concept)}

Neighbor concepts, for distractors and match pairs only:
${neighbors}

Avoid these recently used widgets: ${recent}`;
}

export function extractSystemPrompt(): string {
  return `You extract atomic study concepts from a student's own notes.
Return JSON { "title": string, "concepts": [{ "term": string, "definition": string, "facts": string[], "related": string[] }] }.

Rules:
- Produce 5 to 25 concepts. Each concept is one idea.
- term is short: the name a student should be asked to recall.
- definition is 25 words or fewer and says only what the notes say.
- facts holds 0 to 3 short supporting details copied from the source. Never invent facts, numbers, examples, or mechanisms that are not in the notes. If the notes do not support an extra detail, return an empty facts array. This is mandatory: every fact must come from the source text.
- related lists the terms, not ids, of other concepts in this same extraction that a student could confuse with this one or that belong to the same process.
- title is a short deck title. If the user already supplied a title, repeat it.
- Do not add concepts the notes do not support. Split genuine ideas instead of padding.`;
}

export function extractUserPrompt(text: string, title?: string): string {
  const titleLine = title?.trim() ? `Preferred title: ${title.trim()}` : "Choose a short title from the notes.";
  return `${titleLine}

Notes:
"""
${text}
"""`;
}

export function enrichSystemPrompt(): string {
  return `You add supporting facts to flashcards parsed from a term-and-definition export.
Return JSON { "concepts": [{ "term": string, "facts": string[] }] }.
For each term, facts contains 0 to 3 details that appear in the source text and are not a restatement of the definition. Never invent facts that are not in the source. If the source has no extra detail, return an empty facts array for that term. Keep every input term, and do not add terms.`;
}

export function enrichUserPrompt(text: string, concepts: { term: string; definition: string }[]): string {
  const lines = concepts.map((concept) => `- ${concept.term}: ${concept.definition}`).join("\n");
  return `Source text:
"""
${text}
"""

Cards:
${lines}`;
}

export function gradeSystemPrompt(): string {
  return `You grade a student's free-text explanation of a study concept.
Return JSON { "score": number, "feedback": string, "missing": string[] }.

Rules:
- score is from 0 to 1 and is the fraction of rubric points the answer substantively covers. Partial credit is allowed.
- Accept paraphrases. Do not penalize spelling, grammar, or word order.
- missing lists the rubric points that were not covered. Copy those points exactly from the rubric. Leave missing empty when every point is covered.
- feedback is exactly one encouraging, specific sentence. Name what was right, or the most important missing idea. No preamble and no list.
- Do not mark an answer wrong only because it uses different words than the rubric.`;
}

export function gradeUserPrompt(input: GradeRequest): string {
  const facts = input.concept.facts.length
    ? input.concept.facts.map((fact) => `- ${fact}`).join("\n")
    : "- (none)";
  const rubric = input.rubric.map((point, index) => `${index + 1}. ${point}`).join("\n");
  return `Concept term: ${input.concept.term}
Concept definition: ${input.concept.definition}
Facts:
${facts}

Question: ${input.prompt}

Rubric:
${rubric || "(empty)"}

Student answer:
"""
${input.answer}
"""`;
}
