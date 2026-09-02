export {
  Battle,
  MAX_SQUAD,
  type BattleConfig,
  type BattleState,
  type Foe,
  type Winner,
} from './Battle'
export {
  availableMonsters,
  HEARTS_MAX,
  HEARTS_MIN,
  MONSTERS,
  monsterById,
  PLAYER_HEARTS,
  type Monster,
} from './monsters'
// `squadById` stays unexported from here: nothing outside `game` looks a squad
// up by id, and an export is a claim that somebody does.
export { SQUADS, type Squad } from './squads'
