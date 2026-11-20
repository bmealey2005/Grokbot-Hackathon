import type { Level } from "@/lib/schema";
import { cx } from "./cx";

export const LEVEL_META: Record<Level, { name: string; hint: string }> = {
  1: { name: "Recognize", hint: "Pick it out" },
  2: { name: "Recall", hint: "Produce it" },
  3: { name: "Apply", hint: "Use the idea" },
};

const TONE: Record<Level, string> = {
  1: "bg-accent-soft text-accent",
  2: "bg-correct-soft text-correct",
  3: "bg-close-soft text-close",
};

export function LevelBadge({ level }: { level: Level }) {
  const meta = LEVEL_META[level];
  return (
    <span className={cx("inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-sm font-medium", TONE[level])}>
      <span className="sr-only">Level {level}. </span>
      {meta.name}
      <span className="hidden font-normal opacity-80 md:inline">{meta.hint}</span>
    </span>
  );
}
