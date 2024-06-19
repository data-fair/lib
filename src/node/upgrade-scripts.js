import semver from 'semver'
import path from 'path'
import { readdirSync, readFileSync } from 'fs'
import Debug from 'debug'
import { acquire, release } from './locks.js'

const debug = Debug('upgrade')

/**
 * @typedef {import('./upgrade-scripts-types.js').UpgradeScript} UpgradeScript
 */

/**
 * chose the proper scripts to execute, then run them
 * @param {import('mongodb').Db} db
 * @param {string} basePath
 */
export default async function (db, basePath = './') {
  const ack = await acquire('upgrade')
  if (!ack) {
    console.warn('upgrade scripts lock is already acquired, skip them')
    // IMPORTANT: this behaviour of running the process when the upgrade scripts are still running on another one
    // implies that they cannot be considered a pre-requisite..
    // if we want to consider the upgrade scripts as a pre-requisite we should implement a wait on all
    // containers for the scripts that are running in only 1 (while loop on "acquire" ?) and a healthcheck
    // are not considered "up" and the previous versions keep running in the mean time
  } else {
    await runScripts(db, basePath)
    await release('upgrade')
  }
}

/**
 * chose the proper scripts to execute, then run them
 * @param {import('mongodb').Db} db
 * @param {string} basePath
 */
async function runScripts (db, basePath) {
  const dir = path.resolve(basePath)
  const pjsonPath = path.join(dir, 'package.json')
  debug('read service info from ' + pjsonPath)
  const pjson = JSON.parse(readFileSync(pjsonPath, 'utf8'))
  const scriptsRoot = path.join(dir, 'upgrade')
  debug(`service=${pjson.name} version=${pjson.version}`)

  const services = db.collection('services')
  const service = await services.findOne({ id: pjson.name })
  const version = service?.version
  debug('list scripts from ' + scriptsRoot)
  let scripts = await listScripts(scriptsRoot)
  if (!version) {
    debug('No service version found in database, this is probably a fresh install')
    scripts = scripts.filter(scriptDef => scriptDef.version === 'init')
  } else {
    debug(`Current service version from database : ${version}`)
    scripts = scripts.filter(scriptDef => scriptDef.version !== 'init')
  }

  for (const scriptDef of scripts) {
    if (semver.gte(scriptDef.version, version)) {
      for (const scriptName of scriptDef.names) {
        /** @type {UpgradeScript} */
        const script = (await import(path.join(scriptsRoot, scriptDef.version, scriptName))).default
        debug('Apply script %s/%s : %s', scriptDef.version, scriptName, script.description)
        await script.exec(db, Debug(`upgrade:${scriptDef.version}:${scriptName}`))
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
/**
 * @param {string} scriptsRoot
 */
async function listScripts (scriptsRoot) {
  const dirs = readdirSync(scriptsRoot).sort()
  return dirs.map(dir => {
    return {
      version: dir,
      names: readdirSync(path.join(scriptsRoot, dir)).sort()
    }
  })
}
