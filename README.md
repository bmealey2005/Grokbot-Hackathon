# Recall

Recall turns class notes into a study session that changes shape as you learn. Pick an answer, match related terms, put steps in order, or explain the idea from memory.

**Berkeley × Stanford Grok Bot Hackathon · Best Design**

## Inspiration

Quizlet Practice Tests already turn notes into questions. We wanted the activity itself to match the idea a student is trying to remember. Ordering tests a sequence, matching tests distinctions, and explaining an idea asks the learner to reconstruct it. [Quizlet Practice Tests](https://help.quizlet.com/hc/en-us/articles/25946589648013-Studying-with-Practice-Tests)

## What it does

Start with **Cell Biology Basics**, paste your notes, or upload a `.txt` or `.md` file. Explore the concept map, then start a short practice session. Check your answer to open the relevant source evidence. The results view shows which concepts you’ve practiced and how well you know them. Recall saves decks and mastery in your browser.

## How we built it (tech stack)

Recall uses Next.js, React, TypeScript, and Tailwind CSS, with OpenAI Apps SDK UI buttons. A shared Zod contract validates study decks and question formats. React renders each format with its own controls. The session engine prioritizes concepts due for review, then picks the weakest one when none are due. Zustand persists the library and mastery in the browser.

The Next.js API extracts concepts from the reading, builds questions, and grades written answers against a rubric. Imports are labeled **Local practice**. The current generation and grading paths use rule-based logic and require no model key.

## Challenges we ran into

The interface, scheduler, and API had to agree on how an activity is represented and scored. We fixed their shared contract first so the parts could be built and tested in parallel. With no approved inference credential available for the event build, we made source-based practice work with the reading itself.

## Accomplishments

We built a configurable question renderer, a reading library with text and file import, a concept map with source evidence, and a study loop with per-concept results. The same flow works with the included sample and with the learner’s own notes.

## What we learned

A wider range of question formats is only useful when each format has a job. A sequence belongs in an ordering question, and an answer explanation is more useful when students can check it against the reading.

## What’s next

Add an optional Grok generation path alongside Local practice. Improve the grading of written explanations and test which activities best help students retain a concept over repeated sessions.

## How Grok Bot helped build it

Grok Bot turned the brief into a work order for a Cursor Cloud Agent and started a parallel build on its cloud computer. It also checked inference credential availability and proposed Local practice for imported readings when no approved key was available. This repository’s implementation follows that fallback approach. The full redacted Grok Bot session export is pending.

## How to run it

Use Node.js 22 and npm to install dependencies and start the development server.

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm test` for tests and `npm run lint` for lint checks. Build and serve a production copy with these commands.

```sh
npm run build
npm start
```
