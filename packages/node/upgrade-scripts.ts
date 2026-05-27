import type { Db } from 'mongodb'
import type { Debugger } from 'debug'
import semver from 'semver'
import path from 'path'
import { readdirSync, readFileSync, statSync } from 'fs'
import Debug from 'debug'
import type { Locks } from './locks.js'

const debug = Debug('upgrade')

/**
 * A migration to be applied to the service's database.
 *
 * Scripts live in `upgrade/<last-released-version>/<filename>.ts` under the
 * service. The folder name MUST be the version of the last release at the
 * time the script is authored — never an anticipated future version. On a
 * working branch the eventual release number is unknown (the same change may
 * ship as a minor, a major, or be backported), so the last known release is
 * the only stable reference.
 *
 * The runner executes every script whose folder version satisfies
 * `semver.gte(folder, dbVersion)`, where `dbVersion` is what was stored at
 * the previous startup, then records the current `package.json` version.
 * With folder = last-released, the script runs once on production upgrade
 * (after the release bumps `package.json`), and re-runs on every staging
 * deploy until the next release ships — this is expected.
 *
 * `exec` MUST be idempotent: re-running it must be a safe no-op.
 */
export interface UpgradeScript {
  /** One short sentence; logged at run time. */
  description: string
  /** Idempotent migration body. */
  exec: (db: Db, debug: Debugger) => Promise<void>
}

/**
 * Run pending upgrade scripts for the current service, then record the
 * current `package.json` version in the `services` Mongo collection.
 *
 * Acquires the `upgrade` lock so only one process runs migrations at a time;
 * other processes log a warning and continue without waiting.
 *
 * See the `UpgradeScript` interface for the folder-naming rule.
 *
 * @param db - Active Mongo connection (reused by the scripts).
 * @param locks - Lock manager from `@data-fair/lib-node/locks`.
 * @param basePath - Path to the service directory containing `upgrade/` and `package.json`. Defaults to `./`.
 * @param isFresh - Optional callback returning true if the database is a brand-new install with no legacy data. When true, all historical scripts are skipped and only the current version is recorded.
 */
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
  // in the case of workspaces the parent package.json is the right place to look for name and versions
  const parentPjsonPath = path.join(dir, '../package.json')
  const pjsonPath = path.join(dir, 'package.json')
  let pjson
  try {
    pjson = JSON.parse(readFileSync(parentPjsonPath, 'utf8'))
    debug('read service info from ' + parentPjsonPath)
  } catch (err) {
    pjson = JSON.parse(readFileSync(pjsonPath, 'utf8'))
    debug('read service info from ' + pjsonPath)
  }

  const scriptsRoot = path.join(dir, 'upgrade')
  debug(`service=${pjson.name} version=${pjson.version}`)

  const services = db.collection<{ id: string, version: string }>('services')
  const service = await services.findOne({ id: pjson.name })
  let previousPersion = service?.version
  debug('list scripts from ' + scriptsRoot)
  let scripts = await listScripts(scriptsRoot)
  if (previousPersion) {
    debug(`current service version from database : ${previousPersion}`)
  } else {
    debug('no service version found in database, this is the first time the upgrade system is run')
    scripts = scripts.filter(scriptDef => scriptDef.version === 'init')
    if (isFresh) {
      if (await isFresh()) {
        debug('isFresh function returned true, this is a fresh install, do not run any script')
      } else {
        debug('isFresh function returned false, this is not a fresh install, run all init scripts')
        previousPersion = '0.0.0'
      }
    } else {
      debug('no isFresh function, it could be a fresh install, do not run any script')
    }
  }

  if (previousPersion) {
    for (const scriptDef of scripts) {
      if (semver.gte(scriptDef.version, previousPersion)) {
        for (const scriptName of scriptDef.names) {
          const script: UpgradeScript = (await import(path.join(scriptsRoot, scriptDef.version, scriptName))).default
          debug('apply script %s/%s : %s', scriptDef.version, scriptName, script.description)
          await script.exec(db, Debug(`upgrade:${scriptDef.version}:${scriptName}`))
        }
      }
    }
  }

  const coercedVersion = semver.coerce(pjson.version)
  if (!coercedVersion) throw new Error(`Invalid version number in package.json ${pjson.version}`)
  const newService = { id: pjson.name, version: coercedVersion.version }
  debug(`upgrade scripts are over, save current version number ${newService.version}`)
  await services.updateOne({ id: pjson.name }, { $set: newService }, { upsert: true })
}

// Walk the scripts directories
async function listScripts (scriptsRoot: string) {
  const dirs = readdirSync(scriptsRoot)
    .filter(dir => statSync(path.join(scriptsRoot, dir)).isDirectory())
    .sort()
  return dirs.map(dir => {
    return {
      version: dir,
      names: readdirSync(path.join(scriptsRoot, dir)).sort()
    }
  })
}
