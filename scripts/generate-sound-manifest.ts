import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const soundsDir = join(process.cwd(), 'public/sounds')

try {
  const files = readdirSync(soundsDir)
    .filter((f) => /\.(mp3|wav|ogg)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .map((f) => ({
      filename: f,
      name: f.replace(/\.(mp3|wav|ogg)$/i, ''),
    }))

  writeFileSync(join(soundsDir, 'manifest.json'), JSON.stringify(files, null, 2))

  console.log(`Generated manifest with ${files.length} sound files`)
} catch (error) {
  console.error('Failed to generate sound manifest:', error)
  process.exit(1)
}
