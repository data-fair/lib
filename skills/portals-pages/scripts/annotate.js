// Annotation layer for portal documentation screenshots.
//
// Run this whole file as the `function` argument of the Playwright MCP tool
// `browser_evaluate`. It installs window.ANNO and returns 'ready'.
// Everything after that goes through a SECOND browser_evaluate call:
//
//   () => {
//     ANNO.reset()
//     ANNO.mark(ANNO.field("URL de l'API"), 1)
//     ANNO.mark(ANNO.sel('.v-card'), 2)
//     return ANNO.commit()      // [] === ready to capture
//   }
//
// Every badge of one picture shares the same x. By default that column sits
// just right of the widest rectangle. When the marks live inside a card and
// have very different widths, hang the column off the card instead:
//
//     return ANNO.commit(ANNO.sel('.panel.resource'))
//
// commit() lays every mark out, draws them, then verifies the result.
// A non-empty return value means DO NOT capture: fix the marks first.
// The rules it enforces are the ones that produced rejected screenshots
// before — overlapping rectangles, badges at inconsistent offsets, badges
// clipped by the image edge, rectangles biting into a neighbouring control.
// See references/screenshots.md for the conventions and the error codes.
// eslint-disable-next-line no-unused-expressions -- bare function expression, evaluated by browser_evaluate
() => {
  const RED = '#e53935'
  const BORDER = 2.5 // rectangle and badge stroke
  const BADGE = 28 // badge side, px
  const GAP = 12 // rectangle edge -> badge
  const INSET = 3 // rectangle drawn inside the target box, px
  const MARGIN = 8 // keep clear of the viewport edge

  const vis = (el) => {
    if (!el || !el.getBoundingClientRect) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }

  const ANNO = {
    marks: [],

    // --- target resolution: visible elements only -------------------------
    // The stepper keeps previous steps in the DOM at display:none, and
    // querySelector happily returns the ghost -> a 0x0 rectangle in the top
    // left corner. Every helper filters on visibility.
    sel (selector, index = 0) {
      return [...document.querySelectorAll(selector)].filter(vis)[index] || null
    },
    field (label) {
      const labels = [...document.querySelectorAll('.v-input label, .v-input .v-label')].filter(vis)
      const t = (x) => (x.textContent || '').trim()
      const l = labels.find((x) => t(x) === label) || labels.find((x) => t(x).startsWith(label))
      if (!l) return null
      const input = l.closest('.v-input')
      return input ? (input.querySelector('.v-field') || input) : null
    },
    text (needle, selector = '*') {
      return [...document.querySelectorAll(selector)]
        .filter((el) => vis(el) && (el.textContent || '').trim().includes(needle) &&
          ![...el.children].some((c) => (c.textContent || '').includes(needle)))[0] || null
    },
    // Rectangle spanning several elements (a range of lines in a code block).
    span (elements) {
      const rs = elements.filter(vis).map((e) => e.getBoundingClientRect())
      if (!rs.length) return null
      return {
        left: Math.min(...rs.map((r) => r.left)),
        top: Math.min(...rs.map((r) => r.top)),
        right: Math.max(...rs.map((r) => r.right)),
        bottom: Math.max(...rs.map((r) => r.bottom))
      }
    },

    // --- reset ------------------------------------------------------------
    reset () {
      this.marks = []
      document.querySelectorAll('.__anno').forEach((e) => e.remove())
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      for (const el of document.querySelectorAll('*')) if (el.scrollTop > 0) el.scrollTop = 0
      // The injected stylesheet alone does NOT kill the scrollbar: the inline
      // !important on both html and body is what actually does it.
      let st = document.getElementById('__nostyle')
      if (!st) {
        st = document.createElement('style')
        st.id = '__nostyle'
        document.head.appendChild(st)
      }
      st.textContent = '*::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}' +
        'html,body,*{scrollbar-width:none!important}'
      document.documentElement.style.setProperty('overflow', 'hidden', 'important')
      document.body.style.setProperty('overflow', 'hidden', 'important')
      return 'reset'
    },

    // --- queue a mark -----------------------------------------------------
    mark (target, n) {
      const box = target && target.getBoundingClientRect ? target.getBoundingClientRect() : target
      this.marks.push({ n, box: box && { left: box.left, top: box.top, right: box.right, bottom: box.bottom } })
      return this
    },

    // --- layout + draw + verify ------------------------------------------
    commit (container) {
      const W = document.documentElement.clientWidth
      const H = document.documentElement.clientHeight
      const bad = []
      const push = (code, n, detail) => bad.push({ code, n, detail })

      // 1. reject unusable targets before laying anything out
      const marks = []
      for (const m of this.marks) {
        if (!m.box) { push('cible-introuvable', m.n, 'le sélecteur ne rend rien de visible'); continue }
        const w = m.box.right - m.box.left; const h = m.box.bottom - m.box.top
        if (w <= 0 || h <= 0) { push('cible-fantome', m.n, `${Math.round(w)}x${Math.round(h)} — element cache (display:none)`); continue }
        if (m.box.top < 0 || m.box.bottom > H) { push('cible-hors-cadre', m.n, 'la cible deborde le viewport, agrandir la hauteur avant d annoter'); continue }
        marks.push(m)
      }

      // 2. rectangle: always drawn INSIDE the target box. A border landing on
      // the outside of the box is what bit into the neighbouring button.
      for (const m of marks) {
        const w = m.box.right - m.box.left; const h = m.box.bottom - m.box.top
        const inset = Math.min(INSET, Math.floor(w / 4), Math.floor(h / 4))
        m.rect = { left: m.box.left + inset, top: m.box.top + inset, right: m.box.right - inset, bottom: m.box.bottom - inset }
      }

      // 3. badges: ONE column for the whole image. Every badge of a picture
      // shares the same x — that single invariant is what the eye reads as
      // regular, and mixing two offsets is what made the old captures look
      // arbitrary. Pass a container element to `commit` to hang the column off
      // it instead (a card whose marks have very different widths).
      const colRight = container ? container.getBoundingClientRect().right : Math.max(...marks.map((m) => m.rect.right))
      const colLeft = container ? container.getBoundingClientRect().left : Math.min(...marks.map((m) => m.rect.left))
      const fitsRight = marks.length > 0 && colRight + GAP + BADGE + MARGIN <= W
      const fitsLeft = marks.length > 0 && colLeft - GAP - BADGE - MARGIN >= 0
      const side = fitsRight ? 'right' : (fitsLeft ? 'left' : null)
      if (!side && marks.length) {
        push('badges-sans-place', null, `aucun cote ne loge les ${marks.length} badges dans ${W}px — elargir la capture`)
      }
      const colonne = side === 'left' ? colLeft - GAP - BADGE : colRight + GAP
      for (const m of marks) {
        const x = colonne
        const yRaw = m.rect.top + (m.rect.bottom - m.rect.top) / 2 - BADGE / 2
        const y = Math.max(MARGIN, Math.min(yRaw, H - BADGE - MARGIN))
        if (Math.abs(y - yRaw) > 0.5) push('badge-recadre', m.n, 'le badge devrait sortir du cadre, il ne designe plus sa cible')
        // un badge tres loin de sa cible ne la designe plus : soit les cadres
        // doivent partager un bord, soit il faut passer un container
        const ecart = side === 'left' ? m.rect.left - (x + BADGE) : x - m.rect.right
        if (!container && ecart > GAP + 24) {
          push('badge-trop-loin-de-sa-cible', m.n, `${Math.round(ecart)}px — aligner les bords des cadres, ou passer le conteneur a commit()`)
        }
        m.badge = { left: x, top: y }
      }

      // 4. no two rectangles may touch: they must keep a visible gutter
      const GUTTER = 2 * INSET
      for (let i = 0; i < marks.length; i++) {
        for (let j = i + 1; j < marks.length; j++) {
          const a = marks[i].rect; const b = marks[j].rect
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (ox > 0 && oy > 0) {
            push('rectangles-superposes', `${marks[i].n}+${marks[j].n}`, 'les deux cadres se recouvrent')
          } else if (ox > 0 && -oy < GUTTER) {
            push('rectangles-jointifs', `${marks[i].n}+${marks[j].n}`,
              `${Math.round(-oy)}px entre les bordures, il en faut ${GUTTER} — encadrer le bloc parent et numeroter dedans`)
          }
        }
      }

      // 5. a badge must not sit on a rectangle that is not its own, nor on
      // another badge
      for (const m of marks) {
        const bb = { left: m.badge.left, top: m.badge.top, right: m.badge.left + BADGE, bottom: m.badge.top + BADGE }
        for (const o of marks) {
          if (o === m) continue
          const hit = (r) => bb.left < r.right && bb.right > r.left && bb.top < r.bottom && bb.bottom > r.top
          if (hit(o.rect)) push('badge-sur-autre-cadre', m.n, `le badge ${m.n} chevauche le cadre ${o.n}`)
          const ob = { left: o.badge.left, top: o.badge.top, right: o.badge.left + BADGE, bottom: o.badge.top + BADGE }
          if (m.n < o.n && hit(ob)) push('badges-superposes', `${m.n}+${o.n}`, 'cibles trop proches pour deux badges distincts')
        }
      }

      // 6. draw
      const div = (css) => {
        const d = document.createElement('div')
        d.className = '__anno'
        d.style.cssText = css
        document.body.appendChild(d)
        return d
      }
      for (const m of marks) {
        div(`position:fixed;left:${m.rect.left}px;top:${m.rect.top}px;width:${m.rect.right - m.rect.left}px;` +
          `height:${m.rect.bottom - m.rect.top}px;border:${BORDER}px solid ${RED};border-radius:5px;` +
          'z-index:99999;pointer-events:none;box-sizing:border-box')
        const b = div(`position:fixed;left:${m.badge.left}px;top:${m.badge.top}px;width:${BADGE}px;height:${BADGE}px;` +
          `border:${BORDER}px solid ${RED};border-radius:5px;background:#fff;color:${RED};` +
          'font:bold 17px Arial;display:flex;align-items:center;justify-content:center;z-index:99999;pointer-events:none')
        b.textContent = m.n
      }

      // 7. report
      if (document.documentElement.clientWidth !== W) push('viewport-instable', null, 'la largeur a bouge pendant le rendu')
      return bad
    },

    // Geometry of what is currently drawn — for a second opinion after the
    // screenshot looks wrong. Only meaningful after commit().
    dump () {
      if (this.marks.some((m) => !m.rect)) return 'appeler commit() avant dump()'
      return this.marks.map((m) => ({ n: m.n, rect: m.rect, badge: m.badge }))
    }
  }

  window.ANNO = ANNO
  return 'ready'
}
