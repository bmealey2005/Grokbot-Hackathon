import { buildLocalQuestion } from "@/lib/localPractice";
import { QuestionEnvelopeSchema, type QuestionEnvelope, type QuestionRequest } from "@/lib/schema";

function localTypeAnswer(req: QuestionRequest): QuestionEnvelope {
  const term = req.concept.term.trim();
  const accepted = Array.from(new Set([term, term.toLowerCase()].filter((answer) => answer.length > 0)));
  return {
    conceptIds: [req.concept.id],
    level: req.level,
    spec: {
      widget: "typeAnswer",
      props: {
        prompt: `What term matches: ${req.concept.definition}?`,
        accepted: accepted.length > 0 ? accepted : [req.concept.term],
        explanation: req.concept.definition,
      },
    },
  };
}

export function localQuestion(request: QuestionRequest): QuestionEnvelope {
  try {
    return QuestionEnvelopeSchema.parse(buildLocalQuestion(request));
  } catch {
    return QuestionEnvelopeSchema.parse(localTypeAnswer(request));
  }
}
