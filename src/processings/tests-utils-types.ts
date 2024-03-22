import type { Account } from '../shared/session/index.js'
import type { ProcessingContext } from './types.ts'

export interface ProcessingTestConfig {
  dataFairAPIKey: string
  dataFairUrl: string
  adminMode: boolean
  account: Account
};

export interface ProcessingTestContext extends Omit<ProcessingContext, 'log'> {
  cleanup: () => Promise<void>
  log: LogTestFunctions
}

/**
 * Log functions of tests
 */
export interface LogTestFunctions {
  step: (msg: string) => void
  error: (msg: string, extra: any) => void
  warning: (msg: string, extra: any) => void
  info: (msg: string, extra: any) => void
  debug: (msg: string, extra: any) => void
  task: (name: string) => void
  progress: (taskName: string, progress: number, total: number) => void
  testInfo: (msg: any, extra: any) => void
  testDebug: (msg: any, extra: any) => void
}
