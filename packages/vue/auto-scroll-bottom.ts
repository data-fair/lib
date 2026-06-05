import { ref, watch, toValue, type MaybeRefOrGetter } from 'vue'
import { useScroll, useEventListener } from '@vueuse/core'

/**
 * Stick-to-bottom autoscroll for a growing, live region (a run log, a chat
 * transcript, ...): follows new content while the user is at the bottom, any
 * upward scroll or wheel-up stops it, scrolling back to the bottom resumes.
 *
 * `target` is what actually scrolls — pass `window` (or the current document's
 * scroller) for a page that scrolls as a whole, or a getter returning the inner
 * scrollable element when the growing region lives inside an `overflow: auto`
 * container.
 *
 * Following is driven by the bottom being in view (`arrivedState.bottom`), not
 * by scroll direction: when the content shrinks (a loader removed, a panel
 * collapsed) the browser clamps scrollTop upward, and a direction-based check
 * would mistake that for the user scrolling away and stop following for good.
 *
 * "In view" allows a small margin (`bottomThreshold`): exact scrollTop rarely
 * reaches the very bottom (sub-pixel rounding) and live content keeps appending,
 * so a 0px check could never re-arm following once the user had scrolled away.
 *
 * @param target the scroll container: `window`, an element, or a ref/getter to
 *   one (tolerates `null`/`undefined` while the element is not yet mounted)
 * @param growthSignal reactive getter for the content length (the growth signal)
 * @param isActive getter telling whether the source is still streaming/growing
 * @param bottomThreshold px from the bottom still counted as "at the bottom"
 */
export const useAutoScrollBottom = (
  target: MaybeRefOrGetter<HTMLElement | Window | null | undefined>,
  growthSignal: () => number,
  isActive: () => boolean,
  bottomThreshold = 48
) => {
  // Start following so a freshly opened, still-growing source pins to its tail
  // even though it usually mounts scrolled to the top.
  const following = ref(true)

  const { arrivedState, y } = useScroll(target, {
    offset: { bottom: bottomThreshold },
    onScroll: () => { following.value = arrivedState.bottom } // near bottom → follow, else stop
  })

  // A wheel-up reaches us even when the target can't scroll (short content, or
  // an auto-height embed where a parent scrolls) — the only "stop following"
  // signal available there.
  useEventListener(target, 'wheel', (e: WheelEvent) => { if (e.deltaY < 0) following.value = false }, { passive: true })

  const pinToBottom = () => {
    const el = toValue(target)
    if (!el) return
    // For an element, `y` sets its scrollTop; for the window we scroll to the
    // document's full height (window has no scrollHeight of its own).
    y.value = el instanceof Window
      ? (document.scrollingElement ?? document.documentElement).scrollHeight
      : el.scrollHeight
  }

  watch(growthSignal, () => { if (isActive() && following.value) pinToBottom() }, { flush: 'post' })

  return { following }
}
