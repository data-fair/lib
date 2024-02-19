/**
 * A simple wrapper around node:test to run tests in a directory
 * prevent stalling errors, allow the user to execute global before and after hooks, etc
 */
import { run as nodeRunTests } from 'node:test'
import process from 'node:process'
import { Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'

/**
 * @returns {Writable}
 */
export const reporter = () => {
  let nesting = 0
  const changeNesting = (/** @type {any} */event) => {
    if ('nesting' in event.data) {
      let newNesting = event.data.nesting
      if (event.data.file) newNesting += 1
      if (newNesting !== nesting) console.log('')
      nesting = newNesting
    }
  }
  return new Writable({
    objectMode: true,
    write (event, encoding, callback) {
      // console.log(event)

      switch (event.type) {
        case 'test:dequeue':
          changeNesting(event)
          // eslint-disable-next-line no-case-declarations
          if (!event.data.file) console.log(chalk.bold.underline(`${event.data.name}\n`)) // entering a file
          else console.log(chalk.bold(`${new Array(nesting + 1).join('  ')}${event.data.name}`)) // entering a test
          break
        case 'test:enqueue':
          break
        case 'test:watch:drained':
          break
        case 'test:start':
          break
        case 'test:pass':
          changeNesting(event)
          // console.log(chalk.greenBright.bold(`${new Array(event.data.nesting + 2).join('  ')}ok`))
          break
        case 'test:fail':
          if (event.data.details?.error?.cause) console.error(event.data.details.error.cause)
          else if (event.data.details?.error) console.error(event.data.details.error)
          console.log(chalk.red.bold(`X ${event.data.name}`))
          return callback(new Error('test failure'))
        case 'test:plan':
          break
        case 'test:diagnostic':
          changeNesting(event)
          console.log(chalk.blue.bold(`${event.data.message}`))
          break
        case 'test:stderr':
          process.stderr.write(event.data.message)
          break
        case 'test:stdout':
          process.stdout.write(chalk.dim(event.data.message))
          break
        case 'test:coverage': {
          break
        }
      }
      callback()
    }
  })
}

/**
 * @param {string} dir
 * @param {string} [ext]
 */
export const run = async (dir, ext = '.js') => {
  process.env.NODE_ENV = 'test'
  const files = (await readdir(dir, { recursive: true }))
    .filter(f => f.endsWith(ext) && f !== 'index.js')
    .map(f => path.join(dir, f))
  await pipeline([nodeRunTests({ files }), reporter()])
}
