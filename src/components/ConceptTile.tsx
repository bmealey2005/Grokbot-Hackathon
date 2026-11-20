import type { Level } from "@/lib/schema";
import { LEVEL_META } from "./LevelBadge";
import { cx } from "./cx";

function tone(percent: number): { label: string; bar: string; text: string } {
  if (percent >= 80) return { label: "Strong", bar: "bg-correct", text: "text-correct" };
  if (percent >= 50) return { label: "Growing", bar: "bg-accent", text: "text-accent" };
  if (percent > 0) return { label: "Shaky", bar: "bg-close", text: "text-close" };
  return { label: "New", bar: "bg-faint", text: "text-muted" };
}

export function ConceptTile({
  term,
  percent,
  level,
  dueLabel,
}: {
  term: string;
  percent: number;
  level: Level;
  dueLabel: string;
}) {
  const status = tone(percent);
  return (
    <li className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-6 text-ink">{term}</h3>
        <p className={cx("font-display text-2xl leading-none", status.text)}>
          {percent}
          <span className="text-base">%</span>
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-deep" aria-hidden="true">
        <div className={cx("h-full rounded-full", status.bar)} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm leading-5 text-muted">
        <span className="font-medium text-ink">{status.label}</span>
        <span aria-hidden="true"> · </span>
        {LEVEL_META[level].name}
        <span className="mt-1 block">{dueLabel}</span>
      </p>
    </li>
  );
}
