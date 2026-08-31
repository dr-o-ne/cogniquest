# Project decisions

A learning game for a child: math and reading by syllables, answered by voice.

**Last updated:** 2026-08-31
**State:** phase 3 closed on the child; reading (phase 4) is next, and the
ground for it is now clear rather than half-guessed
**What comes next:** [ROADMAP.md](ROADMAP.md)

---

## How to keep this document

- Every decision has an ID (`P1`, `T3`, `A5`). We refer to it in conversation
  and in code comments.
- A decision is never deleted, only ~~struck through~~ with a note on what
  replaced it. History beats tidiness: it explains why we are not going back to
  the rejected option.
- Every decision has a **Why** — without it the rationale is lost in two months
  and everything gets relitigated.
- Statuses: **Accepted** · **Deferred** (to be decided later, deliberately) ·
  **Open** (needs an answer) · **Replaced**.
- Updated in the same commit as the code the decision changes.

---

## P. Product

| ID | Decision | Status |
|---|---|---|
| **P1** | The audience is one particular 6–7 year old who already reads syllables. Not a mass-market product. | Accepted |
| **P2** | Two subjects: math (addition and subtraction up to 100) and reading by syllables. | Accepted |
| **P3** | The language of the content is Russian. | Accepted |
| ~~P4~~ | ~~Platform — an Android tablet.~~ | Replaced by **P8** |
| **P5** | Works fully offline. The internet is needed for nothing, first launch included. | Accepted |
| ~~P6~~ | ~~You cannot lose. A mistake costs stars and time, never progress.~~ | Replaced by **P10** |
| **P10** | A battle can be lost; progress cannot. | Accepted |
| **P7** | A session runs 10–15 minutes, then a gentle «that's enough for today». | Accepted |
| **P8** | The platform is a **PC** (a Windows laptop). A desktop application with a shortcut. | Accepted |
| **P9** | **Math answers are spoken.** That is not an input method but a skill being trained. | Accepted |

**P5 — why.** No network dependency of any kind: no privacy question, no API
bill, no «the internet is down, so no practice today».

**P10 — why it changed.** The battle format (**G6**) needs losing to mean
something: hearts that cannot be lost are not hearts. The original worry has not
gone away — at six, losing means tears and refusing to play tomorrow — so the
price of a defeat is confined to the battle itself:

- a lost battle takes nothing away: no stars, no level, nothing banked
- a rematch right there in the result window, without going back to the menu
- **C4** works inside the battle: when it gets hard, the tasks quietly ease off
  within the monster's pool, which usually saves the child from a rout
- **C5** too: a miss costs no heart

So the battle can be lost, but nothing rolls back.

**P8 — why.** A tablet was the original plan, but the game moved to the laptop
the child works at. The side benefit is large: the processor handles speech
recognition with room to spare, and a whole layer of work goes away with
Android — SDKs, signing, screen sizes, rotation, gestures.

**P9 — why.** This was the first requirement of the project. The key
consequence is **T5**: the fallback input is **not shown** by default. With
number buttons permanently in view the child will press buttons — they are
easier — and the whole point of the exercise is lost.

---

## T. Technology

