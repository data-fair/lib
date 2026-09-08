export const webPageLabel = (value: string): string => {
  if (!value) return ''
  const withProto = /^https?:\/\//i.test(value) ? value : `http://${value}`
  try {
    return new URL(withProto).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

export const attachmentFilename = (value: string): string => {
  if (!value) return ''
  const last = value.split('?')[0].split('#')[0].split('/').pop() ?? value
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}
