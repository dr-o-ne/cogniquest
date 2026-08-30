# Character pictures

Monster pictures go here. A file `goblin.png` in this folder is served to the
game at `/monsters/goblin.png` — and that is exactly what goes into IMAGES in
`src/game/monsters.ts`:

```ts
const IMAGES = {
  goblin: '/monsters/goblin.png', // ← a link to a file from here
}
```

The display name is not here: it lives in the text pack, `src/locale/ru.ts`,
under the same id.

Formats: png, jpg, webp, gif, svg. Square with a transparent background works
best. 300×300 is plenty — it is never shown any larger.

A link to somebody else's site works too, but only while there is internet, and
it will stop working once packaged into an `.exe`. So a file here is better.

If a picture fails to load, the game quietly falls back to the emoji from
TUNING and carries on.

The files are kept in git alongside this note. There is only a handful of them
and they weigh some 120 KB in total, so there is nothing to gain by leaving them
out — and a lot to lose, since otherwise they exist on one machine only.
