import { Suspense } from "react";
import { RecallStudy } from "@/components/recall-ui";

async function StudyBody({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return <RecallStudy deckId={deckId} />;
}

export default function StudyPage({ params }: { params: Promise<{ deckId: string }> }) {
  return <Suspense fallback={<p className="recall-loading">Loading practice…</p>}><StudyBody params={params} /></Suspense>;
}
