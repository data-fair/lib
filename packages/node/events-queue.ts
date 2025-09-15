import { type Event } from '@data-fair/lib-common-types/event/index.js'
import { type Notification } from '@data-fair/lib-common-types/notification/index.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import axios from './axios.js'
import Debug from 'debug'
import { SessionState } from '@data-fair/lib-common-types/session/index.js'

const debug = Debug('events-queue')

export type EventsQueueOptions = {
  eventsUrl: string,
  eventsSecret: string,
  inactive?: boolean
}

export type PushEvent = Omit<Event, 'date'>
export type PushNotification = Omit<Notification, 'date'>

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
    if (this._options) return // already initialized
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

  pushEvent (event: PushEvent, sessionState?: SessionState) {
    const options = this.options()
    if (options.inactive) return
    if (this.stopped) throw new Error('events queue has been stopped');
    (event as Event).date = new Date().toISOString()
    debug('pushEvent', event)
    if (!event.originator && sessionState?.user && sessionState.account) {
      if (sessionState.user.asAdmin) {
        event.originator = {
          user: { ...sessionState.user.asAdmin, admin: true }
        }
      } else if (sessionState.user.adminMode && (sessionState.account.type !== event.sender?.type || sessionState.account.id !== event.sender?.id)) {
        event.originator = {
          user: { id: sessionState.user.id, name: sessionState.user.name, admin: true }
        }
      } else {
        event.originator = {
          user: { id: sessionState.user.id, name: sessionState.user.name }
        }
        if (sessionState.organization) {
          event.originator.organization = {
            id: sessionState.organization.id,
            name: sessionState.organization.name,
            department: sessionState.organization.department,
            departmentName: sessionState.organization.departmentName
          }
        }
      }
    }
    this.eventsQueue.push(event as Event)
  }

  pushNotification (notification: PushNotification) {
    const options = this.options()
    if (options.inactive) return
    if (this.stopped) throw new Error('notifications queue has been stopped');
    (notification as Notification).date = new Date().toISOString()
    debug('pushNotification', notification)
    this.notificationsQueue.push(notification as Notification)
  }
}

const eventsQueue = new EventsQueue()

export default eventsQueue
