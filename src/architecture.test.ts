import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * A1 as a test rather than a promise (docs/DECISIONS.md, «The stress test»).
 *
 * The document already says what must hold: not one import from React, from a
 * DOM API or from an adapter anywhere in `src/core`. It was checked by hand
 * once, and by hand means once — the import that breaks it lands months from
 * now, in a hurry, and nobody re-reads a changelog before committing.
 *
 * This file owns the import half: which module may reach for which. The other
 * half — no DOM API — belongs to `tsconfig.core.json`, which typechecks the
 * core against `lib: ES2022` with no DOM at all. That is deliberate. A list of
 * banned globals here would only ever catch the names somebody thought to write
 * down, and `lib` is the same list kept exhaustive by the compiler.
 *
 * The table below is the boundary. Widening it is allowed — that is what a
 * decision record is for — but it has to be done here, on purpose, in a diff
 * somebody can see, rather than by an import sliding in unnoticed.
 */

const SRC = fileURLToPath(new URL('.', import.meta.url))

interface Boundary {
  /** Layers under `src` this one may import from. */
  readonly layers: readonly string[]
  /**
   * Packages it may import. An allow-list, not a ban-list: anything absent —
   * npm or `node:` builtin alike — is a leak. `core` reads «zero dependencies»
   * literally, which is the only way that claim survives contact with a hurry.
   */
  readonly packages: readonly string[]
}

/**
 * A layer absent from the table — `ui`, and the entry points at the root of
 * `src` — is deliberately unconstrained: it sits on top and is allowed to know
 * about everything underneath.
 */
const BOUNDARIES: Record<string, Boundary> = {
  // The point of the whole arrangement: arithmetic, sessions and progression
  // that run in node with no browser and no framework in sight.
  //
  // `locale` is the single deliberate exception, and a narrow one: number words
  // come from the text pack, which is pure data. DECISIONS.md spells this out.
  core: { layers: ['core', 'locale'], packages: [] },
  locale: { layers: ['locale'], packages: [] },
  // The battle is a SessionObserver and nothing else. Let React in here and G1
  // stops being a seam and becomes a screen.
  game: { layers: ['core', 'game', 'locale', 'assets'], packages: [] },
  // Adapters are exactly where the browser is allowed to live — that is their
  // job — but they talk down to the core, never up to the UI.
  adapters: { layers: ['core', 'adapters', 'locale', 'assets'], packages: ['vosk-browser'] },
  // Vite rewrites `import.meta.env` at build time, so this one is bundler-bound
  // rather than browser-bound — which is why it stays out of the DOM-free
  // project, and why `game` cannot join it either.
  assets: { layers: ['assets'], packages: [] },
}

/**
 * The runner is allowed everywhere, and only the runner.
 *
 * Tests are held to the same boundary as the code they cover on purpose: a core
 * test that reaches for a DOM testing library has broken A1 just as thoroughly
 * as the core would have, and is far easier to miss in review.
 */
const ALWAYS_ALLOWED = ['vitest']

interface Reference {
  readonly specifier: string
  /** The layer it lands in, or null when it points at a package. */
  readonly layer: string | null
  /** The file it resolves to, for the cycle check. */
  readonly file: string | null
}

interface Module {
  readonly file: string
  readonly layer: string
  readonly references: readonly Reference[]
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path)
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : []
  })
}

/** The layer a file belongs to: its first segment under `src`. */
function layerOf(file: string): string {
  const [head = ''] = relative(SRC, file).split(sep)
  return head.replace(/\.tsx?$/, '')
}

/** Resolve the way the bundler does — a file, or the folder's barrel. */
function resolveModule(path: string): string | null {
  const candidates = [path, `${path}.ts`, `${path}.tsx`, join(path, 'index.ts'), join(path, 'index.tsx')]
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null
}

/** Every module a file pulls in — static, `import type` and dynamic alike. */
function referencesOf(file: string, source: string): Reference[] {
  return [...source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(([, raw]) => {
    const specifier = raw ?? ''
    const path = specifier.startsWith('@/')
      ? join(SRC, specifier.slice(2))
      : specifier.startsWith('.')
        ? join(dirname(file), specifier)
        : null

    return path === null
      ? { specifier, layer: null, file: null }
      : { specifier, layer: layerOf(path), file: resolveModule(path) }
  })
}

const MODULES: readonly Module[] = walk(SRC).map((file) => ({
  file,
  layer: layerOf(file),
  references: referencesOf(file, readFileSync(file, 'utf8')),
}))

const show = (file: string) => relative(SRC, file).replaceAll(sep, '/')

describe('the architecture holds', () => {
  // A scan that walks nothing passes every assertion below. Pin the tree down
  // first, so a broken path fails loudly instead of going quiet.
  it('the scan sees the tree at all', () => {
    expect(MODULES.length).toBeGreaterThan(30)
    expect(MODULES.map((module) => module.layer)).toContain('core')
    expect(MODULES.flatMap((module) => module.references).length).toBeGreaterThan(50)
  })

  it('no layer reaches past what it is allowed to know about', () => {
    const leaks = MODULES.flatMap(({ file, layer, references }) => {
      const boundary = BOUNDARIES[layer]
      if (!boundary) return []

      return references
        .filter((ref) => ref.layer !== null && !boundary.layers.includes(ref.layer))
        .map((ref) => `${show(file)} → '${ref.specifier}' reaches into ${ref.layer}`)
    })

    expect(leaks).toEqual([])
  })

  it('nothing below the UI imports a package it was not given', () => {
    const leaks = MODULES.flatMap(({ file, layer, references }) => {
      const boundary = BOUNDARIES[layer]
      if (!boundary) return []

      const allowed = [...ALWAYS_ALLOWED, ...boundary.packages]
      return references
        .filter((ref) => ref.layer === null)
        .filter((ref) => !allowed.some((n) => ref.specifier === n || ref.specifier.startsWith(`${n}/`)))
        .map((ref) => `${show(file)} → '${ref.specifier}' is not on ${layer}'s list`)
    })

    expect(leaks).toEqual([])
  })

  // Not a layering rule, but the same graph answers it, and a cycle is how a
  // clean boundary rots quietly: two modules that need each other are one
  // module wearing two names. Barrels are how they arrive, and there are many.
  it('no module depends on itself, however long the way round', () => {
    const edges = new Map(
      MODULES.map(({ file, references }) => [
        file,
        references.flatMap((ref) => (ref.file === null ? [] : [ref.file])),
      ]),
    )

    const cycles: string[] = []
    const state = new Map<string, 'open' | 'done'>()

    const visit = (file: string, stack: string[]): void => {
      state.set(file, 'open')
      stack.push(file)

      for (const next of edges.get(file) ?? []) {
        if (state.get(next) === 'open') {
          cycles.push([...stack.slice(stack.indexOf(next)), next].map(show).join(' → '))
        } else if (!state.has(next)) {
          visit(next, stack)
        }
      }

      stack.pop()
      state.set(file, 'done')
    }

    for (const { file } of MODULES) if (!state.has(file)) visit(file, [])

    expect(cycles).toEqual([])
  })
})
