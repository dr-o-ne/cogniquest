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

| Level | What is generated | Answer range | Example |
|---|---|---|---|
| 1 | two numbers within ten | 0–10 | `3+4`, `9−4` |
| 2 | two numbers, the ten **has** to be crossed | 0–20 | `8+5`, `13−6` |
| 3 | up to a hundred, digit by digit, nothing carried | 0–100 | `45+20`, `68−14` |
| 4 | two-digit, the units overflow | 0–100 | `19+32`, `70−26` |
| 5 | three numbers where a pair makes a round one | 0–100 | `47+19+3`, `83−27−3` |

Each step adds exactly one new difficulty: size, then place value, then
carrying, and finally a trick rather than a size. Levels 3 and 4 are a pair —
one forbids carrying, the other insists on it — which is what makes carrying a
rung of its own rather than something the child meets by accident.

Level 5 is the olympiad-flavoured one. Head-on it is level 4 twice over —
three two-digit numbers, a carry at every step; spot that 47 and 3 make 50 and
it turns into one easy sum. In the addition form the pair is kept apart and no
second pair may form with the term between them; in the subtraction form the
two subtrahends stand together, because combining them *is* the insight.

**The numbers there are big on purpose.** An earlier version of this rung was
built out of digits — `7 + 8 + 3` — and came out *easier* than level 4, since
a trick that shortens an easy sum saves nothing. That was not only a
pedagogical wrinkle: with a monster drawing from levels 4 and 5, easing the
difficulty down (**C4**) would have handed the child harder work, which is the
exact opposite of what that mechanism is for. A rung whose difficulty is
insight still has to sit above the one below it.

Round tens are no longer a level of their own: `30+40` is the case of level 3
where both units happen to be zero, not a separate skill.

The answer range is not decoration: the recognition grammar is built from the
whole of it (**T16**), so a wider range widens what the child can be heard
saying.

**The range travels with the problem, not with the level number.** A generator
declares what its answers can be; `levels.ts` holds nothing but the rungs. That
separation is what lets a second kind of task in: a comparison answers with a
word, and its «level 2» is a different level 2 altogether, so a shared table of
ranges per level could only have lied about one of them.

Ids look like `math:8+5` — the expression itself. Same problem, same id, so the
review queue recognises it next session.

**Zero is level 1's business, about one problem in fifteen each way:**
`9 − 9 = 0`, `7 + 0 = 7`, `7 − 0 = 7`. Each is a fact of its own and a child
who never meets them has nowhere to have learned them.

The dosage is the point. «a − a» used to arrive by accident and reached 29% of
the level, which turns a fact into a way of answering without counting.
`0 + 0` never appears — that is not a fact about zero, it is just nothing.

No other level does any of this: from level 2 up, borrowing and carrying rule
zero out on their own, and second operands there are never zero — `27 + 0`
would teach nothing that `7 + 0` had not already.

---

## The grades 1–2 grid

The target: sixteen types across five levels. Types are added one at a time and
ticked off here as they land.

✅ playable · ☐ not written · ✖ outside the current answer model ·
— the grid does not ask for this cell

| Type | 1 | 2 | 3 | 4 | 5 |
|---|:-:|:-:|:-:|:-:|:-:|
| Addition | ✅ | ✅ | ✅ | ✅ | ✅ |
| Subtraction | ✅ | ✅ | ✅ | ✅ | ✅ |
| Addition + subtraction | ✅ | ✅ | ✅ | ✅ | ✅ |
| Missing number `□+2=5` | ☐ | ☐ | ☐ | ☐ | ☐ |
| Comparing numbers `5 □ 7` | ☐ | ☐ | ☐ | ☐ | ☐ |
| «How many more?» | ☐ | ☐ | ☐ | ☐ | ☐ |
| Increase / decrease by | ☐ | ☐ | ☐ | ☐ | ☐ |
| Making a number (5 = 2 + □) | ☐ | ☐ | ☐ | ☐ | ☐ |
| Number sequences | ☐ | ☐ | ☐ | ☐ | ☐ |
| Word problems | ☐ | ☐ | ☐ | ☐ | ☐ |
| Logic | ☐ | ☐ | ☐ | ☐ | ☐ |
| Geometry | ✖ | ✖ | ✖ | ✖ | ✖ |
| Telling the time | ✖ | ✖ | ✖ | ✖ | ✖ |
| Money | ✖ | ✖ | ✖ | ✖ | ✖ |
| Measuring | ✖ | ✖ | ✖ | ✖ | ✖ |
| Patterns | ☐ | ☐ | ☐ | — | — |

Addition and subtraction now run the full ladder, and they run it together:
one level table serves both, so redefining a level moves the pair of them at
once. That includes level 5, where the trick simply reads backwards —
`7 + 8 + 3` finds a pair that makes ten, `50 − 7 − 3` takes one away.

**Where the addition ladder is not the grid's.** The grid asks for three
numbers at level 3; we put two-digit without carrying there, carrying at 4, and
three numbers at 5 — so that each rung introduces one difficulty instead of
three. Chains of two, three and four numbers live in their own row below, which
is where the grid puts them anyway.

### What each unwritten type will cost

**Nothing new to judge** — the answer is a number, so `ArithmeticAnswer` and the
existing grammar work unchanged. Only a generator, and sometimes a new prompt:
missing number, how many more, increase/decrease, making a number, number
sequences, patterns, and word problems (spoken by the teacher, since the child
reads syllables).

