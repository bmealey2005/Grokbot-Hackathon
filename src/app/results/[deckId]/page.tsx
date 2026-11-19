import { Suspense } from "react";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-8">Loading results…</p>}>
      <ResultsBody params={params} />
    </Suspense>
  );
}

async function ResultsBody({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Results</h1>
      <p className="text-zinc-600 dark:text-zinc-300">
        Deck <span className="font-mono">{deckId}</span>. Agent 2 builds the
        mastery map here.
      </p>
    </main>
  );
}