| ID | Decision | Status |
|---|---|---|
| ~~T1~~ | ~~Engine — Unity 6 LTS, C#, 2D.~~ | Replaced by **T9** |
| ~~T2~~ | ~~`Game.Core` on netstandard2.1.~~ | Replaced by **T10** |
| **T3** | Speech recognition — **Vosk**, offline. The **vosk-browser** build (WebAssembly), with the model held locally. | Accepted |
| **T4** | Vosk runs in **grammar mode**: a closed list of expected words instead of the whole language. | Accepted |
| **T5** | The fallback input (keyboard) is **hidden by default** and slides out only after two misses. | Accepted |
| ~~T6~~ | ~~Narration — Android TTS.~~ | Replaced by **T12** |
| ~~T7~~ | ~~Storage — JSON in `Application.persistentDataPath`.~~ | Replaced by **T13** |
| ~~T8~~ | ~~Development loop — Play Mode, Device Simulator, emulator.~~ | Replaced by **T14** |
| **T9** | The stack is **TypeScript + Vite + React**. | Accepted |
| **T10** | The core (`src/core`) is written in TypeScript and depends on **neither** React, nor the DOM, nor the browser. | Accepted |
| **T11** | The playfield is **DOM and CSS animation**, with no canvas engine. | Accepted |
| **T12** | The teacher's narration is the Windows system synthesiser through the Web Speech API, **local voices only**. | Accepted |
| **T13** | Storage is local to the browser, and after packaging a file next to the `.exe`. No database, no cloud. | Accepted |
| **T14** | Packaging is **Electron**, producing an `.exe` with a shortcut. Development still happens in plain Chrome. | Accepted |
| **T15** | Tests are **Vitest**. The core runs in the node environment, browserless, in a second. | Accepted |
| **T16** | The recognition grammar gets the **whole range of plausible answers**, not just the correct one. | Accepted |
| **T17** | The model is **`vosk-model-small-ru-0.22`** (44 MB). The choice was not free: see below. | Accepted |

**T9 — why.** UI/UX priority decided it. Interface quality is a function of how
many iterations you get: how many times you moved the button, tweaked an
animation's timing, changed the pause before the praise. In a browser an edit is
visible instantly; in Unity, after a domain reload. Across a hundred iterations
that compounds into a different level of polish. On top of that HTML/CSS/React
is the best interface toolkit there is, and the menu, the map, the shop and the
parent screen make up most of the application.

Dropping C# was deliberate: browsers and C# barely go together for games. Unity
WebGL does not support the `Microphone` class at all, Godot cannot export .NET
assemblies to the web, and Blazor is not a game engine.

**T11 — why.** The game is 80% interface: numbers, syllables, buttons, a map.
DOM and CSS make all of that simpler and debuggable in DevTools. Canvas will
only be needed for the character (**A10**) and possibly for effects — in
specific places, not as the foundation.

**T14 — why.** The child needs a double-click on a shortcut, not a command in a
console. Electron gives us our own window with no address bar and no tabs, the
microphone behaves as it would in a native app, and the internet is not needed
even on first launch. Inside it is always the same Chromium — no «it worked on
my machine». Tauri is lighter (5 MB against 150) but drags in Rust; on a PC
those 150 MB do not matter.

**T16 — why.** An easy trap to fall into: hand Vosk a one-word grammar of
«пять» and it will hear «пять» in anything at all — in «четыре», in a cough. The
child would always be right and the game would stop teaching. So the list gets
every number in the range of the level, plus the `[unk]` token for «that was
something not on the list».

**T17 — why, and this matters.** Found out during implementation: **only
`small` Vosk models support a dynamic grammar.** Bigger models are more accurate
on free speech but will not accept a grammar at all.

Which means the choice between «small or accurate» (**O1**) never existed: a
grammar (**T4**, **T16**) over a closed vocabulary of 11–101 phrases beats what
a big model would give over the full one. We take the small model and do not
look back.

Verified against the API: `new model.KaldiRecognizer(sampleRate, grammarJson)`
takes the grammar as a JSON string — **T4 confirmed in code, not in theory**.

### What has to be installed

- **Node.js LTS** — the only thing missing: `winget install OpenJS.NodeJS.LTS`
- Git — **already there**, 2.53
- ~~.NET SDK 10~~ — no longer needed, a leftover of the previous stack

---

## A. Architecture

### A1. The dependency rule — **Accepted**

Arrows point inward only. The outer layer knows about the inner one, never the
other way round.

```
Theme (data)            characters, colours, lines, sounds
      ↓
Gamification            battle, HP, stars, coins, the map
      ↓                 listens to events, affects nothing
UI (React)              show the task, take the answer
Adapters                voice, keyboard, speech synthesis, storage
      ↓
core                    pure TypeScript, zero dependencies
                        Exercise · Session · Progression · Ports
```

**Why.** The mini-games come first and gamification is hung on later (**G1**).
The theme can change from «wizard against a monster» to space. So the core must
know nothing about the battle, or the theme, or React.

