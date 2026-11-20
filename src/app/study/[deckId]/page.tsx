import { QuestionSkeleton } from "@/components";
import type { Metadata } from "next";
import { Suspense } from "react";
import { StudySession } from "./StudySession";

export const metadata: Metadata = {
  title: "Study",
};

export default function StudyPage({ params }: { params: Promise<{ deckId: string }> }) {
  return (
    <Suspense fallback={<QuestionSkeleton />}>
      <StudyBody params={params} />
    </Suspense>
  );
}

async function StudyBody({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return <StudySession deckId={deckId} />;
}
