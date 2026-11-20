"use client";

import type { Concept } from "@/lib/schema";
import { createContext, useContext, type ReactNode } from "react";

const QuestionConceptContext = createContext<Concept | null>(null);

export function QuestionConceptProvider({ concept, children }: { concept: Concept; children: ReactNode }) {
  return <QuestionConceptContext.Provider value={concept}>{children}</QuestionConceptContext.Provider>;
}

export function useQuestionConcept(): Concept | null {
  return useContext(QuestionConceptContext);
}