**The stress test:** there is not one import from `react`, from a DOM API or
from an adapter anywhere in `src/core`, and the core tests pass in node without
a browser. The day that stops being true, the architecture has leaked.

It used to be checked by hand, which means checked once. It is now two things
that run on every build:

- **`src/architecture.test.ts`** owns the import half. A table of layers says
  which may reach for which, and packages are an **allow-list** — `core` reads
  «zero dependencies» literally, so a stray `lodash` or `node:fs` fails as
  loudly as React would. A layer nobody has declared fails too, rather than
  being waved through. It also refuses import cycles, and checks that its own
  resolver still resolves — a resolver with a gap would hollow out the cycle
  check while staying green.
- **`tsconfig.core.json`** owns the DOM half, by typechecking `src/core` against
  `lib: ES2022` with no DOM in it. `document`, `matchMedia`,
  `HTMLCanvasElement` — everything browser-only is «cannot find name», kept
  complete by the compiler instead of by a list somebody has to maintain.

Two limits worth knowing. `src/game` cannot join the DOM-free project even
though it is browser-free in spirit: it reaches `src/assets`, which needs Vite's
`import.meta.env`, and typing that pulls `vite/client` and the whole DOM with
it. And node's own globals stay reachable, because vitest's types carry a hard
`/// <reference types="node" />` that no `types` setting suppresses — which is
what this invariant claims anyway: the core runs in node without a browser.

Text is the single deliberate exception, and a narrow one: `core/math/numerals`
takes number words from `src/locale`. The text pack is pure data with
no React and no DOM, so the invariant above is untouched.

### A2. `Exercise` — one task type for every subject — **Accepted**

`src/core/exercises/Exercise.ts`

What exists today, all of it math:

| Task | Prompt | Answer |
|---|---|---|
| arithmetic | `2 + 3`, `20 − (5 + 3)` | the number `5` |
| equation | `□ + 2 = 5` | the missing number |
| comparison | `5 □ 7` | one of three words |

What reading will add when it is built — a plan, not a type that exists:

| Task | Prompt | Answer |
|---|---|---|
| read aloud | `["МА","ШИ","НА"]` | the spoken word |
| build the word | 🔊 «машина» | a sequence of syllables |
| catch the syllable | 🔊 «ШИ» | a pick among options |

**Why.** Every subject produces the same type. Which means the session engine,
progress, mistake review and all of gamification are written once and work for
whatever comes next.

**The placeholder shapes were taken out on 2026-08-31.** `ExercisePrompt` used
to carry `syllables` and `spoken` variants, `AnswerAttempt` a `sequence` one,
and `Subject` a `reading` member — none of them reachable, all of them forcing
four exhaustive switches to say something about a subject nobody had designed.
Guessing the shape of reading a phase early only guarantees the design has to
fit what math happened to need. The seam itself is untouched: nothing above
`Exercise` names a kind of prompt, so reading adds variants here and changes no
layer above.

### A3. `AnswerInput` — the way to answer plugs in independently — **Accepted**

The port is `src/core/ports/AnswerInput.ts`, implementations are in
`src/adapters/input`.

**Why.** Voice is just one of the inputs. Until recognition is ready we play
with the keyboard; once it is, we add it to the list without rewriting the
mini-game. And in reverse: two misses in a row and the session brings out the
fallback input itself (**T5**).

**A clarification from phase 3.** The port describes an input the game **asks
and waits for**: «listen for the answer to this task». Voice fits perfectly. The
keyboard works the other way round — the child types when they feel like it, and
there is no telling when. Forcing it into the same shape means wrapping a
promise around component state for the sake of a symmetry that buys nothing.

So: **voice implements the port, the keyboard answers the session directly.** In
the session loop they meet through `Promise.race` — whichever arrives first
counts. Reading will keep the same split: «read aloud» through the port, «build
the word» and «catch the syllable» directly.

### A4. `SessionObserver` — the seam gamification will plug into — **Accepted**

`src/core/session/SessionObserver.ts`

**Why.** Today there is one subscriber — the «3 of 8» bar. Tomorrow
`BattleReactor`, `CoinReactor` and `StarReactor` stand beside it. The mini-game
does not change by a line. All methods are optional — a reactor implements only
what interests it.

