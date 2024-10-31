// check if we are in an iframe either cross or same domain
export const inIframe = (() => {
  try {
    return window.top !== window.self
  } catch (e) {
    return true
  }
})()

export default inIframe
