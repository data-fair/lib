import type { Account } from '../shared/session/index.js'
import type { ProcessingContext } from './types.ts'

export interface ProcessingTestConfig {
  dataFairAPIKey: string
  dataFairUrl: string
  adminMode: boolean
  account: Account
};

export interface ProcessingTestContext extends ProcessingContext {
  cleanup: () => Promise<void>
}
