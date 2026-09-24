// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Filtres statiques prédéfinis (staticFilters)
// ─────────────────────────────────────────────────────────────────────────────
//
// Définition canonique alignée sur le type `Filtres` de @data-fair/lib-utils
// (monorepo data-fair/lib, packages/utils/filters/schema.json) + filtres `starts`,
// `exists` et `notExists`.
//
// `interval` accepte tout champ : nombre, date (`format: date|date-time`) ou texte.
// Les bornes min/max sont des chaînes suggérées par autocomplete sur les valeurs
// réelles du dataset (`values-labels` trié, borné par `_gte`/`_lte`) — c'est ce qui
// rend les dates utilisables sans date-picker dans VJSF, et `filters2params` les
// transmet telles quelles en `_gte`/`_lte`.
//
// À insérer dans les `definitions` du schema.json d'une app, puis référencer :
//   "staticFilters": { "$ref": "#/definitions/filters" }
//
// ⚠️ Runtime : ne PAS convertir en `qs`. Utiliser `filters2params` et spreader
// les params REST suffixés (_in, _nin, _gte, _lte, _starts, _exists, _nexists).
//   import { filters2params } from '@data-fair/lib-utils/filters/index.js'
//   const sf = normalizeStaticFilters(config.staticFilters) // field string → { key }
//   if (sf.length) Object.assign(params, filters2params(sf))
//
// `field` doit rester un objet `{ key, label }` : les `getItems` sélectionnent la
// colonne et VJSF stocke l'objet choisi. `normalizeStaticFilters` couvre le cas où
// DataFair envoie une simple chaîne (clé du champ).

export default {
  filters: {
    type: 'array',
    title: 'Filtres prédéfinis',
    layout: {
      comp: 'list',
      messages: {
        addItem: 'Ajouter un filtre'
      }
    },
    items: {
      type: 'object',
      discriminator: { propertyName: 'type' },
      default: { type: 'in' },
      oneOf: [
        {
          title: 'Restreindre à des valeurs',
          additionalProperties: false,
          properties: {
            type: { const: 'in' },
            field: { $ref: '#/definitions/filterField' },
            values: {
              type: 'array',
              title: 'Valeurs',
              items: { type: 'string' },
              layout: {
                if: 'parent.data.field',
                getItems: {
                  url: '${rootData.datasets?.[0]?.href || \'\'}/values-labels/${parent.data.field?.key || \'\'}?q={q}&q_mode=complete&size=100&stringify=true',
                  itemKey: 'data["value"]',
                  itemTitle: 'data["label"]'
                }
              }
            }
          }
        },
        {
          title: 'Exclure des valeurs',
          additionalProperties: false,
          properties: {
            type: { const: 'out' },
            field: { $ref: '#/definitions/filterField' },
            values: {
              type: 'array',
              title: 'Valeurs à exclure',
              items: { type: 'string' },
              layout: {
                if: 'parent.data.field',
                getItems: {
                  url: '${rootData.datasets?.[0]?.href || \'\'}/values-labels/${parent.data.field?.key || \'\'}?q={q}&q_mode=complete&size=100&stringify=true',
                  itemKey: 'data["value"]',
                  itemTitle: 'data["label"]'
                }
              }
            }
          }
        },
        {
          title: 'Restreindre à un intervalle',
          additionalProperties: false,
          properties: {
            type: { const: 'interval' },
            field: { $ref: '#/definitions/filterField' },
            minValue: {
              type: 'string',
              title: 'Valeur min',
              layout: {
                if: 'parent.data.field',
                getItems: {
                  url: '${rootData.datasets?.[0]?.href || \'\'}/values-labels/${parent.data.field?.key || \'\'}?sort=asc&${parent.data.field?.key || \'\'}_gte={q}&stringify=true&size=20',
                  itemKey: 'data["value"]',
                  itemTitle: 'data["label"]'
                }
              }
            },
            maxValue: {
              type: 'string',
              title: 'Valeur max',
              layout: {
                if: 'parent.data.field',
                getItems: {
                  url: '${rootData.datasets?.[0]?.href || \'\'}/values-labels/${parent.data.field?.key || \'\'}?sort=desc&${parent.data.field?.key || \'\'}_lte={q}&stringify=true&size=20',
                  itemKey: 'data["value"]',
                  itemTitle: 'data["label"]'
                }
              }
            }
          }
        },
        {
          title: 'Commence par',
          additionalProperties: false,
          properties: {
            type: { const: 'starts' },
            field: { $ref: '#/definitions/filterField' },
            value: {
              type: 'string',
              title: 'Valeur',
              layout: { if: 'parent.data.field' }
            }
          }
        },
        {
          title: 'Exclure les valeurs vides ou non définies',
          additionalProperties: false,
          properties: {
            type: { const: 'exists' },
            field: { $ref: '#/definitions/filterField' }
          }
        },
        {
          title: 'Restreindre aux valeurs vides ou non définies',
          additionalProperties: false,
          properties: {
            type: { const: 'notExists' },
            field: { $ref: '#/definitions/filterField' }
          }
        }
      ]
    }
  },

  // Sélecteur de champ (n'importe quelle colonne, y compris dates et textes)
  filterField: {
    type: 'object',
    title: 'Champ',
    layout: {
      getItems: {
        url: '${rootData.datasets?.[0]?.href || \'\'}/schema?calculated=false',
        itemKey: 'data["key"]',
        itemTitle: 'data["label"]'
      }
    }
  }
}
