import type { ReactNode } from "react";

export function Prompt({ children }: { children: ReactNode }) {
  return <h2 className="prompt text-balance text-ink">{children}</h2>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm leading-6 text-muted">{children}</p>;
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="action-bar">{children}</div>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="hidden h-6 min-w-6 items-center justify-center rounded-md border border-line bg-paper px-1.5 text-xs font-medium text-muted md:inline-flex">
      {children}
    </kbd>
  );
}
