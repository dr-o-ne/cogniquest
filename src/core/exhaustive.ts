/**
 * Compile-time proof that every case of a union has been handled.
 *
 * Call it from the `default` branch of a switch. As long as every variant is
 * covered, `value` narrows to `never` and the call type-checks. Add a variant
 * to the union without teaching that switch about it, and the build fails right
 * where the gap is.
 *
 * That is the whole point. Task prompts (A2) are a union that grows with every
 * new kind of exercise, and the screens that render and speak them used to fall
 * through to `return null` — so a new kind would have compiled cleanly and shown
 * the child a blank screen. A failed build beats a silent one.
 */
export function assertNever(value: never, what = 'value'): never {
  throw new Error(`Unhandled ${what}: ${JSON.stringify(value)}`)
}
