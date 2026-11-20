import type { WidgetSpec } from "@/lib/schema";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatDue(dueAt: number, now: number): string {
  if (!dueAt) return "Not studied yet";
  if (dueAt <= now) return "Due now";
  const delta = dueAt - now;
  if (delta < MINUTE) return "Next review in under a minute";
  if (delta < HOUR) {
    const minutes = Math.max(1, Math.round(delta / MINUTE));
    return `Next review in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (delta < DAY) {
    const hours = Math.max(1, Math.round(delta / HOUR));
    return `Next review in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.max(1, Math.round(delta / DAY));
  return `Next review in ${days} day${days === 1 ? "" : "s"}`;
}

export const WIDGET_LABELS: Record<WidgetSpec["widget"], string> = {
  multipleChoice: "Multiple choice",
  trueFalse: "True or false",
  cloze: "Fill in the blank",
  typeAnswer: "Type the answer",
  matchPairs: "Match pairs",
  orderSteps: "Order the steps",
  slider: "Estimate",
  explain: "Explain",
};
