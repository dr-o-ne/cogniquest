# Exercise types

What the child is asked, and by what rules. The methodology only — how any of
it is built is a question for the code, and the decisions behind it are **C1**,
**C2** and **A2** in [DECISIONS.md](DECISIONS.md).

---

## The grades 1–2 grid

Sixteen types across five levels, ticked off as they land.

✅ playable · ☐ not written · ✖ needs a way of answering the game does not have
· — the grid does not ask for this cell

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

Our rungs are not always the grid's. It asks for three numbers at level 3,
where we put two-digit-without-carrying, so that each rung introduces one
difficulty instead of three. And level 1 of the mixed row is served by the two
rows above it: a chain of one operation is `9 − 6`, which is what subtraction
already asks.

---

## Four rules every task obeys

**One new difficulty per rung.** Size, then place value, then carrying, then
count of operations. A rung that changes two things at once tells you nothing
about which one the child stumbled over.

**A rung whose difficulty is insight still has to be heavier than the one
below.** A trick that shortens an easy sum saves nothing, so the numbers on a
trick level are as big as on the level under it. This is not only tidiness:
when a child struggles the game quietly steps the difficulty down (**C4**), and
if the top rung were the lighter one, stepping down would hand them harder work.

**The answer is said out loud, so it has to be sayable** (**P9**). One number,
or one of a few words. That rules out proofs and strategies as answers — but
not as tasks: «prove the sum is even» becomes «is the sum odd or even», «find
all the ways» becomes «how many ways are there».

**No task can be answered without doing it.** Taking a number from itself,
adding nothing, a bracket that changes no answer, three tiny numbers dressed up
as a trick — each of them lets the child produce the right answer without
counting, and each has had to be deliberately kept out.

---

## Addition and subtraction

| Level | What is asked | Answers | Example |
|---|---|---|---|
| 1 | two numbers within ten | 0–10 | `3+4`, `9−4` |
| 2 | two numbers, the ten **has** to be crossed | 0–20 | `8+5`, `13−6` |
| 3 | up to a hundred, digit by digit, nothing carried | 0–100 | `45+20`, `68−14` |
| 4 | two-digit, the units overflow | 0–100 | `19+32`, `70−26` |
| 5 | three numbers where a pair makes a round one | 0–100 | `47+19+3`, `83−27−3` |

Levels 3 and 4 are a pair: one forbids carrying, the other insists on it. That
is what makes carrying a rung of its own rather than something met by accident.
Round tens are not a rung — `30+40` is level 3 with both units at zero.

Level 5 is the olympiad-flavoured one. Head-on it is level 4 twice over; spot
that 47 and 3 make 50 and it becomes one easy sum.

**Zero is level 1's business**, about one problem in fifteen each way: `9−9=0`,
`7+0=7`, `7−0=7`. Each is a fact worth meeting, and the dosage is what keeps it
from becoming a way of answering without counting. `0+0` never appears — that
is not a fact about zero, it is nothing. From level 2 up, carrying and borrowing
rule zero out anyway.

---

## Addition and subtraction together

A ladder of its own, because its difficulty runs along a different axis: not
the size of the numbers but how many operations have to be held at once, and
whether the order they are worked in is the order they are written in.

| Level | Numbers | Answers | Example |
|---|---|---|---|
| 2 | 3 | 0–20 | `19 − 13 + 8 = 14` |
| 3 | 4 | 0–100 | `90 − 13 + 18 + 3 = 98` |
| 4 | 3 | 0–100 | `97 − (63 − 34) = 68` |
| 5 | 4 | 0–100 | `27 + 15 − 7 + 40 = 75` |

There is no level 1: one operation is a plain sum, and the rows above already
ask those.

At levels 2 and 3 both signs always appear. The point of these rungs is that
the child cannot settle into one operation and stay there, so a chain that came
out all-plus would miss it entirely.

**Level 4 is brackets, and only brackets that change the answer.** `(20+5)−8`
is 17 either way; a bracket that changes nothing teaches that brackets are
decoration. The numbers stay two-digit — unlearning four levels of left-to-right
on numbers under twenty would be a rung down.

**Level 5 is the same insight one step further.** Level 4 hands the child an
order to work in; here nobody does, and they have to find one.

---

## What the unwritten types will cost

- **Nothing new to judge** — missing number, how many more, increase/decrease,
  making a number, sequences, patterns, word problems. The answer is a number,
  so the existing judging works as it stands.
- **A new kind of answer** — comparing numbers, answered «больше / меньше /
  равно». Three words are a very short list for speech recognition, and
  «больше» and «меньше» differ by one opening consonant. Measure it on the rig
  before trusting it (**T16**).
- **A new way of answering altogether** (✖) — geometry, time, money, measuring.
  The task and the answer are both pictures: a clock face, coins, a shape to
  assemble. Nothing in the game is answered by pointing yet.

### The level 5 column

Olympiad-ish by intent, and that fits: the difficulty lives in the question,
and a question whose answer is one number is judged like any other however hard
it is to work out.

Two limits to remember when that column is built:

- number words stop at a hundred, so an answer of «сто двадцать» is out of
  reach until the vocabulary grows;
- **the battle works against olympiad tasks.** A mistake costs a heart (**G6**,
  **P10**) and three in a row quietly ease the difficulty (**C4**), so a child
  reaching for something hard is punished and then steered back down. That
  column wants to live outside the battle.

---

## Reading — planned, not written

Three mechanics are decided (**C2**), and only one needs a microphone —
deliberately, in case short syllables recognise badly.

| Mechanic | What happens | Microphone |
|---|---|---|
| Read aloud | `МА-ШИ-НА` in large type, the child reads it | needed |
| Build the word | the teacher says a word, the syllables are tapped in order | no |
| Catch the syllable | the teacher says «ШИ», it is picked out among others | no |

The teacher stays silent on «read aloud» on purpose: saying the word would do
the exercise for the child.

---

## Who asks what

An opponent carries the types it may ask and the levels it may ask them at, and
draws a fresh pair for every question — so one fight moves the child between
kinds instead of letting them settle into a rhythm.

The goblin is the first to ask more than plain sums: with levels 1–2 and all
three written types, about a fifth of its questions are chains. Everyone else
asks addition and subtraction only. A type is listed opponent by opponent on
purpose — a new one should turn up in a child's fight because someone put it
there.
