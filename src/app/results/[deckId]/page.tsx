import { Suspense } from "react";
import { RecallResults } from "@/components/recall-ui";

async function ResultsBody({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return <RecallResults deckId={deckId} />;
}

export default function ResultsPage({ params }: { params: Promise<{ deckId: string }> }) {
  return <Suspense fallback={<p className="recall-loading">Loading results…</p>}><ResultsBody params={params} /></Suspense>;
}
