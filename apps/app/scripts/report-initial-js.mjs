import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(appRoot, 'dist')
const indexPath = join(distDir, 'index.html')

let html
try {
  html = readFileSync(indexPath, 'utf8')
} catch {
  console.error(`Could not read ${indexPath}. Run "npm run build" first.`)
  process.exit(1)
}

const assets = new Set()
const tagPattern = /<(script|link)\b[^>]*>/gi

for (const match of html.matchAll(tagPattern)) {
  const tag = match[0]
  const tagName = match[1].toLowerCase()

  if (tagName === 'script') {
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]
    if (src?.startsWith('/assets/') && src.endsWith('.js')) {
      assets.add(src)
    }
    continue
  }

  const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]
  if (!rel?.split(/\s+/).includes('modulepreload')) {
    continue
  }

  const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1]
  if (href?.startsWith('/assets/') && href.endsWith('.js')) {
    assets.add(href)
  }
}

if (assets.size === 0) {
  console.error('No initial JS assets found in dist/index.html.')
  process.exit(1)
}

const rows = [...assets]
  .map((assetPath) => {
    const filePath = join(distDir, assetPath.replace(/^\//, ''))
    const buffer = readFileSync(filePath)
    return {
      assetPath,
      raw: buffer.length,
      gzip: gzipSync(buffer).length,
    }
  })
  .sort((a, b) => b.gzip - a.gzip)

const toKb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`
const pad = (value, width) => value.padStart(width)

const rawWidth = Math.max(...rows.map((row) => toKb(row.raw).length))
const gzipWidth = Math.max(...rows.map((row) => toKb(row.gzip).length))

console.log('Initial JS (from dist/index.html):')
for (const row of rows) {
  console.log(`  ${pad(toKb(row.raw), rawWidth)} raw  ${pad(toKb(row.gzip), gzipWidth)} gz  ${row.assetPath}`)
}

const totalRaw = rows.reduce((sum, row) => sum + row.raw, 0)
const totalGzip = rows.reduce((sum, row) => sum + row.gzip, 0)
console.log(`Total: ${toKb(totalRaw)} raw, ${toKb(totalGzip)} gzip (${rows.length} files)`)
