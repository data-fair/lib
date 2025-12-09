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

const headingClasses: Record<number, string> = {
  1: 'text-h2 text-primary mt-12 mb-8',
  2: 'text-h4 mt-10 mb-6',
  3: 'text-h5 mt-8 mb-4',
  4: 'text-h6 mt-6 mb-4',
  5: 'text-subtitle-1 mt-6 mb-4',
  6: 'text-subtitle-2 mt-6 mb-4'
}

export const markedVuetify: MarkedExtension = {
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
      return `<p class="markdown-paragraph">${this.parser.parseInline(tokens)}</p>\n`
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

      return `<div class="v-table v-table--density-comfortable">
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
      return '<' + type + startAttr + ' class="ml-6 mb-6">\n' + body + '</' + type + '>\n'
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

export default markedVuetify
