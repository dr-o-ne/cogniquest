/**
 * Resolves a file from `public/` against the address the app is served from.
 *
 * Locally and in the packaged `.exe` that address is the root, so `/x.webp`
 * would work as written. On GitHub Pages the site lives under `/<repo>/`, and
 * an absolute path would escape to the domain root — that is, to nothing. Vite
 * puts the prefix into `BASE_URL`, and everything loaded at runtime has to go
 * through here.
 *
 * Assets imported by the bundler need none of this; Vite rewrites those itself.
 * This is only for paths we build as strings.
 */
export function publicUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
