# Project decisions

A learning game for a child: math and reading by syllables, answered by voice.

**Last updated:** 2026-08-30
**State:** phase 3 closed on the child; reading (phase 4) is next
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

Text is the single deliberate exception, and a narrow one: `core/math/numerals`
takes number words from `src/locale`. The text pack is pure data with
no React and no DOM, so the invariant above is untouched.

### A2. `Exercise` — one task type for both subjects — **Accepted**

`src/core/exercises/Exercise.ts`

| Task | Prompt | Answer |
|---|---|---|
| arithmetic | `2 + 3` | the number `5` |
| read aloud | `["МА","ШИ","НА"]` | the spoken word |
| build the word | 🔊 «машина» | a sequence of syllables |
| catch the syllable | 🔊 «ШИ» | a pick among options |

**Why.** Math and reading produce the same type. Which means the session
engine, progress, mistake review and all of gamification are written once and
work for both.

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

`src/theme` — the description of a set: characters, opponents, colours, sounds,
lines.

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
│  └─ ROADMAP.md           ← what we are doing, and in what order
├─ public\
│  └─ models\              the Vosk model (not in git, fetched separately)
├─ electron\               the .exe wrapper, filled in during phase 7
├─ src\
│  ├─ core\                PURE TypeScript, zero dependencies
│  │  ├─ exercises\        Exercise, AnswerSpec, AnswerAttempt
│  │  ├─ session\          the session engine, SessionObserver
│  │  ├─ progression\      profile, mastery, mistake review
│  │  ├─ math\             problem generators, 5 levels
│  │  ├─ reading\          syllables, words, splitting
│  │  └─ ports\            interfaces to the outside world
│  ├─ adapters\            implementations of the ports
│  │  ├─ input\            voice, keyboard
│  │  ├─ speech\           vosk-browser, speech synthesis
│  │  └─ storage\          saves
│  ├─ locale\              the text pack: everything the child sees or hears
│  ├─ ui\                  React components
│  ├─ theme\               presentation sets
│  ├─ App.tsx
│  └─ main.tsx
└─ index.html
```

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
| **C1** | Math — five levels (table below). | Accepted |
| **C2** | Reading — three alternating mechanics (table below). | Accepted |
| **C3** | Failed tasks come back after 1 / 3 / 7 sessions. | Accepted |
| **C4** | Three mistakes in a row → the difficulty quietly drops a step. The child does not see it. | Accepted |
| **C5** | **«Did not catch that» is not a mistake in the problem.** | Accepted |

### C1. The math levels

| Level | Content | Grammar range (T16) |
|---|---|---|
| 1 | ± within 10 | 0–10 |
| 2 | ± up to 20 without crossing the ten | 0–20 |
| 3 | ± across the ten: `8+5`, `13−6` | 0–20 |
| 4 | round tens: `30+40`, `70−20` | 0–100 |
| 5 | anything up to 100 | 0–100 |

### C2. The reading mechanics

| Mechanic | What happens | Microphone |
|---|---|---|
| Read aloud | `МА-ШИ-НА` in large type, syllables in different colours, the child reads | needed |
| Build the word | the teacher says a word, the syllables float about, click them in order | not needed |
| Catch the syllable | the teacher says «ШИ», catch the right one among others | not needed |

**Why three and not one.** Only one of the three needs a microphone. If
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
| 2026-08-30 | **Phase 3 closed on the child.** A battle fought through by voice start to finish, then a request for another, then a request for new characters. P9 (answering out loud) survives contact with its only user, and the timings needed no tuning. The ask for characters is a finding in its own right: pull the **G3** conversation forward and treat the roster as content worth extending, not decoration. |
| 2026-08-30 | **Localisation.** Everything the child sees or hears moved into `src/locale/ru.ts`; the code, comments, tests and both documents are now English, and the decision IDs moved from Cyrillic to Latin (П→P, Т→T, А→A, К→C, Г→G, О→O). Monster ids became English slugs with names looked up from the text pack. 137 tests. |
