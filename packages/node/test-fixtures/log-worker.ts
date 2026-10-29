// worker thread that restores the log context received from its parent and logs inside it
import { parentPort, workerData } from 'node:worker_threads'
import log, { _resetLogger, withLogContext } from '../log.js'

_resetLogger({ format: 'json', destination: { write: (s: string) => { parentPort?.postMessage(s) } } })
withLogContext(workerData.logContext, () => log.info('in worker'))
