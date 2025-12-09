import type { IOptions as SanitizeOptions, IDefaults as SanitizeDefaults } from 'sanitize-html'

export const getSanitizeOpts = (defaults: SanitizeDefaults): SanitizeOptions => ({
  allowedTags: defaults.allowedTags.concat(['img']),
  allowedAttributes: {
    ...defaults.allowedAttributes,
    '*': ['class'],
    img: ['title', 'alt', 'src', 'srcset', 'height', 'width', 'sizes', 'loading']
  }
})
