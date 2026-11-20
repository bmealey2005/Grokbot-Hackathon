# Recall

Active recall, instead of flipping flashcards. Paste notes, and each question arrives as an interactive widget chosen for the concept and for how well you know it.

**Live app:** TODO. No public URL yet. Publish from the Cursor Apps tray (or import the repo in Vercel). The hackathon track needs a public link with no login wall.

**Slideshow:** TODO. Public Google Slides, Canva, or PDF link is not created yet.

**Repo:** https://github.com/bmealey2005/Grokbot-Hackathon (public)

## Screenshots

TODO. Add 2 or 3 real screenshots after the study flow is on `main`. Do not commit mockups labeled as product shots.

1. TODO: pasted notes turning into concepts
2. TODO: one question widget during a session
3. TODO: mastery map on the results page

Quizlet comparison shots belong in [`docs/teardown/`](docs/teardown/README.md). They are not captured yet.

`public/og.svg` is a 1200×630 wordmark with the home-page tagline. `src/app/layout.tsx` does not point `openGraph.images` at it. That file belongs to Agent 2.

## Inspiration

Recognition and recall are different skills. A flashcard that shows the term and asks you to flip for the definition mostly tests whether the answer looks familiar. Students can pass that check and still blank on a test, because the test asks them to produce the idea.

Recall is built so the question changes shape as mastery changes. A concept starts as recognition (pick the right option, judge a statement), moves to recall (fill the blank, type the term, match pairs), and then to application (order a process, estimate a value, explain it in your own words). Weak concepts come back later, in a new format, instead of cycling the same card.

Student quotes about how people study today are TODO. None have been collected yet. See [`docs/teardown/`](docs/teardown/README.md).

## What it does

The intended session, as specified by the shared contract in `src/lib/schema.ts`:

1. The student pastes notes. `POST /api/extract` with `{ text, title? }` returns `{ deck }`. A deck has an id, a title, a timestamp, and concepts. Each concept has a term, a definition, supporting facts, and ids of related concepts.
2. The session picks a concept and a level. Levels are `1` recognize, `2` recall, and `3` apply.
3. `POST /api/question` receives the concept, neighbor concepts, the level, and the recent widget names. The model must return a `QuestionEnvelope`: concept ids, a level, and a `WidgetSpec`.
4. The widget registry renders that spec. Seven widgets grade themselves in the browser and call `onSubmit` with an `AnswerResult`. The `explain` widget is graded by `POST /api/grade`, which returns the same `AnswerResult` shape, including any missed rubric points.
5. The result updates a `MasteryRecord` (level, SM-2-style `ease`, `intervalMs`, `dueAt`, streak, and a history of score plus widget). Due concepts return later.

The eight widgets (`spec.widget`):

| Widget | What the student does | Grading |
| --- | --- | --- |
| `multipleChoice` | Pick one of 3–5 options | In the widget |
| `trueFalse` | Judge a statement | In the widget |
| `cloze` | Fill `{{blank}}` markers | In the widget |
| `typeAnswer` | Type a short answer against an accepted list | In the widget |
| `matchPairs` | Match 3–6 pairs | In the widget |
| `orderSteps` | Put steps in order. The spec lists them correctly; the UI shuffles | In the widget |
| `slider` | Choose a number inside a min/max, within a tolerance | In the widget |
| `explain` | Write an explanation against a rubric | `POST /api/grade` |

