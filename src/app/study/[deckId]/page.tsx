import { Suspense } from "react";

export default function StudyPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-8">Loading study session…</p>}>
      <StudyBody params={params} />
    </Suspense>
  );
}

async function StudyBody({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Study</h1>
      <p className="text-zinc-600 dark:text-zinc-300">
        Deck <span className="font-mono">{deckId}</span>. Agent 2 renders one
        question at a time here.
      </p>
    </main>
  );
}
