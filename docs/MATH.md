# Math — what the child is asked

**Methodology only, and math only.** What a task may be and by what rules it is
built — level by level, row by row. Nothing here is about how it is implemented,
how the answer reaches the game, or what the game wraps around it: those live in
[DECISIONS.md](DECISIONS.md), and the decision this file elaborates is **C1**
(five levels).

Another subject would get a document of its own beside this one, on its own
terms. It is not written into this one.

---

## The grades 1–2 grid

Sixteen types across five levels, ticked off as they land.

✅ playable · ☐ not written ·
✖ needs a way of answering the game does not have ·
— the grid does not ask for this cell

| Type | 1 | 2 | 3 | 4 | 5 |
|---|:-:|:-:|:-:|:-:|:-:|
| Addition | ✅ | ✅ | ✅ | ✅ | ✅ |
| Subtraction | ✅ | ✅ | ✅ | ✅ | ✅ |
| Addition + subtraction | ✅ | ✅ | ✅ | ✅ | ✅ |
| Missing number `□+2=5` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Comparing numbers `5 □ 7` | ✅ | ✅ | — | — | — |
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
difficulty instead of three.

Nor does every row run the whole width. Comparing numbers stops at two rungs
because the row itself does — the dashes there mean «nothing left to ask», not
«not written yet».

The mixed row starts where the other two do, but not with one operation: its
first rung is three small numbers. «One action» would be `9 − 6`, which is what
subtraction already asks; three numbers under ten is the first question a child
cannot answer by choosing an operation once and counting to the end.

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

**The answer has to be one number, or one of a few named words** (**P9**). That
rules out proofs and strategies as answers — but not as tasks: «prove the sum is
even» becomes «is the sum odd or even», «find all the ways» becomes «how many
ways are there». A task whose answer will not fit that shape has to be rephrased
until it does, or it does not belong on the ladder.

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
| 1 | 3 | 0–10 | `7 + 2 − 5 = 4` |
| 2 | 3 | 0–20 | `16 − 6 + 4 = 14` |
| 3 | 4 | 0–100 | `90 − 13 + 18 + 3 = 98` |
| 4 | 3 | 0–100 | `97 − (63 − 34) = 68` |
| 5 | 4 | 0–100 | `27 + 15 − 7 + 40 = 75` |

Levels 1 and 2 differ the way they do in the row above: everything under ten,
then the ten has to be crossed. Level 2 always works above ten somewhere —
without that it kept reproducing level 1, and a quarter of it did.

**Both signs always appear.** The point of the row is that the child cannot
settle into one operation and stay there, so a chain that came out all-plus
would miss it entirely.

**And no step undoes the one before it.** `5 + 3 − 3` can be answered by
noticing the repeat instead of by counting — one in seven of the first rung
before it was kept out.

**Level 4 is brackets, and only brackets that change the answer.** `(20+5)−8`
is 17 either way; a bracket that changes nothing teaches that brackets are
decoration. The numbers stay two-digit — unlearning four levels of left-to-right
on numbers under twenty would be a rung down.

**Level 5 is the same insight one step further.** Level 4 hands the child an
order to work in; here nobody does, and they have to find one.

---

## Missing number

A known sum shown backwards: `terms … = result` with one operand covered up,
and the child names it. Reading a sum backwards is the whole skill, so the
ladder is about the size of the arithmetic behind the blank, nothing cleverer.

| Level | The sum behind the blank | Heard | Example |
|---|---|---|---|
| 1 | within five | 0–10 | `□+2=5`, `4−□=3` |
| 2 | within ten | 0–10 | `4+□=9`, `9−□=3` |
| 3 | across the ten | 0–20 | `□+6=13`, `12−□=4` |
| 4 | two-digit, carry or no | 0–100 | `56+□=94`, `□+15=82` |
| 5 | three terms, a pair makes a round one | 0–100 | `47+□+3=69`, `83−□−3=53` |

Levels 1 and 2 are their own small generators; level 3 is the ordinary
across-the-ten problem; level 4 flips a coin between two-digit-without-carry and
two-digit-with-carry so both are met; level 5 is the grouping problem
unchanged — three terms, so the equation has three too.

