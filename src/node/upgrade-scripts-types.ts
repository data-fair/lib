import type { Db } from 'mongodb'
import type { Debugger } from 'debug'

export interface UpgradeScript {
  description: string
  exec: (db: Db, debug: Debugger) => Promise<void>
}
