import type { AnswerResult } from "@/lib/schema";
import { Button } from "./Button";
import { CheckIcon, CloseIcon, WrongIcon } from "./icons";
import { cx } from "./cx";

export function feedbackTone(result: Pick<AnswerResult, "correct" | "score">): "correct" | "close" | "wrong" {
  if (result.correct || result.score >= 0.8) return "correct";
  if (result.score > 0) return "close";
  return "wrong";
}

const TONE = {
  correct: {
    title: "That's right",
    wrap: "border-correct/30 bg-correct-soft text-correct",
    Icon: CheckIcon,
  },
  close: {
    title: "Partly there",
    wrap: "border-close/30 bg-close-soft text-close",
    Icon: CloseIcon,
  },
  wrong: {
    title: "Not quite",
    wrap: "border-wrong/30 bg-wrong-soft text-wrong",
    Icon: WrongIcon,
  },
} as const;

export function FeedbackCard({
  result,
  onContinue,
  continueLabel = "Continue",
}: {
  result: AnswerResult;
  onContinue: () => void;
  continueLabel?: string;
}) {
  const tone = feedbackTone(result);
  const { title, wrap, Icon } = TONE[tone];
  return (
    <div className={cx("mt-5 rounded-2xl border p-4 md:p-5", wrap)} role="status">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card">
          <Icon />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-ink">{title}</p>
          {result.feedback ? <p className="mt-1 text-pretty leading-7 text-ink">{result.feedback}</p> : null}
        </div>
      </div>
      <div className="action-bar">
        <Button type="button" fullWidth onClick={onContinue} autoFocus>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
