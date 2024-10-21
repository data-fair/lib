import { type Event } from '@data-fair/lib-common-types/event/index.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import axios from './axios.js'

type EventsQueueOptions = {
  eventsUrl: string,
  eventsSecret: string
}
let _options: EventsQueueOptions | undefined
const options = () => {
  if (!_options) throw new Error('events queue was not initialized')
  return _options
}

let queue: Event[] = []
let stopped = false
let currentDrainPromise: Promise<void> | undefined

const loop = async () => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (!stopped) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    try {
      currentDrainPromise = drain()
      await currentDrainPromise
      currentDrainPromise = undefined
    } catch (err) {
      internalError('events-queue-drain', err)
    }
  }
}

const drain = async () => {
  if (queue.length === 0) return
  const events = queue
  queue = []
  await axios.post(options().eventsUrl + '/api/events', events, { headers: { 'x-secret-key': options().eventsSecret } })
}

export const start = async (options: EventsQueueOptions) => {
  _options = options
  loop()
}

export const stop = async () => {
  stopped = true
  if (currentDrainPromise) await currentDrainPromise
  await drain()
}

export const pushEvent = (event: Omit<Event, 'date'>) => {
  if (stopped) throw new Error('events queue as been stopped')
  queue.push(event as Event);
  (event as Event).date = new Date().toISOString()
}
