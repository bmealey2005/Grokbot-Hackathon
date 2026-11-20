import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("rounded-2xl border border-line bg-card p-5 shadow-card md:p-8", className)}
      {...props}
    />
  );
}
