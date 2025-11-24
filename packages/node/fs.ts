import fs from 'node:fs/promises'

export async function ensureDir (dir: string) {
  try {
    await fs.mkdir(dir)
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err
  }
}

export async function emptyDir (dir: string) {
  await ensureDir(dir)
  const files = await fs.readdir(dir)
  for (const file of files) {
    await fs.unlink(`${dir}/${file}`)
  }
}

export async function fileExists (file: string) {
  try {
    await fs.access(file)
  } catch (err: any) {
    if (err.code === 'ENOENT') return false
    throw err
  }
  return true
}
