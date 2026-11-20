import { ResultsSkeleton } from "@/components";

export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8">
      <ResultsSkeleton />
    </main>
  );
}
