import { QuestionSkeleton } from "@/components";

export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[720px] px-4 py-8">
      <QuestionSkeleton />
    </main>
  );
}
