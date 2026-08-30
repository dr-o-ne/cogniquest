/**
 * Downloads the Russian Vosk model and repacks it into the format
 * vosk-browser expects: a gzipped tar of the model folder.
 *
 * The model is not kept in git (~45 MB, see .gitignore) — this script restores
 * it. Run with: npm run fetch-model
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, existsSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The SMALL model is a deliberate choice: only small Vosk models support a
// dynamic grammar (T4/T16). A big one is more accurate on free speech but will
// not accept a grammar at all — and for us the grammar matters more than
// accuracy «in general».
const MODEL_NAME = 'vosk-model-small-ru-0.22'
const SOURCE_URL = `https://alphacephei.com/vosk/models/${MODEL_NAME}.zip`

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = join(root, 'public', 'models')
const outFile = join(outDir, `${MODEL_NAME}.tar.gz`)

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1)

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} exited with code ${result.status}`)
}

if (existsSync(outFile)) {
  console.log(`The model is already in place: public/models/${MODEL_NAME}.tar.gz (${mb(statSync(outFile).size)} MB)`)
  process.exit(0)
}

mkdirSync(outDir, { recursive: true })
const temp = mkdtempSync(join(tmpdir(), 'vosk-model-'))

try {
  console.log(`Downloading ${MODEL_NAME} (~45 MB)...`)
  const response = await fetch(SOURCE_URL)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${SOURCE_URL}`)

  const zipPath = join(temp, `${MODEL_NAME}.zip`)
  writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()))
  console.log(`Downloaded ${mb(statSync(zipPath).size)} MB`)

  // bsdtar on Windows 10+ reads zip, so unpacking and repacking take one tool.
  console.log('Unpacking...')
  run('tar', ['-xf', zipPath, '-C', temp])

  if (!existsSync(join(temp, MODEL_NAME, 'am', 'final.mdl'))) {
    throw new Error(`The archive does not have the expected model layout: ${MODEL_NAME}/am/final.mdl`)
  }

  console.log('Repacking as tar.gz...')
  run('tar', ['-czf', outFile, '-C', temp, MODEL_NAME])

  console.log(`Done: public/models/${MODEL_NAME}.tar.gz (${mb(statSync(outFile).size)} MB)`)
} finally {
  rmSync(temp, { recursive: true, force: true })
}
