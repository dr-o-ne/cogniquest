# The plan, by phase

Why any given approach was taken is in [DECISIONS.md](DECISIONS.md); references
like **T4** and **C5** point there.

**The order follows risk, not convenience.** Voice comes second even though
starting with math would be more logical: voice can kill the whole concept, and
that has to be found out in the first week, not in the second month.

| Phase | What | State |
|---|---|---|
| 0 | The skeleton | **done** |
| 1 | The voice spike | **done** — risk retired |
| 2 | The math core | **done** — 101 tests |
| 3 | The first playable mini-game | **done** — the child asked for more |
| 4 | Reading by syllables | |
| 5 | The teacher | |
| 6 | Gamification | |
| 7 | Packaging into an `.exe` | |

---

## Phase 0 — the skeleton

**Goal:** somewhere to put the code.

- [x] git, `.gitignore`, `.gitattributes`, `.editorconfig`
- [x] folder layout per **A9**
- [x] Vite + React + TypeScript + Vitest
- [x] core contracts as types: `Exercise` (**A2**), `AnswerInput` (**A3**), `SessionObserver` (**A4**), `VoiceAnswerable` (**A5**), `elapsedMs` (**A7**), `unrecognised` (**C5**)
- [x] ports: recognition, speech synthesis, storage
- [x] the documents
- [x] **install Node.js** — v24.19.0, npm 11.17.0
- [x] `npm install`

**Done when:** `npm run dev` opens a page, `npm test` is green, `npm run
typecheck` is silent, `npm run build` builds.

---

## Phase 1 — the voice spike ⚠️

**Goal:** find out whether this particular child's speech gets recognised,
**before** the game is built around it.

- [x] `vosk-browser` wired up, the model fetched by `npm run fetch-model` into `public/models`
- [x] Russian numerals: `47` ⇄ «сорок семь», 15 tests — `src/core/math/numerals.ts`
- [x] the grammar assembled from the range of the level (**T16**) plus the `[unk]` token
- [x] the `VoskRecognizer` adapter — `src/adapters/speech`
- [x] auto-stop on silence: one click, and it takes it from there
- [x] the rig at `src/ui/VoiceSpike.tsx`: a problem, a button, a log, statistics
- [x] **checked live** (2026-08-29) — recognition works, the silence thresholds were right first time

**Result: the risk is retired, P9 stands.** Voice input is viable and the game
can be built around it.

An honest caveat: the numeric measurement (30 problems, percentages by
category) was never taken — a qualitative check had to do. The rig has not gone
anywhere, `VoiceSpike` can count and export its log; if misses turn up in phase
3 we come back and measure properly.

**O1 was closed early** — it turned out there was no choice: only small models
support a dynamic grammar, see **T17**.

**If it had failed:** fall back to keyboard input for math and keep voice for
reading only, where the word is known in advance and the grammar is four
options wide (**A5**). Not the end of the project, but **P9** would have had to
be rewritten.

---

## Phase 2 — the math core

**Goal:** all of the learning logic, without a single pixel.

- [x] problem generators for five levels (**C1**) — `math/generator.ts`, built straight to the rule instead of «generate and check»
- [x] `ArithmeticAnswer` — answer checking and the grammar off the exercise (**A5**)
- [x] the session engine `ExerciseSession`: task, attempt, verdict, events (**A4**)
- [x] **C5** in the checking: `unrecognised` touches neither the streak, nor the attempts, nor the statistics
- [x] the 1 / 3 / 7 review queue (**C3**) — `ReviewQueue`
- [x] the quiet difficulty adjustment (**C4**) — `DifficultyAdapter`
- [x] reproducible randomness for tests — `core/random.ts`
- [x] `Profile` — level per subject, session counter, stars, the review queue saved
- [x] storage adapters: browser and in-memory
- [x] 101 tests, boundaries included: crossing the ten, borrowing in subtraction, round tens

**Done when:** `npm test` is green and there are zero imports of React or the
DOM in `src/core` (**A1**). Verified by grep, not by eye.

A useful side effect: **A4** got tested for real — `Profile` subscribes to a
session as an ordinary `SessionObserver`, through the very seam gamification
will later plug into. So the seam is real, not merely drawn.

---

