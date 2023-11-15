/**
 * A simple wrapper around node:test to run tests in a directory
 * prevent stalling errors, allow the user to execute global before and after hooks, etc
 */
import { run as nodeRunTests } from 'node:test'
import process from 'node:process'
import { Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { readdir } from 'node:fs/promises'
import chalk from 'chalk'

/**
 * @returns {Writable}
 */
export const reporter = () => {
  return new Writable({
    objectMode: true,
    write (event, encoding, callback) {
      // console.log(event)
      switch (event.type) {
        case 'test:dequeue':
          if (!event.data.file) console.log(chalk.bold.underline(`${event.data.name}\n`)) // entering a file
          else console.log(chalk.bold(`\n${new Array(event.data.nesting + 1).join('  ')}> ${event.data.name}`)) // entering a test
          break
        case 'test:enqueue':
          break
        case 'test:watch:drained':
          break
        case 'test:start':
          break
        case 'test:pass':
          console.log(chalk.greenBright.bold(`${new Array(event.data.nesting + 1).join('  ')}V ${event.data.name}\n`))
          break
        case 'test:fail':
          if (event.data.details?.error) console.error(event.data.details.error.stack)
          console.log(chalk.red.bold(`${new Array(event.data.nesting + 1).join('  ')}X ${event.data.name}`))
          return callback(new Error('test failure'))
        case 'test:plan':
          break
        case 'test:diagnostic':
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
 */
export const run = async (dir) => {
  process.env.NODE_ENV = 'test'
  const files = (await readdir(dir))
    .filter(f => f.endsWith('.js') && f !== 'index.js')
    .map(f => `test-it/${f}`)
  await pipeline([nodeRunTests({ files }), reporter()])
}
