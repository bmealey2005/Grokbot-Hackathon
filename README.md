# Recall

Active-recall study app for the Berkeley x Stanford Grok Bot Hackathon. Agent 4 replaces this README with the full write-up.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

- `npm test` runs Vitest.
- `npm run build` builds the Next.js app.

`XAI_API_KEY` stays on the server. Do not commit `.env` files.

## Layout

`src/lib/schema.ts` is the shared contract. Leave it frozen unless Agent 1 says otherwise.

- Agent 1: `src/lib/scheduler.ts`, `session.ts`, `store.ts`, `useSession.ts`

## Session hook (Agent 2)

```ts
const { current, submit, progress, isLoading } = useSession(deckId);
```

Import it from `@/lib/useSession`. `current` is `{ envelope, concept, level }` or `null`. Call `submit(result)` with an `AnswerResult`. `progress` is `{ answered, correct, conceptCount, percent, byConcept }`. `isLoading` is true while the next question is in flight. The question after the one on screen is prefetched.

`useRecallStore.getState().loadSampleDeck()` inserts the deck `cell-biology-basics`. `useSession("cell-biology-basics")` loads that deck on its own.

A score of 0.8 or higher promotes a concept (max level 3) and grows the interval: 1 minute, then 10 minutes, then 1 day, then 3 days, then the interval times ease. A score under 0.5 demotes (min level 1) and resets the interval to 1 minute when it was in-session, or 10 minutes when it had been scheduled further out. The session never asks the same concept twice in a row when the deck has another concept.
- Agent 2: `src/components`, `src/widgets`, `src/app` pages
- Agent 3: `src/app/api/*`, `src/lib/aiClient.ts`, `src/fixtures`
- Agent 4: deploy, this README, slides
