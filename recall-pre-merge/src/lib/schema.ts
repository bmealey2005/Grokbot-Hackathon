// src/lib/schema.ts
import { z } from "zod";

export const Concept = z.object({
  id: z.string(),
  term: z.string(),
  definition: z.string(),
  facts: z.array(z.string()).default([]), // supporting details for harder questions
  related: z.array(z.string()).default([]), // ids of related concepts (for matching/distractors)
});
export type Concept = z.infer<typeof Concept>;

export const Deck = z.object({
  id: z.string(),
  title: z.string(),
  concepts: z.array(Concept),
  createdAt: z.number(),
});
export type Deck = z.infer<typeof Deck>;

export type Level = 1 | 2 | 3; // recognize, recall, apply

// --- Question formats rendered by the study interface ---
export const WidgetSpec = z.discriminatedUnion("widget", [
  z.object({
    widget: z.literal("multipleChoice"),
    props: z.object({
      prompt: z.string(),
      options: z.array(z.string()).min(3).max(5),
      correctIndex: z.number(),
      explanation: z.string(),
    }),
  }),
  z.object({
    widget: z.literal("trueFalse"),
    props: z.object({
      statement: z.string(),
      answer: z.boolean(),
      explanation: z.string(),
    }),
  }),
  z.object({
    widget: z.literal("cloze"),
    props: z.object({
      text: z.string(), // use {{blank}} markers
      answers: z.array(z.array(z.string())), // accepted answers per blank
      explanation: z.string(),
    }),
  }),
  z.object({
    widget: z.literal("typeAnswer"),
    props: z.object({
      prompt: z.string(),
      accepted: z.array(z.string()),
      explanation: z.string(),
    }),
  }),
  z.object({
    widget: z.literal("matchPairs"),
    props: z.object({
      prompt: z.string(),
      pairs: z
        .array(z.object({ left: z.string(), right: z.string() }))
        .min(3)
        .max(6),
    }),
  }),
  z.object({
    widget: z.literal("orderSteps"),
    props: z.object({
      prompt: z.string(),
      steps: z.array(z.string()).min(3).max(7),
      explanation: z.string(),
    }),
  }), // steps in CORRECT order; UI shuffles
  z.object({
    widget: z.literal("slider"),
    props: z.object({
      prompt: z.string(),
      min: z.number(),
      max: z.number(),
      answer: z.number(),
      tolerance: z.number(),
      unit: z.string().optional(),
      explanation: z.string(),
    }),
  }),
  z.object({
    widget: z.literal("explain"),
    props: z.object({
      prompt: z.string(),
      rubric: z.array(z.string()).min(1),
    }),
  }),
]);
export type WidgetSpec = z.infer<typeof WidgetSpec>;

export interface QuestionEnvelope {
  conceptIds: string[]; // concept(s) this question tests
  level: Level;
  spec: WidgetSpec;
}

export interface AnswerResult {
  correct: boolean;
  score: number; // 0..1 (partial credit for match/order/explain)
  feedback?: string; // shown to the user
  missing?: string[]; // rubric points missed (explain widget)
}

// Every widget implements this props interface:
export interface WidgetProps<S extends WidgetSpec> {
  spec: S["props"];
  onSubmit: (result: AnswerResult) => void; // the widget reports the graded answer
}

export interface MasteryRecord {
  conceptId: string;
  level: Level; // current level for this concept
  ease: number; // SM-2 style
  intervalMs: number;
  dueAt: number;
  streak: number;
  history: { at: number; score: number; widget: WidgetSpec["widget"] }[];
}

// --- API contracts. Additive only; the block above stays frozen. ---

export const LevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const MasteryRecordSchema = z.object({
  conceptId: z.string(),
  level: LevelSchema,
  ease: z.number(),
  intervalMs: z.number(),
  dueAt: z.number(),
  streak: z.number(),
  history: z.array(
    z.object({
      at: z.number(),
      score: z.number(),
      widget: z.enum([
        "multipleChoice",
        "trueFalse",
        "cloze",
        "typeAnswer",
        "matchPairs",
        "orderSteps",
        "slider",
        "explain",
      ]),
    }),
  ),
});

export const QuestionEnvelopeSchema = z.object({
  conceptIds: z.array(z.string()),
  level: LevelSchema,
  spec: WidgetSpec,
});

export const AnswerResultSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  feedback: z.string().optional(),
  missing: z.array(z.string()).optional(),
});

export const ExtractRequest = z.object({
  text: z.string(),
  title: z.string().optional(),
});
export type ExtractRequest = z.infer<typeof ExtractRequest>;

export const ExtractResponse = z.object({
  deck: Deck,
});
export type ExtractResponse = z.infer<typeof ExtractResponse>;

export const QuestionRequest = z.object({
  concept: Concept,
  neighbors: z.array(Concept),
  level: LevelSchema,
  recentWidgets: z.array(z.string()),
});
export type QuestionRequest = z.infer<typeof QuestionRequest>;

export type QuestionResponse = QuestionEnvelope;

export const GradeRequest = z.object({
  concept: Concept,
  prompt: z.string(),
  rubric: z.array(z.string()),
  answer: z.string(),
});
export type GradeRequest = z.infer<typeof GradeRequest>;

export type GradeResponse = AnswerResult;
