import type { Monster } from './monsters'
import type { Squad } from './squads'

/**
 * Who stands on the other side of a battle (**G9**): one opponent, or a squad.
 *
 * One value rather than a list of monsters and a flag beside it, because who is
 * on the other side and how they take turns are one decision — and because a
 * squad has an **identity** the profile has to be told about, which a bare list
 * of monsters cannot carry.
 *
 * It lived in `useBattle` until a quest's map needed to name the same thing, and
 * `game` cannot reach into `ui`. Its own module rather than `Battle.ts`, which
 * would have to import `Squad` from `squads.ts` — and `squads.ts` already
 * imports `MAX_SQUAD` back out of `Battle.ts`, so that is a cycle, and the
 * architecture suite refuses those.
 */
export type Opposition =
  | { readonly kind: 'duel'; readonly monster: Monster }
  | { readonly kind: 'squad'; readonly squad: Squad }

/** Everyone on the other side, whichever way they were picked. */
export function opponentsOf(opposition: Opposition): readonly Monster[] {
  return opposition.kind === 'duel' ? [opposition.monster] : opposition.squad.monsters
}