## Phase 3 — the first playable mini-game 🎯

**Goal:** the child plays for the first time. The milestone of the project.

- [x] the task screen: big numbers, plenty of air, nothing extra
- [x] voice input as an implementation of `AnswerInput` (**A3**)
- [x] the fallback input hidden, sliding out after two misses (**T5**)
- [x] a stand-in teacher: four moods — waiting, listening, delighted, encouraging
- [x] speech synthesis (**T12**): the teacher reads the problem out, encourages, says the answer when the attempts run out
- [x] sounds synthesised by an oscillator, no files
- [x] the «3 of 8» bar, a result screen with stars
- [x] progress survives restarts
- [x] **checked on the child** (2026-08-30)
- [x] pause timings — left as they are; live play gave no reason to touch them

**Done when:** the child gets through a session of eight problems by voice from
beginning to end **and asks for more**.

**Met, and then some.** The wording predates the battle format (G6), so read
«session» as «battle»: the child fought one through by voice, asked for another
— and then asked for new characters. That last part is the stronger signal of
the two. Wanting another go means the game works; wanting more characters means
the world of it is worth being in, which is what phase 6 was supposed to build
and apparently does not have to build from nothing.

Everything after this is scaffolding on top of a working game.

---

## Phase 4 — reading by syllables

**Goal:** a second subject on the same engine.

- a base of syllables and words, splitting a word into syllables (`core/reading`)
- the three mechanics from **C2**
- a grammar for words: the target word plus three or four lookalikes (**A5**)
- mechanics alternating within a session

**Done when:** both mini-games run on one session engine, and adding the second
required no edits in `core/session`. If it did — **A2** leaked and needs
fixing.

---

## Phase 5 — the teacher

**Goal:** a character the child gets attached to.

- **decide G5:** Rive, or 3D through an AI pipeline
- a `TeacherView` implementation behind abstraction **A10**
- two to four characters, a selection screen (**G3**)
- reactions bound to **A4** events: correct answer, mistake, hint, end of session
- costumes and lines as data (**A6**)

**Done when:** the child has picked a character and calls them by name.

**O2 gets decided here too** — whether the system synthesiser sounds so bad that
recorded narration is needed.

---

## Phase 6 — gamification

**Goal:** so that the child comes back unprompted.

- reactors on top of **A4** — the mini-games are not touched at all, which is the test of **G1**
- battle: HP, damage, the teacher's shield on a mistake
- stars, coins, streaks, a pet on three correct in a row
- a map of five islands by the levels of **C1**
- a shop: costumes, pets
- **decide G2** (setting), **G3**, **G4** (timer)

**Done when:** the child sits down to play without being reminded.

---

## Phase 7 — packaging

**Goal:** a double-click on a shortcut.

- Electron (**T14**), an `.exe` build, an icon, a shortcut
- the Vosk model inside the build — not downloaded, not evicted
- saves to a file next to the application (**T13**)
- a PIN-gated parent screen: what is hard, how long was practised, progress by week
- a soft session limit (**P7**)
- a full-screen window, no address bar and no tabs

**Done when:** on a machine with Wi-Fi switched off, a double-click on the
shortcut starts the game and it works completely.

---

## Working rules

- **Every phase ends with an update to [DECISIONS.md](DECISIONS.md).** Whatever
  gets decided along the way is written down immediately, or in a month nobody
  will remember it.
- Open questions are settled in their own phase, not earlier. A premature
  decision is a debt paid off by redoing the work.
- Phases 5 and 6 can swap places, if seeing the beauty before the mechanics is
  the more appealing order. Phases 1–4 cannot be reordered: each rests on the
  one before.

## What could go wrong

| Risk | How likely | What we do |
|---|---|---|
| A child's speech recognises badly | notable | exactly why phase 1 comes first; the retreat is to the keyboard for math |
| Short syllables («ма», «ши») recognise worse than words | likely | two of the three reading mechanics (**C2**) need no microphone |
| The system synthesiser sounds unpleasant | medium | **O2**: replace it with a recorded voice |
| The AI character comes out lifeless | medium | **A10**: switching to Rive costs one file |
| The child simply does not take to it | always possible | phase 3 shows that early and cheaply, before any investment in art |
