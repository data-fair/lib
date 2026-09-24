// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Couleurs (couleur simple OU thème/custom)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Pattern 1 : couleur simple (string hex) ────────────────────────────────
//
// ⚠️ NE PAS ÉCRIRE "format": "hexcolor" : ce format n'existe pas dans le
// validateur JSON Schema standard et VJSF 3 émet un warning
// "unknown format 'hexcolor' ignored in schema". Le rendu fonctionne par
// chance (grâce à layout: "color-picker") mais le format est trompeur.
//
// ✅ Pattern correct : type string + layout color-picker + default hex.

export const simpleColor = {
  type: 'string',
  title: 'Couleur',
  default: '#1976D2',
  layout: 'color-picker'
}

// ─── Pattern 2 : choix entre une couleur du thème OU une couleur custom ─────
//
// Utilise un discriminator pour proposer à l'utilisateur soit une couleur
// de la palette Vuetify (primary/secondary/...), soit une couleur hex libre.

export const colorDefinition = {
  type: 'object',
  title: 'Couleur',
  discriminator: { propertyName: 'type' },
  oneOfLayout: { emptyData: true },
  oneOf: [
    {
      title: 'Thème',
      properties: {
        type: { const: 'theme' },
        strValue: {
          title: 'Couleur',
          type: 'string',
          // Les trois couleurs principales du thème forment le contrat minimum
          // d'un portail : un sélecteur qui propose primary propose TOUJOURS
          // aussi secondary et accent. Ce sont les trois couleurs qu'un
          // administrateur de portail renseigne (cf. le mode simplifié du
          // schéma de thème dans @data-fair/lib-common-types).
          oneOf: [
            { const: 'primary', title: 'Primaire' },
            { const: 'secondary', title: 'Secondaire' },
            { const: 'accent', title: 'Accentuée' }
          ],
          default: 'primary'
        }
      }
    },
    {
      title: 'Personnalisée',
      properties: {
        type: { const: 'custom' },
        hexValue: {
          type: 'string',
          title: 'Couleur',
          default: '#222222',
          layout: 'color-picker'
        }
      }
    }
  ],
  default: {
    type: 'custom',
    hexValue: '#222222'
  }
}

// ─── Utilisation dans un schéma ────────────────────────────────────────────
//
// import { simpleColor, colorDefinition } from './schema-color'
//
// export default {
//   type: 'object',
//   properties: {
//     accentColor: simpleColor,                       // string hex simple
//     badgeColor: { $ref: '#/definitions/color' }     // thème OU custom
//   },
//   definitions: { color: colorDefinition }
// }
//
// Côté code (récupération uniforme) :
//   const c = config.badgeColor
//   const value = c.type === 'custom' ? c.hexValue : theme.current.value.colors[c.strValue]
