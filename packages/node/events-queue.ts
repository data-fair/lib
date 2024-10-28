import { type Event } from '@data-fair/lib-common-types/event/index.js'
import { type Notification } from '@data-fair/lib-common-types/notification/index.js'
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

let eventsQueue: Event[] = []
let notificationsQueue: Notification[] = []
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
  if (eventsQueue.length) {
    const events = eventsQueue
    eventsQueue = []
    await axios.post(options().eventsUrl + '/api/events', events, { headers: { 'x-secret-key': options().eventsSecret } })
  }
  if (notificationsQueue.length) {
    const notifications = notificationsQueue
    notificationsQueue = []
    for (const notification of notifications) {
      await axios.post(options().eventsUrl + '/api/notifications', notification, { headers: { 'x-secret-key': options().eventsSecret } })
    }
  }
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
  if (stopped) throw new Error('events queue has been stopped');
  (event as Event).date = new Date().toISOString()
  eventsQueue.push(event as Event)
}

export const pushNotification = (notification: Omit<Notification, 'date'>) => {
  if (stopped) throw new Error('notifications queue has been stopped');
  (notification as Notification).date = new Date().toISOString()
  notificationsQueue.push(notification as Notification)
}
