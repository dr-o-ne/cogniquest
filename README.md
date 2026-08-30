# CogniQuest

A learning game for a 6–7 year old: **math** (addition and subtraction up to
100) and **reading by syllables**. Answers are given **out loud**. Runs on a PC
entirely offline.

The interface is in Russian; the code, the comments and the docs are in English.

## State

Phase 0 — the skeleton is up. No logic yet.
What comes next — [docs/ROADMAP.md](docs/ROADMAP.md). Why it was done this way —
[docs/DECISIONS.md](docs/DECISIONS.md).

## Running it

Needs **Node.js LTS**:

```powershell
winget install OpenJS.NodeJS.LTS
```

Then:

```powershell
npm install
npm run dev        # development, opens localhost
npm test           # core tests
npm run typecheck  # type checking
npm run build      # build
```

## Layout

```
docs\        decisions and the plan
src\core\    pure TypeScript: the rules of the game and of the learning.
             Zero dependencies on React, the DOM or the browser.
src\adapters\ implementations of the core ports: voice, keyboard, speech, saves
src\locale\  the text pack: every word the child sees or hears
src\ui\      React components
src\theme\   presentation as data: characters, colours, lines
electron\    the .exe wrapper (phase 7)
public\models\ the speech recognition model — not kept in git, see below
```

The main rule: **`src/core` knows nothing of the outside world.** It declares
ports (`src/core/ports`) and the outer layer supplies adapters. That is what
makes the logic testable without a browser, and lets speech recognition or
storage be swapped without touching the rules of the game.

## Language

All text addressed to the child lives in `src/locale/ru.ts` — screens, the
teacher's lines, monster names, number words. **Nothing outside it is written in
Russian:** code, comments, tests, developer-facing error messages and
documentation are English. The single exception is where Russian is the subject
under discussion — a language example in a comment, or a test asserting what the
text pack itself produces. Adding a second language means adding one file beside
`ru.ts`; nothing else has to move, because everything already goes through `t`.

Number words are part of the text pack on purpose: the recognition grammar is
built out of them, and the teacher reads them aloud.

## The speech recognition model

The Vosk model weighs tens of megabytes and is not committed (see
`.gitignore`). `npm run fetch-model` downloads it into `public/models`.

## Stack

TypeScript · Vite · React · Vitest · vosk-browser (recognition) · Web Speech API
(synthesis) · Electron (packaging)
