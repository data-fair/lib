import type { MarkedExtension, Tokens } from 'marked'

// ==== Helpers functions from marked library ====
const REGEX = {
  escapeTest: /[&<>"']/,
  escapeReplace: /[&<>"']/g,
  escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
  escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
  percentDecode: /%25/g,
}

const escapeReplacements: { [index: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
const getEscapeReplacement = (ch: string) => escapeReplacements[ch]

function escape (html: string, encode?: boolean) {
  if (encode) {
    if (REGEX.escapeTest.test(html)) {
      return html.replace(REGEX.escapeReplace, getEscapeReplacement)
    }
  } else {
    if (REGEX.escapeTestNoEncode.test(html)) {
      return html.replace(REGEX.escapeReplaceNoEncode, getEscapeReplacement)
    }
  }

  return html
}

function cleanUrl (href: string) {
  try {
    href = encodeURI(href).replace(REGEX.percentDecode, '%')
  } catch {
    return null
  }
  return href
}
// ==============================================

export type MarkedVuetifyDensity = 'default' | 'comfortable' | 'compact'
export interface MarkedVuetifyOptions {
  density?: MarkedVuetifyDensity
}

const headingClassesByDensity: Record<MarkedVuetifyDensity, Record<number, string>> = {
  default: {
    1: 'text-h2 text-display-medium text-primary mt-12 mb-8',
    2: 'text-h4 text-headline-large mt-10 mb-6',
    3: 'text-h5 text-headline-medium mt-8 mb-4',
    4: 'text-h6 text-headline-small mt-6 mb-4',
    5: 'text-subtitle-1 text-body-large mt-6 mb-4',
    6: 'text-subtitle-2 text-label-large mt-6 mb-4'
  },
  comfortable: {
    1: 'text-h2 text-display-medium text-primary mt-8 mb-4',
    2: 'text-h4 text-headline-large mt-6 mb-3',
    3: 'text-h5 text-headline-medium mt-4 mb-2',
    4: 'text-h6 text-headline-small mt-3 mb-2',
    5: 'text-subtitle-1 text-body-large mt-3 mb-2',
    6: 'text-subtitle-2 text-label-large mt-3 mb-2'
  },
  compact: {
    1: 'text-h3 text-headline-large text-primary mt-4 mb-2',
    2: 'text-h5 text-headline-medium mt-3 mb-1',
    3: 'text-h6 text-headline-small mt-2 mb-1',
    4: 'text-subtitle-1 text-body-large mt-2 mb-1',
    5: 'text-subtitle-2 text-label-large mt-2 mb-1',
    6: 'text-body-2 text-label-medium mt-2 mb-1'
  }
}

const tableDensityClass: Record<MarkedVuetifyDensity, string> = {
  default: 'v-table--density-comfortable',
  comfortable: 'v-table--density-comfortable',
  compact: 'v-table--density-compact'
}

const listClasses: Record<MarkedVuetifyDensity, string> = {
  default: 'ml-6 mb-6',
  comfortable: 'ml-4 mb-3',
  compact: 'ml-3 mb-1'
}

const paragraphClasses: Record<MarkedVuetifyDensity, string> = {
  default: 'markdown-paragraph mt-4 mb-4',
  comfortable: 'markdown-paragraph mt-3 mb-3',
  compact: 'markdown-paragraph mt-1 mb-1'
}

export function createMarkedVuetify (options?: MarkedVuetifyOptions): MarkedExtension {
  const density = options?.density ?? 'default'
  const headingClasses = headingClassesByDensity[density]
  const tableClass = tableDensityClass[density]
  const listClass = listClasses[density]
  const paragraphClass = paragraphClasses[density]

  return {
    // overwrite some of the renderer function to apply vuetify classes
    // https://github.com/markedjs/marked/blob/master/src/Renderer.ts
    renderer: {
      heading ({ tokens, depth }: Tokens.Heading) {
        return `<h${depth + 1} class="${headingClasses[depth]}">${this.parser.parseInline(tokens)}</h${depth + 1}>\n`
      },
      hr () {
        return '<hr class="v-divider v-theme--light" aria-orientation="horizontal" role="separator">'
      },
      paragraph ({ tokens }: Tokens.Paragraph) {
        return `<p class="${paragraphClass}">${this.parser.parseInline(tokens)}</p>\n`
      },
      table (token: Tokens.Table) {
        let header = ''

        // header
        let cell = ''
        for (let j = 0; j < token.header.length; j++) {
          cell += this.tablecell(token.header[j])
        }
        header += this.tablerow({ text: cell })

        let body = ''
        for (let j = 0; j < token.rows.length; j++) {
          const row = token.rows[j]

          cell = ''
          for (let k = 0; k < row.length; k++) {
            cell += this.tablecell(row[k])
          }

          body += this.tablerow({ text: cell })
        }
        if (body) body = `<tbody>${body}</tbody>`

        return `<div class="v-table ${tableClass}">
  <div class="v-table__wrapper">
    <table>
      <thead>
        ${header}
      </thead>
      ${body}
    </table>
  </div>
</div>`
      },
      list (token: Tokens.List) {
        const ordered = token.ordered
        const start = token.start

        let body = ''
        for (let j = 0; j < token.items.length; j++) {
          const item = token.items[j]
          body += this.listitem(item)
        }

        const type = ordered ? 'ol' : 'ul'
        const startAttr = (ordered && start !== 1) ? (' start="' + start + '"') : ''
        return '<' + type + startAttr + ' class="' + listClass + '">\n' + body + '</' + type + '>\n'
      },
      link ({ href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens)
        const cleanHref = cleanUrl(href)
        if (cleanHref === null) return text
        let out = '<a href="' + cleanHref + '" class="simple-link"'
        if (title) out += ' title="' + (escape(title)) + '"'
        out += '>' + text + '</a>'
        return out
      }
    }
  }
}

export const markedVuetify = createMarkedVuetify()
export default markedVuetify