### A5. The exercise hands out its own recognition grammar — **Accepted**

The `VoiceAnswerable` interface in `src/core/exercises/AnswerSpec.ts`.

```
answer 5, level 1    → ["ноль","один",…,"двадцать"]   ← the whole range, see T16
the word «машина»    → ["машина","малина","мышина","машинка"]
```

**Why.** Vosk gets exactly the list of words it needs (**T4**), while the voice
adapter knows nothing about arithmetic or about syllables. For reading this is
especially strong: the word on screen is known in advance and has three or four
rivals, so accuracy is close to perfect.

### A6. The theme is data, not code — **Accepted**

`src/theme` when it exists — the description of a set: characters, opponents,
colours, sounds, lines. The folder is phase 5/6 work and is not created yet; the
empty placeholder that stood in for it was removed on 2026-08-31, since a folder
holding nothing documents nothing this file does not say better.

What already works this way is `src/game/monsters.ts` — pure data, no logic, one
row per opponent — and `src/locale/ru.ts`. So the decision is not merely drawn:
half of it is load-bearing already.

**Why.** Changing the setting = a new theme file plus an asset folder, with no
code edits. Which is what lets **G2** stay open for months without technical
debt.

### A7. Answer time is always measured — **Accepted**

The `elapsedMs` field on `AnswerResult`.

**Why.** The core merely counts. Rewarding speed, punishing slowness or
ignoring both is for the gamification reactor to decide. That takes the timer
question (**G4**) off the critical path: change our minds and it is an edit in
one class.

### ~~A8. The C# solution layout~~ — **Replaced by A9**

### A9. Project layout — **Accepted**

```
d:\_Projects\Game\
├─ docs\
│  ├─ DECISIONS.md         ← this file: what was decided, and why
│  ├─ ROADMAP.md           ← what we are doing, and in what order
│  └─ MATH.md              ← the math ladder: methodology, no code
├─ public\
│  ├─ models\              the Vosk model (not in git, fetched separately)
│  └─ monsters\            opponent pictures
├─ scripts\
│  └─ fetch-model.mjs      downloads and repacks the Vosk model
├─ src\
│  ├─ core\                PURE TypeScript, zero dependencies
│  │  ├─ exercises\        Exercise, AnswerSpec, AnswerAttempt
│  │  ├─ session\          the session engine, SessionObserver
│  │  ├─ progression\      profile, mistake review, difficulty
│  │  ├─ math\             problem generators, 5 levels
│  │  └─ ports\            interfaces to the outside world
│  ├─ adapters\            implementations of the ports
│  │  ├─ input\            voice
│  │  ├─ speech\           vosk-browser, speech synthesis
│  │  ├─ storage\          saves
│  │  └─ audio\            sounds from an oscillator, no files
│  ├─ game\                the battle and the roster (G6, G7)
│  ├─ locale\              the text pack: everything the child sees or hears
│  ├─ ui\                  React components
│  ├─ assets.ts            resolves public\ paths against the served base
│  ├─ architecture.test.ts A1 enforced — see the stress test under A1
│  ├─ App.tsx
│  └─ main.tsx
├─ tsconfig.json
├─ tsconfig.core.json      the core typechecked with no DOM (A1)
└─ index.html
```

