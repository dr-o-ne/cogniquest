# Exercise types

What the game can ask a child to do, what is implemented, and what it takes to
add a new type. The decisions behind all of this are **C1**, **C2** and **A2**
in [DECISIONS.md](DECISIONS.md) — this file is the catalogue, not the argument.

Whatever is written here is meant to match the code. When they disagree, the
code is right and this file is stale; fix it in the same commit.

---

## One shape for everything

Every task, in every subject, is an `Exercise` (**A2**,
`src/core/exercises/Exercise.ts`):

| Field | What it is |
|---|---|
| `id` | Identical tasks get an identical id — the review queue (**C3**) rests on this |
| `subject` | `math` or `reading` |
| `level` | Difficulty within the subject |
| `prompt` | What to show and/or say |
| `answer` | An `AnswerSpec`: how to judge what came back |

Because of that single shape, the session engine, the review queue, the
difficulty adjustment, the battle and the profile are written once and work for
every type that will ever be added. None of them knows what a task is about.

---

## The catalogue

### Prompts

`ExercisePrompt` is a union; each kind is a way of putting a task to the child.

| Kind | What the child gets | State |
|---|---|---|
| `arithmetic` | `2 + 3` or `8 − 3 + 2` on screen, read out loud | **implemented** |
| `syllables` | `МА-ШИ-НА` in large type, one colour per syllable | declared, no generator |
| `spoken` | Nothing on screen; the teacher says it | declared, spoken correctly, never produced |

A prompt kind that nothing produces is not dead weight: it is a decision already
made about the shape reading will take.

### Answers

`AnswerAttempt` is what an input hands back, whatever the input was (**A3**).

| Kind | Comes from | Used by |
|---|---|---|
| `number` | the fallback number pad | arithmetic |
| `text` | voice recognition | arithmetic |
| `choice` | tapping one option | reading, later |
| `sequence` | tapping several in order | reading, later |
| `unrecognised` | nothing was caught | every type — and it is never a mistake (**C5**) |

### Judges

`AnswerSpec.check(attempt) => Verdict` decides `correct` / `wrong` /
`unrecognised`. There is exactly one implementation today:

- **`ArithmeticAnswer`** (`src/core/math/ArithmeticAnswer.ts`) — compares a
  number, or parses one out of recognised speech. Also implements
  `VoiceAnswerable`, so it hands out its own recognition grammar (**A5**).

---

## Math — the only type in play

Generators live in `src/core/math/generator.ts`, the level table in
`levels.ts`. Problems are built straight to the rule of the level, never
«generate and check», so a generator cannot spin and cannot leave its rule.

| Level | What is generated | Answer range |
|---|---|---|
| 1 | ± within 10, two numbers | 0–10 |
| 2 | three numbers, two operations, every intermediate step within 10 | 0–10 |
| 3 | across the ten: `8+5`, `13−6` | 0–20 |
| 4 | round tens: `30+40`, `70−20` | 0–100 |
| 5 | anything up to 100 | 0–100 |

The answer range is not decoration: the recognition grammar is built from the
whole of it (**T16**), so a level that widens its range widens what the child
can be heard saying.

Ids look like `math:8+5` — the expression itself. Same problem, same id, so the
review queue recognises it next session.

Second operands are never zero: «7 + 0» teaches nothing.

---

## Reading — planned, not written

`src/core/reading/` is empty. Three mechanics are decided (**C2**), and only
one of them needs a microphone — deliberately, in case short syllables turn out
to recognise badly.

| Mechanic | Prompt | Answer | Microphone |
|---|---|---|---|
| Read aloud | `syllables` | `text` | needed |
| Build the word | `spoken` | `sequence` | no |
| Catch the syllable | `spoken` | `choice` | no |

The teacher stays silent on a `syllables` prompt on purpose: saying the word
would do the exercise for the child.

---

## Adding a new type

The engine costs you nothing. The work is three files, and the compiler names
the rest.

1. **A judge.** Implement `AnswerSpec` — `check(attempt): Verdict`. If it can be
   answered out loud, also implement `VoiceAnswerable` and return the whole
   plausible range of answers as the grammar, not just the right one (**T16**).
2. **A generator.** A function returning an `Exercise`: an id that repeats for
   the same task, a subject, a level, a prompt, and the judge from step 1.
3. **Text.** Every word the child sees or hears goes into `src/locale/ru.ts`.

Then, only if the prompt is a genuinely new shape:

4. **Extend `ExercisePrompt`** — and the build breaks in three places until you
   say what happens there: what is drawn (`Expression` in `BattleGame.tsx`),
   what the teacher says (`questionText`), and whether there is an answer to
   read out afterwards (`correctAnswerOf`). That is `assertNever` doing its job;
   the alternative was a blank screen during play.

And if the subject is new rather than the type:

5. **Extend `Subject`** — TypeScript will then demand a ceiling in `MAX_LEVEL`
   and a starting level in the profile defaults. It will not let you forget.
6. **Give it a level table of its own.** `DifficultyAdapter` counts steps up and
   down; what a step means is the subject's business, not the adapter's.
7. **Teach the battle to pick it.** `useBattle.fight()` still hardcodes
   `subject: 'math'` and the arithmetic generator, and `Monster.levels` means
   math levels. An opponent guarding an island of logic needs to say which
   subject its tasks come from.

Steps 1–3 are an afternoon. Steps 5–7 are the price of the second subject, paid
once.

## What you get for free

Nothing below has to be touched when a type is added, and if it does, something
has leaked:

- `ExerciseSession` — hands out tasks, counts attempts, broadcasts events
- `ReviewQueue` — brings back what was missed, after 1 / 3 / 7 sessions (**C3**)
- `DifficultyAdapter` — quietly eases off after three mistakes (**C4**)
- `Battle` and `Profile` — subscribed as ordinary observers (**A4**)
- Voice input — takes its grammar from the exercise, knows nothing else (**A5**)