**What `main` runs today** (`f2d66b5`, scaffold plus [PR #1](https://github.com/bmealey2005/Grokbot-Hackathon/pull/1)):

- Home, `/study/[deckId]`, and `/results/[deckId]` are still stub pages. Home links to the sample deck `cell-biology-basics`. The study page names the deck id and comments the `useSession(deckId)` call Agent 2 should make. The results page names the deck id. The mastery map UI is not built.
- The session engine is in. `useSession(deckId)` from `@/lib/useSession` returns `{ current, submit, progress, isLoading }`. `current` is `{ envelope, concept, level }` or `null`. `submit(result)` takes an `AnswerResult`. `progress` is `{ answered, correct, conceptCount, percent, byConcept }`. `isLoading` is true while the next question is in flight. The question after the one on screen is prefetched.
- `useRecallStore` persists `{ decks, mastery }` to `localStorage` under the key `recall-store`. Unreadable or invalid saves are dropped. `loadSampleDeck()` inserts `cell-biology-basics`. `useSession("cell-biology-basics")` loads that deck on its own.
- The scheduler promotes at score `>= 0.8` (level max 3, ease `+0.1`, cap 3.0). Intervals step 1 minute, 10 minutes, 1 day, 3 days, then interval × ease, capped at 30 days. A score below `0.5` demotes (level min 1, ease `−0.2`, floor 1.3) and resets the interval to 1 minute when it was in-session, or 10 minutes when it had been scheduled further out. Scores in between keep the level and stretch the interval by 1.2. `masteryPercent` weights level, the last five scores, and streak, and returns 0–100.
- The session asks the most overdue concept, or the weakest when nothing is due. It skips the concept just asked when the deck has another one. `recentWidgets` is the last six widget names. If `/api/question` returns a payload that fails validation, the runner falls back to a local `typeAnswer` ("What is {term}?") accepted as the term itself.
- `POST /api/extract` validates the body with zod and returns the fixture deck "Cell Biology Basics" (12 concepts). A non-empty `title` replaces the fixture title. The note text is not parsed.
- `POST /api/question` validates the body and returns a fixture spec. The fixture picker uses level 1 for `multipleChoice` and `trueFalse`, level 2 for `cloze`, `typeAnswer`, and `matchPairs`, and level 3 for `orderSteps`, `slider`, and `explain`, skipping names listed in `recentWidgets` when it can.
- `POST /api/grade` is a keyword stub. A rubric point counts as hit when the answer contains one of its words of 5+ letters. `correct` is `score >= 0.8`.
- `src/widgets/registry.tsx` renders the widget name and a Submit button that reports `score: 0`. It mounts `@dnd-kit` and a Framer Motion wrapper so those dependencies are wired. It is not connected to `useSession`.
- `src/lib/aiClient.ts` is a typed `fetch` wrapper around the three routes. Timeouts, retry, and response zod checks are not in this file yet. The session validates the question payload itself.
- No source file reads `XAI_API_KEY` or `DEMO_MODE`.

The sample deck and one valid fixture spec per widget live in `src/fixtures/`. Agent 1's pull request describes 26 Vitest tests covering promotion, demotion, interval growth, due ordering, no back-to-back repeats, corrupt `localStorage` recovery, prefetch, and `useSession()`. The fixture file still checks the deck, every widget spec, and the three stub routes.

## How we built it (tech stack)

Declared in `package.json` on `main`:

- Next.js 16.4.6, App Router, React 19.3.0, TypeScript 5
- Tailwind CSS 4.3.3 (`@tailwindcss/turbopack` for CSS in `next.config.ts`)
- Framer Motion 14 and `@dnd-kit` (core, sortable, utilities) for widget motion and reordering
- zod 4 for the shared contract and for request validation on the API routes
- Zustand 5, persisting decks and mastery to `localStorage` (`recall-store`)
- Vitest 5 with Testing Library and jsdom
- xAI Grok, planned behind the server-only env var `XAI_API_KEY`. The scaffold routes do not call it.

`next.config.ts` sets `cacheComponents` and `partialPrefetching`. No `vercel.json` is checked in. Next.js detects this app from the `build` and `start` scripts, and the deploying guide does not require a `vercel.json` for a Node server deploy.

Generative UI stays inside a closed set. The model is asked for JSON. zod's discriminated union accepts only the eight widgets. Anything else fails validation before it reaches the registry, so the page cannot render an arbitrary component the model invented.

```mermaid
flowchart TD
  paste["Pasted notes"] --> extract["POST /api/extract"]
  extract --> deck["Deck of concepts"]
  deck --> session["Session: next concept, level 1 to 3, recent widgets"]
  session --> question["POST /api/question"]
  question --> grok["xAI Grok, server-side, XAI_API_KEY"]
  grok --> json["WidgetSpec JSON"]
  json --> zod["zod discriminated union: 8 widgets"]
  zod --> registry["src/widgets/registry.tsx"]
  registry --> ui["multipleChoice, trueFalse, cloze, typeAnswer, matchPairs, orderSteps, slider, or explain"]
  ui --> answer["Student answer"]
  answer --> selfGrade["Seven widgets self-grade in the browser"]
  answer --> apiGrade["explain calls POST /api/grade"]
  selfGrade --> result["AnswerResult: correct, score 0 to 1, feedback, missing"]
  apiGrade --> result
  result --> mastery["MasteryRecord: ease, intervalMs, dueAt, streak, history"]
  mastery --> session
```

On `main`, the session and mastery boxes are the engine from PR #1. The extract, question, and grade boxes still return fixtures from `src/fixtures/`. The registry box is still the stub widget. The diagram is the contract those routes and widgets stand in for.

## Challenges we ran into

Agent 1's merged pull request ([#1](https://github.com/bmealey2005/Grokbot-Hackathon/pull/1)) has a summary and scoring notes, and no separate "challenges" list.

TODO:

- Agent 1 challenges, if they add them
- Agent 2 (components, widgets, pages): no pull request yet
- Agent 3 (API routes, `aiClient`, fixtures): no pull request yet
- Measured Quizlet step counts, ads, and paywall notes: see [`docs/teardown/`](docs/teardown/README.md)

Observed while writing this README, from the tree on `main`:

- `.env.example` contains `XAI_API_KEY=` only. `DEMO_MODE` is part of the run instructions and is absent from that file. `.env.example` is outside Agent 4's files, so this branch leaves it unchanged.
- The scaffold never reads `DEMO_MODE`. Running without a key works because the routes are fixtures, which is a different mechanism than the `DEMO_MODE=fixtures` switch described in the hackathon brief.
- Cursor's Apps publish step is a person clicking Publish in the preview tray. This agent has no publish tool, no Vercel token, and no permission to set `XAI_API_KEY`.

## Accomplishments that we're proud of

From `main` after the scaffold and PR #1:

- One shared zod contract for decks, the eight widgets, question envelopes, answer results, mastery records, and the three API bodies. A widget name outside that union fails `WidgetSpec` parsing. The fixture tests cover that case with `"diagram"`.
- A stable sample deck, Cell Biology Basics, with 12 concepts whose `related` ids all point at other concepts in the deck.
- One fixture spec for every widget, plus stub routes that validate input and return those fixtures.
- A session loop with prefetch, a spaced-repetition scheduler, and a Zustand store that recovers from a corrupt `localStorage` save. `useSession()` is the hook Agent 2 renders against.
- The GitHub repo is public: https://github.com/bmealey2005/Grokbot-Hackathon

TODO: the on-screen study loop, the live phone pass, and the notes from Agents 2 and 3.

## What we learned

TODO. This section waits on the other agents' "Notes for README" and on the scrubbed session export. No lesson is filled in here, because none has been reported yet.

## What's next

Planned after the hackathon, from the project brief. None of these are in the repo.

- Accounts and sync across devices
- A diagram-labeling widget
- A "teach it back" mode
- Quizlet URL import
- Classes

Also still open for this submission: a public live link, screenshots, the slideshow, the scrubbed session export, a phone rehearsal, and the Typeform submission. The human checklist is in the docs linked below.

## How Grok Bot helped build it

The work is split across four cloud agents so the contract, the interface, the model routes, and the submission can move in parallel:

| Agent | Branch | Owns |
| --- | --- | --- |
| 1 Core | `agent-1-core`, after the scaffold landed on `main` | `src/lib/schema.ts` (frozen), scheduler, session, store, `useSession()` |
| 2 Interface | Agent 2's branch | `src/components`, `src/widgets`, `src/app` pages |
| 3 Model | Agent 3's branch | `src/app/api/*`, `src/lib/aiClient.ts`, `src/fixtures` |
| 4 Ship | `agent-4-ship` | This README, `docs/**`, `public/**`, deploy config |

Agent 1's scaffold commit is `0873478` ("Scaffold Recall with the shared study contract."). The session engine landed in [PR #1](https://github.com/bmealey2005/Grokbot-Hackathon/pull/1), merge commit `f2d66b5`. That pull request was already merged when this branch was updated. Agent 2 has no remote branch and no pull request. `origin/agent-3-ai` exists and only changes `src/lib/aiClient.ts`; it has no pull request, so it was left unmerged. [PR #2](https://github.com/bmealey2005/Grokbot-Hackathon/pull/2) (`codex/recall-cursor-preview`, "Prepare Recall for Cursor Apps") is a separate preview branch, not Agent 2's interface pull request.

Session export: TODO. Teammate Grok Bot transcripts are not in the repo. The scrub checklist is [`docs/session-export/README.md`](docs/session-export/README.md). Link the scrubbed files from this section after a second teammate has checked them. Do not commit names, emails, phone numbers, or tokens.

## How to run it

```bash
npm i
cp .env.example .env.local
npm run dev
```

Open the URL Next prints (the scaffold uses the default Next dev port).

```bash
npm test
npm run build
```

`npm test` runs Vitest once. `npm run build` runs `next build`.

**Without an xAI key.** On this scaffold, leave `XAI_API_KEY` empty. The API routes do not call the model. The intended offline switch, once Agent 3 reads it, is:

```bash
DEMO_MODE=fixtures npm run dev
```

That variable is not in `.env.example` and no file reads it yet. Adding it to `.env.example` belongs to whoever owns that file.

**Where `XAI_API_KEY` has to be set.** Never commit it. `.env*` is gitignored except `.env.example`.

- Local: `.env.local`, copied from `.env.example`. This agent cannot create or fill that file with a real key.
- Cursor Apps: the app's Secrets section in the [Apps dashboard](https://cursor.com/docs/cloud-agent/apps). Add a secret named `XAI_API_KEY`. The agent never sees the value. Optional `DEMO_MODE` can stay empty when a live key is present. Public sharing has to be on, or the link sits behind Cursor sign-in and fails the "no login wall" rule.
- Vercel, if the repo is imported there: Project Settings, Environment Variables, `XAI_API_KEY` for Production (and Preview, if preview URLs should call the model). No `vercel.json` is required for this Next.js app.

After a deploy exists, confirm it from the host's dashboard. This branch does not have a live URL to check.
