"use client";

import { AppHeader, Button } from "@/components";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="content" className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-8">
      <AppHeader />
      <h1 className="mt-16 font-display text-4xl tracking-tight">Something went wrong.</h1>
      <p className="mt-3 leading-7 text-muted">The page didn't load. Your decks are still on this device.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={() => retry()}>
          Try again
        </Button>
        <Link href="/" className="inline-flex min-h-12 items-center px-3 font-medium text-accent">
          Go home
        </Link>
      </div>
    </main>
  );
}
