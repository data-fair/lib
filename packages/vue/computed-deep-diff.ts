import { watchEffect, ref, toRaw, type WatchEffectOptions, type ComputedGetter } from 'vue'
import equal from 'fast-deep-equal'

export const computedDeepDiff = <Type>(getter: ComputedGetter<Type>, options: WatchEffectOptions) => {
  const computedRef = ref<Type>()
  watchEffect(() => {
    const newValue = getter()
    if (!equal(toRaw(computedRef.value), toRaw(newValue))) computedRef.value = newValue
  }, options)
  return computedRef
}

export default computedDeepDiff
