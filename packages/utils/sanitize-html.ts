import type { IOptions as SanitizeOptions, IDefaults as SanitizeDefaults } from 'sanitize-html'

export const getSanitizeOpts = (defaults: SanitizeDefaults): SanitizeOptions => ({
  allowedTags: defaults.allowedTags.concat(['img']),
  allowedAttributes: {
    ...defaults.allowedAttributes,
    '*': ['class'],
    img: ['title', 'alt', 'src', 'srcset', 'height', 'width', 'sizes', 'loading']
  },
  // style attributes are not allowed above, parsing them would uselessly run postcss,
  // which is also not browser compatible (node builtins externalized by vite).
  // note: a consumer extending these opts with allowedStyles must switch this back to true
  parseStyleAttributes: false
})
