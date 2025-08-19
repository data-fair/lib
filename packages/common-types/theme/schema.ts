export default {
  $id: 'https://github.com/data-fair/lib/theme',
  'x-exports': ['types'],
  type: 'object',
  title: 'Thème',
  required: ['colors'],
  layout: [
    { key: 'logo', if: '!context.simplifiedTheme' },
    { key: 'bodyFontFamilyCss', cols: 6, if: '!context.simplifiedTheme' },
    { key: 'headingFontFamilyCss', cols: 6, if: '!context.simplifiedTheme' },
    'assistedMode',
    {
      comp: 'tabs',
      if: 'data.assistedMode',
      children: [{
        title: 'Thème par défaut',
        children: [
          { key: 'assistedModeColors', cols: { sm: 7, lg: 9 } },
          { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'colors', dark: false } }
        ]
      }, {
        title: 'Thème sombre',
        children: [
          { key: 'dark', cols: { sm: 7, lg: 9 } },
          { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'darkColors', dark: true } }
        ]
      }, {
        title: 'Thème à fort contraste',
        children: [
          { key: 'hc', cols: { sm: 7, lg: 9 } },
          { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'hcColors', dark: false } }
        ]
      }, {
        title: 'Thème sombre à fort contraste',
        children: [
          { key: 'hcDark', cols: { sm: 7, lg: 9 } },
          { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'hcDarkColors', dark: true } }
        ]
      }]
    },
    {
      comp: 'tabs',
      if: '!data.assistedMode',
      children: [{
        title: 'Thème par défaut',
        children: [
          { key: 'colors', cols: { sm: 7, lg: 9 } },
          { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'colors', dark: false } }
        ]
      }, {
        title: 'Thème sombre',
        children: [
          { children: ['dark', 'darkColors'], cols: { sm: 7, lg: 9 } },
          { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'darkColors', dark: true } }
        ]
      }, {
        title: 'Thème à fort contraste',
        children: [
          { children: ['hc', 'hcColors'], cols: { sm: 7, lg: 9 } },
          { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'hcColors', dark: false } }
        ]
      }, {
        title: 'Thème sombre à fort contraste',
        children: [
          { children: ['hcDark', 'hcDarkColors'], cols: { sm: 7, lg: 9 } },
          { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'hcDarkColors', dark: true } }
        ]
      }]
    }
  ],
  properties: {
    logo: {
      title: "URL d'un logo",
      type: 'string'
    },
    bodyFontFamilyCss: {
      title: 'CSS police de caractères pour le corps du texte',
      layout: {
        comp: 'textarea',
        rows: 3
      },
      description: "Par défaut une police Nunito auto-hébergée est utilisée. Vous pouvez aussi copier le CSS proposé par une plateforme comme Google Fonts, dans ce cas il faut remplacer le nom de la police par '{FONT_FAMILY}'.",
      type: 'string'
    },
    headingFontFamilyCss: {
      title: 'CSS police de caractères pour les titres',
      layout: {
        comp: 'textarea',
        rows: 3
      },
      description: 'Renseignez de la même manière que pour le corps de texte, ou laissez vide pour utiliser la police du corps du texte',
      type: 'string'
    },
    assistedMode: {
      type: 'boolean',
      title: 'mode de gestion des couleurs simplifié',
      description: "Si activé vous ne devrez saisir que les couleurs principales du thème, d'autres couleurs seront affectées par défaut et les couleurs de texte seront automatiquement ajustées pour être lisibles sur les couleurs de fond.",
      default: true
    },
    assistedModeColors: {
      type: 'object',
      properties: {
        primary: {
          type: 'string',
          title: 'Couleur principale',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        secondary: {
          type: 'string',
          title: 'Couleur secondaire',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        accent: {
          type: 'string',
          title: 'Couleur accentuée',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        }
      }
    },
    colors: { $ref: '#/$defs/colors' },
    dark: { type: 'boolean', title: 'proposer ce thème aux utilisateurs' },
    darkColors: { $ref: '#/$defs/colors' },
    hc: { type: 'boolean', title: 'proposer ce thème aux utilisateurs' },
    hcColors: { $ref: '#/$defs/colors' },
    hcDark: { type: 'boolean', title: 'proposer ce thème aux utilisateurs' },
    hcDarkColors: { $ref: '#/$defs/colors' }
  },
  $defs: {
    colors: {
      type: 'object',
      additionalProperties: false,
      required: [
        'background',
        'on-background',
        'surface',
        'on-surface',
        'primary',
        'on-primary',
        'secondary',
        'on-secondary',
        'accent',
        'on-accent',
        'error',
        'on-error',
        'info',
        'on-info',
        'success',
        'on-success',
        'warning',
        'on-warning',
        'admin',
        'on-admin'
      ],
      properties: {
        background: {
          type: 'string',
          title: 'Couleur de fond',
          layout: {
            comp: 'color-picker',
            cols: 3
          }
        },
        'on-background': {
          type: 'string',
          title: 'Couleur de texte sur couleur de fond',
          layout: {
            comp: 'color-picker',
            cols: 3
          }
        },
        surface: {
          type: 'string',
          title: 'Couleur des surfaces (vignettes, listes, etc)',
          layout: {
            comp: 'color-picker',
            cols: 3
          }
        },
        'on-surface': {
          type: 'string',
          title: 'Couleur de texte sur couleur des surfaces',
          layout: {
            comp: 'color-picker',
            cols: 3
          }
        },
        primary: {
          type: 'string',
          title: 'Couleur principale',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'on-primary': {
          type: 'string',
          title: 'Couleur de texte sur couleur principale',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'text-primary': {
          type: 'string',
          title: 'Couleur de texte principal',
          layout: {
            comp: 'color-picker',
            cols: 4,
            hint: 'laissez vide pour utiliser la couleur principale'
          }
        },
        secondary: {
          type: 'string',
          title: 'Couleur secondaire',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'on-secondary': {
          type: 'string',
          title: 'Couleur de texte sur couleur secondaire',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'text-secondary': {
          type: 'string',
          title: 'Couleur de texte secondaire',
          layout: {
            comp: 'color-picker',
            cols: 4,
            hint: 'laissez vide pour utiliser la couleur secondaire'
          }
        },
        accent: {
          type: 'string',
          title: 'Couleur accentuée',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'on-accent': {
          type: 'string',
          title: 'Couleur de texte sur couleur accentuée',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'text-accent': {
          type: 'string',
          title: 'Couleur de texte accentué',
          layout: {
            comp: 'color-picker',
            cols: 4,
            hint: 'laissez vide pour utiliser la couleur accentuée'
          }
        },
        info: {
          type: 'string',
          title: 'Couleur info',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'on-info': {
          type: 'string',
          title: 'Couleur de texte sur couleur info',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'text-info': {
          type: 'string',
          title: 'Couleur de texte info',
          layout: {
            comp: 'color-picker',
            cols: 4,
            hint: 'laissez vide pour utiliser la couleur info'
          }
        },
        success: {
          type: 'string',
          title: 'Couleur succès',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'on-success': {
          type: 'string',
          title: 'Couleur succès',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'text-success': {
          type: 'string',
          title: 'Couleur de texte succès',
          layout: {
            comp: 'color-picker',
            cols: 4,
            hint: 'laissez vide pour utiliser la couleur succès'
          }
        },
        error: {
          type: 'string',
          title: 'Couleur erreur',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'on-error': {
          type: 'string',
          title: 'Couleur de texte sur couleur erreur',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'text-error': {
          type: 'string',
          title: 'Couleur de texte erreur',
          layout: {
            comp: 'color-picker',
            cols: 4,
            hint: 'laissez vide pour utiliser la couleur erreur'
          }
        },
        warning: {
          type: 'string',
          title: 'Couleur avertissement',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'on-warning': {
          type: 'string',
          title: 'Couleur de texte sur avertissement',
          layout: {
            comp: 'color-picker',
            cols: 4
          }
        },
        'text-warning': {
          type: 'string',
          title: 'Couleur de texte avertissement',
          layout: {
            comp: 'color-picker',
            cols: 4,
            hint: 'laissez vide pour utiliser la couleur avertissement'
          }
        },
        admin: { type: 'string', layout: 'none' },
        'on-admin': { type: 'string', layout: 'none' },
        'text-admin': { type: 'string', layout: 'none' }
      }
    }
  }
}
