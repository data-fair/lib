import { computed, watch, type ComputedGetter, type ComputedOptions, type WatchSource, type WatchCallback, type WatchOptions } from 'vue'
import equal from 'fast-deep-equal'

/**
 * a computed replacement that returns the old value if the new value only has a superficial "reference" change but is actually identitical
 * prevents unnecessary triggers or reactivity
 */
export const computedDeepDiff = <Type>(getter: ComputedGetter<Type>, options?: ComputedOptions) => {
  return computed<Type>((oldValue) => {
    const newValue = getter()
    return (oldValue !== undefined && equal(newValue, oldValue)) ? oldValue : newValue
  }, options)
}

/**
 * a watch replacement the triggers the callback only if the new value is actually different from the old value
 * not just for superficial "reference" changes
 */
export const watchDeepDiff = (source: WatchSource, callback: WatchCallback, options?: WatchOptions) => {
  return watch(source, (newValue, oldValue, onCleanup) => {
    if (!equal(newValue, oldValue)) callback(newValue, oldValue, onCleanup)
  }, options)
}
