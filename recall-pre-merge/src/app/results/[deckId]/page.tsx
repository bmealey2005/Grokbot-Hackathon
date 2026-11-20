import { ResultsSkeleton } from "@/components";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsScreen } from "./ResultsScreen";

export const metadata: Metadata = {
  title: "Results",
};

export default function ResultsPage({ params }: { params: Promise<{ deckId: string }> }) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <ResultsBody params={params} />
    </Suspense>
  );
}

async function ResultsBody({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return <ResultsScreen deckId={deckId} />;
}