**One new judge** — comparing numbers. The answer is «больше / меньше / равно»,
a grammar of three phrases. Worth measuring on the rig before trusting it:
**T16** warns that a short list makes Vosk hear it everywhere, and those two
words differ by a single opening consonant.

**A new way of answering altogether** (marked ✖) — geometry, time, money,
measuring. Both the prompt and the answer are pictures: a clock face, coins, a
shape to assemble. `choice` and `sequence` attempts already exist in the model
and **A3** already says non-voice input answers the session directly, but there
is no graphic prompt and no tapping anywhere in the UI yet.

### Level 5 is meant to be olympiad-ish

Which is fine — difficulty lives in the prompt, and a task whose answer is one
number goes through the existing judge however hard it is to work out.

What does not fit is a task with no answer as an object: «prove without
computing», «find a strategy». `check(attempt): Verdict` will never accept a
proof. Those are rescued by rewording, not by code — «is the sum odd or even»
is a two-phrase grammar, «how many ways are there» is a number.

Two limits to remember when that column is built:

- number words stop at 100 (`MIN_NUMBER`/`MAX_NUMBER`), and `numberToWords`
  throws beyond it — an olympiad answer of «сто двадцать» would break grammar
  generation before the child ever heard the task;
- **the battle works against olympiad tasks.** A mistake costs a heart
  (**G6**, **P10**) and three in a row quietly ease the difficulty (**C4**).
  A child who reaches for something hard would be punished for it and then
  steered back down. Level 5 wants to live outside the battle.

---

## Chains — addition and subtraction together

`src/core/math/chains.ts`. A ladder of its own, because its difficulty runs
along a different axis: not the size of the numbers but how many operations
have to be held at once, and whether the order they are worked in is the order
they are written in.

| Level | Numbers | Range | Example |
|---|---|---|---|
| 2 | 3 | 0–20 | `19 − 13 + 8 = 14` |
| 3 | 4 | 0–100 | `90 − 13 + 18 + 3 = 98` |
| 4 | 3 | 0–100 | `97 − (63 − 34) = 68` |
| 5 | 4 | 0–100 | `27 + 15 − 7 + 40 = 75` |

**The ladder starts at level 2.** A chain of one operation is `9 − 6`, which is
exactly what the subtraction row asks — the same question wearing another row's
name. Written as its own rung it made a third of an opponent's «new» questions
indistinguishable from the old ones. Level 1 of this row is served by the two
rows beside it, and `levelsFor()` in `kinds.ts` is what stops an opponent from
asking for a rung that does not exist.

At levels 2 and 3 both signs are **guaranteed**, not merely likely: the point
is that the child cannot settle into one operation and stay there, and left to
chance a quarter of three-term chains come out all-plus. The signs are chosen
first and the numbers fitted to them.

**Level 4 is brackets, and only brackets that change the answer.** `(20 + 5) −
8` comes to 17 whether the bracket is there or not, and a bracket that changes
nothing teaches that brackets are decoration. So the bracket always sits at the
end behind a minus, where it matters. The numbers stay two-digit: four levels
have trained the child to work left to right, and unlearning that on numbers
under twenty would be a rung down.

**Level 5 is the same insight one step further.** Level 4 hands the child the
order to work in; here nobody does, and they have to find one — `27 + 15 − 7 +
40` is three operations across the place head-on, or a round 20 and two easy
additions once the 27 and the 7 are seen together.

A bracket reaches both the screen and the teacher's voice, and the exercise id
carries it too: `math:20-(5+3)` and `math:20-5+3` are different problems with
different answers, and an id that could not tell them apart would have the
review queue (**C3**) treat one as the other.

### Which opponent asks which

A **kind of task is a row of this grid**, named after it — `addition`,
`subtraction`, `addition-subtraction`, and the rows still to be written as they
land. There is no grouping above them: a word like «arithmetic» would cover
three rows and tell a reader nothing, and an opponent that should only ever ask
subtraction would have no way to say so.

`Monster.tasks` is a **pool**, exactly like `levels`: a kind is drawn afresh for
every question, so an opponent listing three asks all three, turn about.

```ts
const TUNING = {
  goblin: { tasks: ['addition', 'subtraction', 'addition-subtraction'] },
}
```

The default is `['addition', 'subtraction']`, and that is also where the coin
flip between plus and minus now lives. It used to be hidden inside the
generator, which meant two mechanisms deciding what to ask; picking a kind from
the pool is the only one left.

**Kind and level are drawn together, not one after the other**, because not
every row reaches every level. `taskChoices()` pairs each of an opponent's
kinds with each of the levels that kind actually has, and one pair is drawn
from the result. Drawing them separately could land on a pair with no rung —
chains at level 1 — with nothing sensible left to do about it.

The goblin is the first opponent switched over. With levels 1–2 and all three
kinds its legal pairs are:

```
addition@1  addition@2  subtraction@1  subtraction@2  addition-subtraction@2
```

so chains are about a fifth of its questions and always the level-2 ones —
`5 + 4 − 1`, `6 − 3 + 5`. Everyone else still asks addition and subtraction
only. Listing kinds one by one rather than «all of them» is deliberate: a row
implemented later should not turn up in a child's fight because it exists, but
because someone put it there.

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
