export function bbox2zoom (bbox: [number, number, number, number]): number {
  const latDiff = bbox[3] - bbox[1]
  const lngDiff = bbox[2] - bbox[0]
  const maxDiff = (lngDiff > latDiff) ? lngDiff : latDiff
  let zoomLevel
  if (maxDiff < 360 / Math.pow(2, 20)) {
    zoomLevel = 21
  } else {
    zoomLevel = -1 * ((Math.log(maxDiff) / Math.log(2)) - (Math.log(360) / Math.log(2)))
    if (zoomLevel < 1) zoomLevel = 1
  }
  return zoomLevel
}

/**
 * @param {string} svgStr
 * @returns {string}
 */
export function svgToDataURL (svgStr: string) : string {
  const encoded = encodeURIComponent(svgStr)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')

  const header = 'data:image/svg+xml,'
  const dataUrl = header + encoded

  return dataUrl
}