The blank falls on any operand but never on the result: `2+3=□` is plain
addition with an equals sign drawn in, and that row is already played. `□+2=5`
and `2+□=5` are different tasks, and the review queue (**C3**) keeps them apart.
Every operand is at least one — no `7+□=7`.

The answer is one number, so this row asks nothing of the game that addition
did not already ask.

---

## Comparing numbers

| Level | What is asked | Example |
|---|---|---|
| 1 | two numbers within ten | `3 □ 8` |
| 2 | two-digit numbers | `19 □ 21` |

The answer is a word — больше, меньше or равно — read left to right: in
`5 □ 7` the five is the one that is меньше.

**Two rungs is the whole row.** Its difficulty is how far into a number the
child has to look, and there are only two answers to that here: at one digit
there is nothing to look past, at two there is. The third would be three-digit
numbers, and the number words stop at a hundred — «сто двадцать» is outside the
vocabulary the game has. So levels 3–5 are marked «not asked» rather than «not
written yet». Comparing whole expressions — `5+3 □ 4+4` — would climb further,
but that is a different question and would want a row of its own.

**Level 2 exists to catch one mistake.** Nine is more than one, so nineteen
must be more than twenty-one. A problem where the units happen to agree with
the answer — `45 □ 47` — is answered correctly by that wrong method and teaches
the child that it works, so it never appears: here the units either point the
other way or are identical on both sides.

Both kinds in equal measure, and the second is not padding. If the units always
pointed the other way, «whichever has the smaller units is the bigger number»
would be right every time — the same shortcut upside down. Identical units say
nothing at all, and nothing is what that shortcut deserves.

**«Равно» is one answer in six.** All three words are named in every question,
so one that never came up would make the offer a lie. A third would be too
many: two numbers that are the same are the easiest of the three to see.

**The first row not answered with a number**, and one thing follows from that
which no other row has to worry about: **three answers can be guessed.** One
time in three comes out right by luck, where a sum offers a hundred numbers to
be wrong with. A correct answer here is weaker evidence of understanding than a
correct answer anywhere else, and a run of them is worth less than it looks.

---

## What the unwritten rows would ask for

Sorted by the shape of their answer, because that is what decides whether a row
is merely unwritten or out of reach.

- **A number** — how many more, increase/decrease, making a number, sequences,
  patterns, word problems. The same answer shape every row above already uses,
  so these are unwritten and nothing more.
- **A word off a named list** — comparing numbers was the first of these. Any
  row answered the same way asks for nothing new.
- **Something pointed at rather than said** (✖) — geometry, telling the time,
  money, measuring. The task and the answer are both pictures: a clock face,
  coins, a shape to assemble. These do not fit the answer shape above at all,
  which is why the grid marks them ✖ rather than ☐.

### The level 5 column

Olympiad-ish by intent, and that fits: the difficulty lives in the question,
and a question whose answer is one number is judged like any other however hard
it is to work out.

One limit to remember when that column is built: number words stop at a hundred,
so an answer of «сто двадцать» is out of reach until the vocabulary grows.

There is a second, and it is not a methodological one — a format that costs the
child something for a mistake pulls against tasks meant to be reached for. It is
recorded where it belongs, under **G6** in [DECISIONS.md](DECISIONS.md).

---

## Mixed, not blocked

The kind of task is drawn afresh for every question, rather than run as a block
of one kind followed by a block of the next. A child who meets ten sums in a row
settles into the operation and stops reading the question; a child who cannot
tell what is coming has to read every one.

From which it follows that a task must stand on its own with no run-up. That is
why all three words are named every time a comparison is asked: there is no
earlier question of the same kind for the child to have learnt them from.

A new row earns its place in the mix, though. Given on its own for a while
first, a run of nothing else says plainly whether it is understood or merely
guessed; only then does it join the draw. Which rows are mixed together in
practice is a question for the game, not for the methodology.

A row is drawn only at a level it actually has. Comparing numbers has two rungs,
so above level 2 it is simply not asked — not a gap to fill later, but the end
of that row.
