/** @type {{fr: [number, string][], en: [number, string][]}} */
const locales = {
  fr: [[0, 'octet'], [1, 'octets'], [1000, 'ko'], [1000 * 1000, 'Mo'], [1000 * 1000 * 1000, 'Go'], [1000 * 1000 * 1000 * 1000, 'To'], [1000 * 1000 * 1000 * 1000 * 1000, 'Po']],
  en: [[0, 'byte'], [1, 'bytes'], [1000, 'kb'], [1000 * 1000, 'Mb'], [1000 * 1000 * 1000, 'Gb'], [1000 * 1000 * 1000 * 1000, 'Tb'], [1000 * 1000 * 1000 * 1000 * 1000, 'Pb']]
}

// eslint-disable-next-line jsdoc/require-returns-check
/**
 * @param {number | string} bytes
 * @param {string} locale
 * @returns {string}
 */
export function formatBytes (bytes, locale = 'fr') {
  const bytesInt = Math.abs(typeof bytes === 'string' ? parseInt(bytes, 10) : bytes)
  const def = locales[/** @type {'fr' | 'en'} */(locale)] ?? locales.en
  for (let i = 0; i < def.length; i++) {
    const step = def[i][0]
    if (bytesInt < step || i === def.length - 1) {
      return (bytesInt / (def[i - 1][0] || 1)).toLocaleString(locale, { maximumFractionDigits: 0 }) + ' ' + def[i - 1][1]
    }
  }
  return '' // this is only for strict typing, but the code cannot go there, the return in the loop is always called
}

export default formatBytes
