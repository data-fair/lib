import type { Db } from 'mongodb'
import type { Debugger } from 'debug'
import semver from 'semver'
import path from 'path'
import { readdirSync, readFileSync } from 'fs'
import Debug from 'debug'
import type { Locks } from './locks.js'

const debug = Debug('upgrade')

export interface UpgradeScript {
  description: string
  exec: (db: Db, debug: Debugger) => Promise<void>
}

// chose the proper scripts to execute, then run them
export default async function (db: Db, locks: Locks, basePath = './', isFresh?: () => Promise<boolean>) {
  const ack = await locks.acquire('upgrade')
  if (!ack) {
    console.warn('upgrade scripts lock is already acquired, skip them')
    // IMPORTANT: this behaviour of running the process when the upgrade scripts are still running on another one
    // implies that they cannot be considered a pre-requisite..
    // if we want to consider the upgrade scripts as a pre-requisite we should implement a wait on all
    // containers for the scripts that are running in only 1 (while loop on "acquire" ?) and a healthcheck
    // are not considered "up" and the previous versions keep running in the mean time
  } else {
    try {
      await runScripts(db, basePath, isFresh)
    } finally {
      await locks.release('upgrade')
    }
  }
}

async function runScripts (db: Db, basePath: string, isFresh?: () => Promise<boolean>) {
  const dir = path.resolve(basePath)
  const pjsonPath = path.join(dir, 'package.json')
  debug('read service info from ' + pjsonPath)
  const pjson = JSON.parse(readFileSync(pjsonPath, 'utf8'))
  const scriptsRoot = path.join(dir, 'upgrade')
  debug(`service=${pjson.name} version=${pjson.version}`)

  const services = db.collection<{ id: string, version: string }>('services')
  const service = await services.findOne({ id: pjson.name })
  let previousPersion = service?.version
  debug('list scripts from ' + scriptsRoot)
  let scripts = await listScripts(scriptsRoot)
  if (previousPersion) {
    debug(`Current service version from database : ${previousPersion}`)
  } else {
    debug('No service version found in database, this is the first time the upgrade system is run')
    scripts = scripts.filter(scriptDef => scriptDef.version === 'init')
    if (isFresh) {
      if (await isFresh()) {
        debug('isFresh function returned true, this is fresh install, do not run any script')
      } else {
        debug('isFresh function returned false, this is not fresh install, run all init scripts')
        previousPersion = '0.0.0'
      }
    } else {
      debug('No isFresh function, it could be a fresh install, do not run any script')
    }
  }

  if (previousPersion) {
    for (const scriptDef of scripts) {
      if (semver.gte(scriptDef.version, previousPersion)) {
        for (const scriptName of scriptDef.names) {
          const script: UpgradeScript = (await import(path.join(scriptsRoot, scriptDef.version, scriptName))).default
          debug('Apply script %s/%s : %s', scriptDef.version, scriptName, script.description)
          await script.exec(db, Debug(`upgrade:${scriptDef.version}:${scriptName}`))
        }
      }
    }
  }

  const coercedVersion = semver.coerce(pjson.version)
  if (!coercedVersion) throw new Error(`Invalid version number in package.json ${pjson.version}`)
  const newService = { id: pjson.name, version: coercedVersion.version }
  debug(`Upgrade scripts are over, save current version number ${newService.version}`)
  await services.updateOne({ id: pjson.name }, { $set: newService }, { upsert: true })
}

// Walk the scripts directories
async function listScripts (scriptsRoot: string) {
  const dirs = readdirSync(scriptsRoot).sort()
  return dirs.map(dir => {
    return {
      version: dir,
      names: readdirSync(path.join(scriptsRoot, dir)).sort()
    }
  })
}
