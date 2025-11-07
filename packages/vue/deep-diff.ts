import { computed, watch, type ComputedGetter, type ComputedOptions, type WatchSource, type WatchCallback, type WatchOptions } from 'vue'
import equal from 'fast-deep-equal'

export const computedDeepDiff = <Type>(getter: ComputedGetter<Type>, options?: ComputedOptions) => {
  return computed<Type>((oldValue) => {
    const newValue = getter()
    return (oldValue !== undefined && equal(newValue, oldValue)) ? oldValue : newValue
  }, options)
}

export const watchDeepDiff = (source: WatchSource, callback: WatchCallback, options?: WatchOptions) => {
  return watch(source, (newValue, oldValue, onCleanup) => {
    if (!equal(newValue, oldValue)) callback(newValue, oldValue, onCleanup)
  }, options)
}
