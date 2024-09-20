import type { Dayjs, ConfigType } from 'dayjs'

// copied from relativeTime.d.ts because for some reason our exported type did not inherit this properly
export type RelativeDayjs = Dayjs & {
  fromNow(withoutSuffix?: boolean): string
  from(compared: ConfigType, withoutSuffix?: boolean): string
  toNow(withoutSuffix?: boolean): string
  to(compared: ConfigType, withoutSuffix?: boolean): string
}
