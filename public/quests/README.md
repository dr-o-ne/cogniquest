# Mini-boss portraits

The picture each quest's card shows on the selection screen — King's Bounty's
own mini-boss for that road, not whoever the generator happened to draw for
its last stop (that monster is still `quest.boss`, kept only for the card's
colour).

A file here is wired up in `BOSS_IMAGES`, `src/game/quests.ts`, keyed by quest
id:

```ts
const BOSS_IMAGES = {
  'first-path': '/quests/robber.webp', // ← a link to a file from here
}
```

A quest with no line there fails to load rather than showing a blank card.

Formats: png, jpg, webp, gif, svg — whatever the source gives; no need to
convert. Portrait orientation, the way King's Bounty's own dialogue art is
cropped, reads best in the card's picture frame.
