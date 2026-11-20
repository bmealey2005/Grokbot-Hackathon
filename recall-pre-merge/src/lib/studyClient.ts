import { ANSWER_CHAR_LIMIT, ANSWER_TOO_LONG, EMPTY_NOTES, NOTES_CHAR_LIMIT, NOTES_TOO_LONG } from "./ai/config";
import {
  ExtractRequest,
  GradeRequest,
  QuestionRequest,
  type AnswerResult,
  type ExtractResponse,
  type QuestionEnvelope,
} from "./schema";

/** An input error with a message suitable for the study screens. */
export class StudyClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudyClientError";
  }
}

export async function extractDeck(input: ExtractRequest): Promise<ExtractResponse> {
  const parsed = ExtractRequest.safeParse(input);
  if (!parsed.success) throw new StudyClientError("Invalid request");

  const { text, title } = parsed.data;
  if (!text.trim()) throw new StudyClientError(EMPTY_NOTES);
  if (text.length > NOTES_CHAR_LIMIT) throw new StudyClientError(NOTES_TOO_LONG);

  const { localDeckFromText } = await import("./ai/extract");
  return { deck: localDeckFromText(text, title?.trim() || undefined) };
}

export async function fetchQuestion(input: QuestionRequest): Promise<QuestionEnvelope> {
  const request = QuestionRequest.parse(input);
  const { localQuestion } = await import("./ai/question");
  return localQuestion(request);
}

export async function gradeAnswer(input: GradeRequest): Promise<AnswerResult> {
  const parsed = GradeRequest.safeParse(input);
  if (!parsed.success) throw new StudyClientError("Invalid request");
  if (parsed.data.answer.length > ANSWER_CHAR_LIMIT) throw new StudyClientError(ANSWER_TOO_LONG);

  const { heuristicGrade } = await import("./ai/grade");
  return heuristicGrade(parsed.data);
}
