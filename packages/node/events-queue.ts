import { type Event } from '@data-fair/lib-common-types/event/index.js'
import { type Notification } from '@data-fair/lib-common-types/notification/index.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import axios from './axios.js'
import Debug from 'debug'

const debug = Debug('events-queue')

type EventsQueueOptions = {
  eventsUrl: string,
  eventsSecret: string
}

export class EventsQueue {
  _options: EventsQueueOptions | undefined
  eventsQueue: Event[] = []
  notificationsQueue: Notification[] = []
  stopped = false
  currentDrainPromise: Promise<void> | undefined

  options () {
    if (!this._options) throw new Error('events queue was not initialized')
    return this._options
  }

  start = async (options: EventsQueueOptions) => {
    if (this._options) throw new Error('events queue was already initialized')
    this._options = options
    this.loop()
  }

  stop = async () => {
    this.stopped = true
    if (this.currentDrainPromise) await this.currentDrainPromise
    await this.drain()
  }

  async loop () {
    while (!this.stopped) {
      await new Promise(resolve => setTimeout(resolve, 3000))
      this.currentDrainPromise = this.drain()
      await this.currentDrainPromise
      this.currentDrainPromise = undefined
    }
  }

  async drain () {
    if (this.eventsQueue.length) {
      const events = this.eventsQueue
      this.eventsQueue = []
      debug('drain events', events.length)
      try {
        await axios.post(this.options().eventsUrl + '/api/events', events, { headers: { 'x-secret-key': this.options().eventsSecret } })
      } catch (err: any) {
        internalError('events-queue-push-event', err)
        // retry later
        if (err.status >= 500 && events.length < 1000) this.eventsQueue = events.concat(this.eventsQueue)
      }
    }
    if (this.notificationsQueue.length) {
      const notifications = this.notificationsQueue
      this.notificationsQueue = []
      debug('drain notifications', notifications.length)
      for (const notification of notifications) {
        try {
          await axios.post(this.options().eventsUrl + '/api/notifications', notification, { headers: { 'x-secret-key': this.options().eventsSecret } })
        } catch (err: any) {
          internalError('events-queue-push-notif', err)
          // retry later
          if (err.status >= 500 && (notifications.length + this.notificationsQueue.length) < 1000) {
            this.notificationsQueue.unshift()
          }
        }
      }
    }
  }

  pushEvent (event: Omit<Event, 'date'>) {
    this.options()
    if (this.stopped) throw new Error('events queue has been stopped');
    (event as Event).date = new Date().toISOString()
    debug('pushEvent', event)
    this.eventsQueue.push(event as Event)
  }

  pushNotification (notification: Omit<Notification, 'date'>) {
    this.options()
    if (this.stopped) throw new Error('notifications queue has been stopped');
    (notification as Notification).date = new Date().toISOString()
    debug('pushNotification', notification)
    this.notificationsQueue.push(notification as Notification)
  }
}

const eventsQueue = new EventsQueue()

export default eventsQueue
