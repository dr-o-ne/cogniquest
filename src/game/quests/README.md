# Quest files

One path, one file, named `<order>_<id>.json` — `01_first-path.json`,
`02_second-path.json`, and so on. `<order>` decides the sequence the paths are
offered in (numeric, so `9` sorts before `10`); `<id>` becomes the quest's id,
and needs a name in the text pack under the same key, `t.quests` in
`src/locale/ru.ts`.

A file holds nothing but a list of demands — a row of the grid and the band
(1–5) to ask it at, exactly the two things a card's own difficulty already
runs on. `src/game/quests.ts` reads every file here and turns each demand into
the actual opponent standing there, drawn from the same pile `ASKS` in
`src/game/monsters.ts` deals opponents out of on the arena. Nothing here names
a monster by id — that is the whole point: a file says what the child should
be asked, not who asks it.

```json
{
  "stops": [
    { "kind": "addition", "level": 1 },
    { "kind": "subtraction", "level": 1 }
  ]
}
```

A `kind` is one of `addition`, `subtraction`, `comparing-numbers`,
`making-a-number`, `missing-number` — the rows in `src/core/math/kinds.ts`.
`level` is the opponent's own band, 1–5, the same number a card shows in its
corner — not a math rung; the arithmetic itself is drawn from whichever rungs
that band's opponent already reaches.

**A stop with several types is a squad** rather than a duel — a band of
opponents, one per type, each with its own level:

```json
{
  "kind": [
    { "kind": "addition", "level": 1 },
    { "kind": "subtraction", "level": 2 }
  ]
}
```

Two to five types, no type repeated (`MAX_SQUAD` in `src/game/Battle.ts` sets
the ceiling).

**The last stop is the boss**, and only the last one — it must be a plain
single-type stop, never a band. Nothing marks it; its position does.

A file cannot demand more than a band's pile actually has — level 1 gives
nothing to `missing-number`, for one (see the comment on `ASKS`). Asking for
one anyway throws when the game loads, not quietly. The same demand asked
twice draws two different opponents from the pile where the pile has more
than one to give, so «addition 1, addition 1» is not the same picture twice
in a row — and that holds **across files, not just inside one**: two paths
that both open on `addition 1` meet two different opponents there too, not
the same picture on both cards. Only a pile that small ever repeats it: a
level with a single name to give (`making-a-number` at level 1 is one deep)
repeats no matter how many files ask for it.
