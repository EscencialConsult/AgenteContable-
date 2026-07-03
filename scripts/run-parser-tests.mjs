import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildSync } from 'esbuild'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const tmpDir = join(root, 'node_modules', '.tmp')
const outfile = join(root, 'node_modules', '.tmp', 'parser-tests.mjs')

mkdirSync(tmpDir, { recursive: true })

buildSync({
  entryPoints: [join(root, 'tests', 'parserTests.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'info',
})

await import(pathToFileURL(outfile).href)