Folders the plan calls for and the tree does not have yet: `src\theme\`
(**A6**, phase 5/6), `src\core\reading\` (phase 4), `electron\` (**T14**, phase
7). They stood as empty placeholders until 2026-08-31 and were removed — an
empty folder documents nothing this file does not say better, and a `.gitkeep`
in a folder that has since filled up is just litter.

**Why this way.** A hexagonal layout: the core declares **ports** (what it needs
from the world) and the outer layer supplies **adapters** (how it is done). The
core can be tested with stand-in adapters, and the real ones can be swapped
without touching the logic. If vosk-browser disappoints, for instance, one file
in `adapters/speech` changes.

### A10. The teacher lives behind an abstraction — **Accepted**

The character is drawn through a single interface, behind which a Rive file, a
GLB model or sprites live equally well. The game does not know which.

**Why.** A 3D character is realistically achievable through AI today (mesh
generation in Meshy/Tripo → auto-rigging in Mixamo → animations from there).
But AI is strong at making a mesh and weak exactly where a «teacher» lives:
lip-sync and expressive reactions. Rive, on the other hand, gives handmade
expressiveness cheaply, and its state machine maps onto **A4** events almost
literally. There is no reason to decide in advance — behind the abstraction the
switch costs one file. See **G5**.

---

## C. Learning content

| ID | Decision | Status |
|---|---|---|
| **C1** | Math — one ladder of levels, five of them today, open upwards. | Accepted |
| **C2** | Reading — three alternating mechanics. | Accepted |
| **C3** | Failed tasks come back after 1 / 3 / 7 sessions. | Accepted |
| **C4** | Three mistakes in a row → the difficulty quietly drops a step. The child does not see it. | Accepted |
| **C5** | **«Did not catch that» is not a mistake in the problem.** | Accepted |

### What the levels actually are

**C1** is elaborated in **[MATH.md](MATH.md)** — the math ladder, level by level
and row by row. Methodology only: what a task may be and by what rules, with
nothing about how it is implemented, how the answer reaches the game, or what
the game wraps around it. Renamed from `EXERCISES.md` on 2026-08-31, when the
last of the other three leaked back into it.

It is kept there and not here on purpose. The two used to be copies of each
other, and copies drift: the level 2 row in this document described «± up to 20
without crossing the ten» long after the code had settled on two operations
within ten. This section holds the decision — that there is one ladder, shared
by the rows that ride it — and the catalogue holds what its rungs contain.

**Five rungs is where it stands, not how long it is.** Grades 1–2 end at
two-digit carrying, so the ladder ends there for now; multiplication, three-digit
numbers and the olympiad questions are rungs six and upwards, added by appending
rather than by re-cutting. Nothing may treat five as the top: the code reads the
ends off the list of rungs (`FIRST_LEVEL`, `LAST_LEVEL`), and the one place that
ties an opponent's difficulty to a rung — `BY_LEVEL` in `src/game/monsters.ts`,
which joins a King's Bounty unit level to the math ones — is the one place that
has to be re-cut when the ladder grows.

**C2** has no such document. It gets one on its own terms when it is designed,
beside `MATH.md` rather than inside it — the same reason the placeholder types
came out of the code (see **A2**).

**Why three mechanics and not one.** Only one of the three needs a microphone. If
syllable recognition turns out weak — a short «ма» is recognised noticeably
worse than «пять» — reading stays playable anyway.

### C5 — why

If recognition did not manage, that is the equipment's problem, not the
child's. Such an attempt takes no star, does not enter the review queue and does
not count as an error. The teacher says «oh, I did not catch that, say it
again». Otherwise the child is punished for the quality of a microphone and
concludes that they are bad at counting.

Encoded in the types: `AnswerAttempt` has a separate `unrecognised` variant, and
`Verdict` a separate value beside `correct` and `wrong`.

---

## G. Gamification

| ID | Decision | Status |
|---|---|---|
| **G1** | Self-sufficient mini-games first; gamification is hung on top later (through **A4**). | Accepted |
| **G6** | The format is a **Mortal Kombat style battle**: hearts on both sides, fought to a win, a result window. | Accepted |
| **G7** | A monster is balanced with two dials: **how many hearts** (length of the battle) and **which levels the tasks come from** (difficulty). | Accepted |
| **G2** | The setting: wizard against a little monster / space / something else. | **Open** — phase 6 |
| **G3** | The cast of teacher characters. | **Open** — the child may pick them |
| **G4** | A timer on answers: speed bonus / hard limit / no clock. | **Deferred** — taken off the critical path by **A7** |
| **G5** | The teacher: 3D through AI, or 2D through Rive. | **Open** — phase 5, behind abstraction **A10** |

**G6 — how it works.** Top left, the child's name and 5 hearts; on the right,
the monster and its hearts. A correct answer takes a heart off the monster, a
mistake off the child. The battle runs until somebody runs out. The result comes
up in a popup.

The implementation is `src/game/Battle.ts`, an ordinary `SessionObserver`. The
mini-game does not know battles exist: delete the class and the math carries on.
Exactly what the **A4** seam was conceived for.

Because the length of a battle is not known in advance, `ExerciseSession`
learned to work without `taskCount`: the session runs until stopped from
outside.

**The battle works against olympiad tasks, and level 5 is olympiad-flavoured.**
A mistake costs a heart (**P10**), and three in a row quietly ease the
difficulty (**C4**) — so a child who reaches for something hard is punished for
reaching and then steered back down. Both mechanics are right for drilling
fluency and wrong for a question meant to be puzzled over. That column probably
wants a home outside the battle; deciding where is phase 6 work. Recorded here
rather than in the exercise catalogue, because it is a fact about the format and
not about the mathematics.

**G7 — why two dials and not one «difficulty».** They produce different
characters out of one and the same set of problems:

| Monster | Hearts | Levels (C1) | What it plays like |
|---|---|---|---|
| Goblin 👺 | 10 | 1 | quick and simple — a warm-up |
| Zombie 🧟 | 20 | 1–2 | easy but long: trains stamina |
| Vampire 🧛 | 10 | 3–4 | short but bitey |

The config is `src/game/monsters.ts`, pure data with no logic. A new opponent is
one row in the array plus a name in the text pack.

### A sketch (not a decision, a starting point for phase 6)

- **The core is «the duel».** The child and the teacher against a little
  monster. A correct answer = a hit. A mistake = the teacher raises a shield, no
  damage, the battle simply lasts longer, and a hint appears right away. 6–8
  tasks = one battle = 2–3 minutes.
- **Stars:** 3 ⭐ for a clean run, 2 ⭐ for one or two mistakes, 1 ⭐ for finishing.
- **Streaks.** Three correct in a row and the pet joins in and attacks by
  itself. The child aims for streaks, which is exactly what building fluency in
  counting requires.
- **Collecting.** Coins → teacher costumes, pets, decorations for the house. At
  six, collecting beats any number of points.
- **A journey map** across the levels of **C1**: Ten Meadow → Twenty Forest →
  The Crossing Cave → Round Mountain → Hundred Castle.
- **A parent screen** behind a PIN: what is hard, how long was practised,
  progress by week.

---

## Open questions

| ID | Question | When we decide |
|---|---|---|
| ~~O1~~ | ~~Which Vosk model: small or accurate~~ — **closed**: there is no choice, only small models support a grammar (**T17**) | closed 2026-08-29 |
| **O2** | A human narrator instead of the system synthesiser (**T12**) | after phase 5, if synthesis sounds bad |
| **G2** | The setting | phase 6 |
| **G3** | Who the teacher characters are | phase 5, possibly with the child |
| **G4** | A timer on answers | phase 6 |
| **G5** | 3D or Rive for the teacher | phase 5 |

**On going back to a tablet.** The game stays a web application, so the same
code will open from a link in a browser and can be wrapped into an Android APK
(through Capacitor) if we ever want to. The door is not shut, but we are not
working in that direction now.

---

## Technical debt

Deliberate simplifications. Not to be forgotten, but not to be fixed early
either.

| What | Why it is like this for now | When to fix |
|---|---|---|
| `ScriptProcessorNode` in `VoskRecognizer` is deprecated | AudioWorklet needs a separate worklet file and is noticeably more complex; this works in Chromium | phase 3, if audio artefacts turn up |
| A 6 MB bundle: the Vosk WASM build is inlined whole | it loads instantly on a local machine, there is nothing to optimise | phase 7 — a lazy import, so the window draws before the model loads |
| The silence thresholds in `VoskRecognizer` are set by feel | retuned on live play 2026-08-30 (the child was being asked to repeat while still thinking), but never measured numerically | when misses come back; the rig logs milliseconds per attempt |

---

## Changelog

| Date | What |
|---|---|
| 2026-08-28 | Document created. P1–P7, T1–T8, A1–A8, C1–C4, G1 recorded. Stack: Unity + C# + Android. |
| 2026-08-28 | **Stack replayed:** Unity/C#/Android → web/TypeScript/Electron/PC. Replaced P4→P8, T1→T9, T2→T10, T6→T12, T7→T13, T8→T14, A8→A9. Added P9, T11, T15, T16, C5, A10, G5. Project skeleton deployed. |
| 2026-08-29 | Phase 0 closed. Phase 1 started: Russian numerals with tests, the `VoskRecognizer` adapter, the measuring rig. Added **T17**, closed **O1**, opened the technical debt section. |
| 2026-08-29 | **Phase 1 closed: voice works, P9 stands.** Almost all of phase 2: generators for five levels, `ExerciseSession`, `ReviewQueue`, `DifficultyAdapter`, 91 tests. Invariant **A1** verified — zero React and DOM imports in `src/core`. |
| 2026-08-29 | **Phase 2 closed:** `Profile` and the storage adapters added, 101 tests. `Profile` subscribes to a session as an ordinary `SessionObserver` — which doubles as proof that the **A4** seam works. |
| 2026-08-29 | **Phase 3 assembled:** a playable math screen with voice input, the teacher's narration, the fallback input and a stand-in character. **A3** clarified (the port is for an input you ask; the keyboard answers directly). Waiting on the child. |
| 2026-08-29 | **The format changed to a battle (G6, G7).** P6 replaced by **P10**: a battle can be lost, progress cannot. Added `src/game/` (the monster config plus `Battle`), the battle screen, opponent selection, the child's name. `ExerciseSession` learned sessions of unknown length. 115 tests. |
| 2026-08-30 | **Renamed to CogniQuest** (briefly Smart Quest along the way). The save prefix went `smartkid:` → `cogniquest:` without migration — the progress under the old name was deliberately let go. |
| 2026-08-30 | **Carrying across the place became level 4.** It was generated nowhere: level 3 forbade it and the old level 4 kept one place per step, so the central skill of the second year had fallen through the ladder. Plain three-number chains gave up the rung for it and now live at level 5, where the pair that makes ten earns them. Mixed plus-and-minus chains are lost with them: they belong to their own row of the grid and need generators of their own. |
| 2026-08-30 | **The math ladder rebuilt to the grades 1-2 grid.** Levels are now: within ten, across the ten, up to a hundred without carrying, three numbers, and a pair that makes ten. Each step adds exactly one difficulty. Round tens stop being a level of their own; subtraction moves with addition because they share one table; level 5 is the first olympiad-flavoured step, where the work is in spotting the pair rather than in the size of the numbers. Catalogue: [MATH.md](MATH.md). |
| 2026-08-30 | **Phase 3 closed on the child.** A battle fought through by voice start to finish, then a request for another, then a request for new characters. P9 (answering out loud) survives contact with its only user, and the timings needed no tuning. The ask for characters is a finding in its own right: pull the **G3** conversation forward and treat the roster as content worth extending, not decoration. |
| 2026-08-30 | **Localisation.** Everything the child sees or hears moved into `src/locale/ru.ts`; the code, comments, tests and both documents are now English, and the decision IDs moved from Cyrillic to Latin (П→P, Т→T, А→A, К→C, Г→G, О→O). Monster ids became English slugs with names looked up from the text pack. 137 tests. |
| 2026-08-30 | **Missing number added** — the fourth row of the grid. A base sum for the level with one operand hidden (`□+2=5`), so it rides the addition/subtraction ladder rather than defining its own. New `equation` prompt shape, `missing-number` task kind, wired to the goblin and the zombie. The answer is a number, so the judge and grammar are unchanged. Catalogue: [MATH.md](MATH.md). |
| 2026-08-31 | **Comparing numbers — the first answer that is not a number.** Two rungs and no more: at one digit there is nothing to look past, at two there is, and a third would need number words above a hundred, which **T16** does not have. The child names one of three words; **A5** carried it without a change, since the exercise was already handing out its own grammar. The fallback input (**T5**) now picks its pad from the kind of prompt — a keypad cannot answer `5 □ 7`. Two facts to watch: three words is a very short recognition list, and three answers can be guessed one time in three. Catalogue: [MATH.md](MATH.md). |
| 2026-08-31 | **Missing number and comparing numbers go into every opponent's default pool** (`DEFAULT_TASKS`); comparing only has rungs at levels 1–2, so it is quietly absent for the harder opponents. **Missing number given its own ladder** rather than riding the sums: within five, within ten, across the ten, two-digit (carry or not, by a coin flip), then the grouping problem unchanged at level 5. Zero operands dropped — no `7+□=7`. |
| 2026-08-31 | **A1 stopped being a promise and became a test.** `src/architecture.test.ts` reads the layer boundary off the files on every run; `tsconfig.core.json` typechecks the core against a `lib` with no DOM, so the list of forbidden globals is the compiler's and not a handwritten one. Three holes were found and closed while building it, all the same mistake — default-allow: packages were a ban-list, browser globals were a ban-list, and an undeclared layer was waved through entirely. The last of the three came from outside review. See the stress test under **A1**. |
| 2026-08-31 | **The reading placeholders taken out.** `ExercisePrompt` lost its `syllables` and `spoken` variants, `AnswerAttempt` its `sequence` one, `Subject` its `reading` member, and four exhaustive switches lost the branches that existed only to say «nothing to show here». `Profile` lost the per-subject level ladder with them — `levels`, `levelFor`, `promote` had no production callers at all, since a battle draws its level from `monster.levels`. Reading will be designed on its own terms in phase 4; a shape guessed a phase early only has to fit what math happened to need. `PROFILE_VERSION` deliberately **not** bumped: `fromJSON` hands back an empty profile on a version it does not know, so a bump would have wiped the child's progress to tidy a key nothing reads. Knock-on: `LAST_LEVEL` now has no callers. |
| 2026-08-31 | **`EXERCISES.md` became [MATH.md](MATH.md), methodology and math only.** The reading section went out with the placeholder types, and so did everything that was not methodology: recognition and grammar notes, the microphone column, which opponent draws which row, `DEFAULT_TASKS`, the cost of a mistake in a battle. A catalogue of what a child is asked should read the same whether the game around it is a battle, a map or nothing at all. The one idea worth keeping — that a format punishing mistakes pulls against olympiad tasks — moved to **G6**, where facts about the format belong. **C2** gets a document of its own when it is designed, beside this one rather than inside it. |
| 2026-08-31 | **Every row but addition parked, to be put back one at a time.** Subtraction, chains, missing number and comparing numbers are commented out of `TaskKind` and out of `DEFAULT_TASKS` — four places each, listed above the union — while the game is cut back to one thing that can be watched working. Their generators, rules and tests are untouched and stay green; only the task table forgets them. The grid in [MATH.md](MATH.md) gained a ⏸ for exactly this state, which is neither «playable» nor «not written». |
| 2026-08-31 | **The ladder re-cut around two-digit work, and declared open upwards (C1).** The rungs are now: the bonds within five, up to ten without crossing it, the ten itself (crossed to twenty, or counted in whole tens to a hundred), two-digit without carrying, two-digit with. Carrying is the skill grades 1–2 are built towards, so it is the top rung rather than a middle one, and the olympiad trick that used to sit above it moves to the rungs beyond five — it still has a home at level 5 of the chains row. Two rules made explicit by the re-cut: a rung must not be able to draw the rung below it (level 2 always reaches past five; level 4 never draws `30+40`), and the answer range travels with the problem rather than the level number — level 3 asks two shapes with two ceilings. Missing number gives up the ladder it was granted a day ago and rides this one rung for rung; a second ladder was a second thing to keep in step, and it fell out of step at the first re-cut. **Zero stays on level 1**, at one problem in twenty rather than one in fifteen: `4+0`, `4−0` and `4−4` are three facts with nowhere else small enough to meet them, so the rung's own «numbers from one to five» is set aside for them rather than widened. The price is paid by the missing-number row, which rides the rung: about one of its level 1 questions in twenty can be read off instead of worked out (`4−□=0`). Catalogue: [MATH.md](MATH.md). |
