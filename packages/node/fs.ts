import { mkdir, readdir, unlink, access } from 'node:fs/promises'
import { sep, join } from 'node:path'

export async function ensureDir (dir: string) {
  const parts = dir.split(sep)
  for (let i = 0; i < parts.length; i++) {
    const partialDir = join(...parts.slice(0, i + 1))
    try {
      await mkdir(partialDir)
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err
    }
  }
}

export async function emptyDir (dir: string) {
  await ensureDir(dir)
  const files = await readdir(dir)
  for (const file of files) {
    await unlink(`${dir}/${file}`)
  }
}

export async function exists (file: string) {
  try {
    await access(file)
  } catch (err: any) {
    if (err.code === 'ENOENT') return false
    throw err
  }
  return true
}
