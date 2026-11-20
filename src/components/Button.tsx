import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-medium transition-colors duration-200 motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "border border-line bg-card text-ink hover:border-ink/25",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
};

export function buttonClassName(variant: Variant = "primary", className?: string, fullWidth?: boolean) {
  return cx(BASE, VARIANTS[variant], fullWidth && "w-full", className);
}

export function Button({
  variant = "primary",
  fullWidth,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
}) {
  return <button type={type} className={buttonClassName(variant, className, fullWidth)} {...props} />;
}
