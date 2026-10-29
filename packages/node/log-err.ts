// whitelist serializer for errors in logs
// pino's standard serializer copies all enumerable properties, which leaks secrets for us
// (axios config headers, request and response bodies, mongo document content, etc.)

export interface SerializedErr {
  type?: string
  message: string
  stack?: string
  code?: string | number
  status?: number
  method?: string
  url?: string
  cause?: SerializedErr
}

const maxDepth = 5
// messages can embed response bodies (AxiosRequestError) and the stack repeats the message
const maxMessageLength = 1000

const truncate = (text: string) => text.length > maxMessageLength ? text.slice(0, maxMessageLength) + '…' : text

const truncateStackHeader = (stack: string) => {
  const framesIndex = stack.indexOf('\n    at ')
  if (framesIndex === -1) return truncate(stack)
  return truncate(stack.slice(0, framesIndex)) + stack.slice(framesIndex)
}

const isPrimitiveCode = (value: unknown): value is string | number => typeof value === 'string' || typeof value === 'number'

export function serializeErr (value: unknown, depth = 0): SerializedErr {
  if (value === null || typeof value !== 'object') return { message: truncate(String(value)) }
  const err = value as Record<string, any>
  const s: SerializedErr = { message: truncate(typeof err.message === 'string' ? err.message : String(value)) }
  if (value instanceof Error) s.type = err.name && err.name !== 'Error' ? err.name : err.constructor?.name ?? 'Error'
  if (typeof err.stack === 'string') s.stack = truncateStackHeader(err.stack)
  if (isPrimitiveCode(err.code)) s.code = err.code
  const status = err.status ?? err.statusCode
  if (typeof status === 'number') s.status = status
  if (err.isAxiosError === true || err.name === 'AxiosRequestError') {
    if (typeof err.config?.method === 'string') s.method = err.config.method
    if (typeof err.config?.url === 'string') s.url = err.config.url.split('?')[0]
  }
  // the depth limit also stops circular causes
  if (err.cause !== undefined && depth < maxDepth) {
    s.cause = serializeErr(err.cause, depth + 1)
  }
  return s
}
