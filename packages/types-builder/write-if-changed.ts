import { existsSync, readFileSync, writeFileSync, renameSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

/**
 * Replace a generated file in one rename, and skip it when unchanged: a watcher (node --watch,
 * nodemon) restarting the process mid-build then never sees a missing or half-written file.
 */
export const writeIfChanged = (file: string, content: string): boolean => {
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return false
  writeFileSync(file + '.tmp', content)
  renameSync(file + '.tmp', file)
  return true
}

/** Remove the files of a generated dir that the current run did not produce (obsolete exports, locales, temp leftovers). */
export const removeUnlisted = (dir: string, keep: Set<string>) => {
  for (const file of readdirSync(dir)) {
    if (!keep.has(file)) rmSync(path.join(dir, file), { recursive: true })
  }
}
