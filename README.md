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
- Agent 2: `src/components`, `src/widgets`, `src/app` pages
- Agent 3: `src/app/api/*`, `src/lib/aiClient.ts`, `src/fixtures`
- Agent 4: deploy, this README, slides
