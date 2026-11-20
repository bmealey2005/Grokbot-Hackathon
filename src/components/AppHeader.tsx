import Link from "next/link";
import type { ReactNode } from "react";
import { Mark } from "./icons";

export function AppHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-lg pr-2">
        <Mark className="h-7 w-7 text-accent" />
        <span className="text-base font-semibold tracking-tight">Recall</span>
      </Link>
      {action}
    </header>
  );
}
