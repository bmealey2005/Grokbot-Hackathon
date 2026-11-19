import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Recall</h1>
      <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-300">
        Stop flipping cards. Start remembering.
      </p>
      <p className="leading-7 text-zinc-600 dark:text-zinc-300">
        Paste notes, then answer one generated question at a time. Agent 2 is
        building this screen.
      </p>
      <div className="flex flex-wrap gap-4 text-base">
        <Link className="underline underline-offset-4" href="/study/cell-biology-basics">
          Study the sample deck
        </Link>
        <Link className="underline underline-offset-4" href="/results/cell-biology-basics">
          Sample results
        </Link>
      </div>
    </main>
  );
}
