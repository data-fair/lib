import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

const offsetRegExp = /([+-])(\d{2}):?(\d{2})$/

/** Offset in minutes carried by a date-time string, null when it carries none. */
export const explicitOffsetMinutes = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.endsWith('Z')) return null
  const match = value.match(offsetRegExp)
  if (!match) return null
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
}

/** A date-time pinned to its own source timezone; UTC-stored values stay local, like data-fair. */
export const dateTimeInOwnTimeZone = (value: unknown): Dayjs => {
  const offsetMinutes = explicitOffsetMinutes(value)
  const d = dayjs(value as string)
  // re-apply the source offset so the rendering does not drift to the runtime timezone
  return offsetMinutes === null ? d : d.utcOffset(offsetMinutes)
}
