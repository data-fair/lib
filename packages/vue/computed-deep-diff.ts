import { computed, type ComputedGetter, type ComputedOptions } from 'vue'
import equal from 'fast-deep-equal'

export const computedDeepDiff = <Type>(getter: ComputedGetter<Type>, options: ComputedOptions) => {
  return computed<Type>((oldValue) => {
    const newValue = getter()
    return (oldValue !== undefined && equal(newValue, oldValue)) ? oldValue : newValue
  }, options)
}

export default computedDeepDiff
