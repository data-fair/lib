function inIframe () {
  try {
    return window.self !== window.top
  } catch (e) {
    return false
  }
}

export default inIframe()
