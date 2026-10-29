// a debug instance created before the logger module is loaded
import createDebug from 'debug'

export const earlyDebug = createDebug('lt:early')
