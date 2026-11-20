import { AppHeader } from "@/components";
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="content" className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-8">
      <AppHeader />
      <h1 className="mt-16 font-display text-4xl tracking-tight">That page isn't here.</h1>
      <p className="mt-3 leading-7 text-muted">The link may be old. Your decks are still on this device.</p>
      <Link href="/" className="mt-6 font-medium text-accent">
        Back home
      </Link>
    </main>
  );
}
