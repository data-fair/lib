export default {
  $id: 'https://github.com/data-fair/lib/theme',
  'x-exports': ['types'],
  type: 'object',
  title: 'Thème',
  'x-i18n-title': {
    fr: 'Thème',
    en: 'Theme',
    es: 'Tema',
    it: 'Tema',
    pt: 'Tema',
    de: 'Thema'
  },
  required: ['colors'],
  layout: {
    title: '',
    children: [
      { key: 'logo', if: '!context.simplifiedTheme' },
      { key: 'bodyFontFamilyCss', cols: 6, if: '!context.simplifiedTheme' },
      { key: 'headingFontFamilyCss', cols: 6, if: '!context.simplifiedTheme' },
      'assistedMode',
      {
        comp: 'tabs',
        if: 'data.assistedMode',
        children: [{
          title: 'Thème par défaut',
          'x-i18n-title': {
            fr: 'Thème par défaut',
            en: 'Default theme',
            es: 'Tema predeterminado',
            it: 'Tema predefinito',
            pt: 'Tema padrão',
            de: 'Standardthema'
          },
          children: [
            { key: 'assistedModeColors', cols: { sm: 7, lg: 9 } },
            { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'colors', dark: false } }
          ]
        }, {
          title: 'Thème sombre',
          'x-i18n-title': {
            fr: 'Thème sombre',
            en: 'Dark theme',
            es: 'Tema oscuro',
            it: 'Tema scuro',
            pt: 'Tema escuro',
            de: 'Dunkles Thema'
          },
          children: [
            { key: 'dark', cols: { sm: 7, lg: 9 } },
            { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'darkColors', dark: true } }
          ]
        }, {
          title: 'Thème à fort contraste',
          'x-i18n-title': {
            fr: 'Thème à fort contraste',
            en: 'High contrast theme',
            es: 'Tema de alto contraste',
            it: 'Tema ad alto contrasto',
            pt: 'Tema de alto contraste',
            de: 'Hochkontrastthema'
          },
          children: [
            { key: 'hc', cols: { sm: 7, lg: 9 } },
            { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'hcColors', dark: false } }
          ]
        }, {
          title: 'Thème sombre à fort contraste',
          'x-i18n-title': {
            fr: 'Thème sombre à fort contraste',
            en: 'Dark high contrast theme',
            es: 'Tema oscuro de alto contraste',
            it: 'Tema scuro ad alto contrasto',
            pt: 'Tema escuro de alto contraste',
            de: 'Dunkles Hochkontrastthema'
          },
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
          'x-i18n-title': {
            fr: 'Thème par défaut',
            en: 'Default theme',
            es: 'Tema predeterminado',
            it: 'Tema predefinito',
            pt: 'Tema padrão',
            de: 'Standardthema'
          },
          children: [
            { key: 'colors', cols: { sm: 7, lg: 9 } },
            { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'colors', dark: false } }
          ]
        }, {
          title: 'Thème sombre',
          'x-i18n-title': {
            fr: 'Thème sombre',
            en: 'Dark theme',
            es: 'Tema oscuro',
            it: 'Tema scuro',
            pt: 'Tema escuro',
            de: 'Dunkles Thema'
          },
          children: [
            { children: ['dark', 'darkColors'], cols: { sm: 7, lg: 9 } },
            { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'darkColors', dark: true } }
          ]
        }, {
          title: 'Thème à fort contraste',
          'x-i18n-title': {
            fr: 'Thème à fort contraste',
            en: 'High contrast theme',
            es: 'Tema de alto contraste',
            it: 'Tema ad alto contrasto',
            pt: 'Tema de alto contraste',
            de: 'Hochkontrastthema'
          },
          children: [
            { children: ['hc', 'hcColors'], cols: { sm: 7, lg: 9 } },
            { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'hcColors', dark: false } }
          ]
        }, {
          title: 'Thème sombre à fort contraste',
          'x-i18n-title': {
            fr: 'Thème sombre à fort contraste',
            en: 'Dark high contrast theme',
            es: 'Tema oscuro de alto contraste',
            it: 'Tema scuro ad alto contrasto',
            pt: 'Tema escuro de alto contraste',
            de: 'Dunkles Hochkontrastthema'
          },
          children: [
            { children: ['hcDark', 'hcDarkColors'], cols: { sm: 7, lg: 9 } },
            { name: 'colors-preview', cols: { sm: 5, lg: 3 }, props: { colorsKey: 'hcDarkColors', dark: true } }
          ]
        }]
      }
    ]
  },
  properties: {
    logo: {
      title: "URL d'un logo",
      'x-i18n-title': {
        fr: "URL d'un logo",
        en: 'Logo URL',
        es: 'URL del logo',
        it: 'URL del logo',
        pt: 'URL do logotipo',
        de: 'Logo-URL'
      },
      type: 'string'
    },
    bodyFontFamily: {
      title: 'Nom de police de caractères pour le corps du texte',
      'x-i18n-title': {
        fr: 'Nom de police de caractères pour le corps du texte',
        en: 'Font name for body text',
        es: 'Nombre de fuente para el texto del cuerpo',
        it: 'Nome del carattere per il testo del corpo',
        pt: 'Nome da fonte para o texto do corpo',
        de: 'Schriftartname für den Fließtext'
      },
      description: 'Par défaut une police Nunito auto-hébergée est utilisée',
      'x-i18n-description': {
        fr: 'Par défaut une police Nunito auto-hébergée est utilisée',
        en: 'By default, a self-hosted Nunito font is used',
        es: 'Por defecto se utiliza una fuente Nunito autoalojada',
        it: 'Per impostazione predefinita viene utilizzata una fonte Nunito auto-ospitata',
        pt: 'Por padrão, é usada uma fonte Nunito auto-hospedada',
        de: 'Standardmäßig wird eine selbst gehostete Nunito-Schriftart verwendet'
      },
      type: 'string'
    },
    bodyFontFamilyCss: {
      title: 'CSS police de caractères pour le corps du texte',
      'x-i18n-title': {
        fr: 'CSS police de caractères pour le corps du texte',
        en: 'CSS font for body text',
        es: 'CSS fuente para el texto del cuerpo',
        it: 'CSS carattere per il testo del corpo',
        pt: 'CSS fonte para o texto do corpo',
        de: 'CSS-Schriftart für den Fließtext'
      },
      layout: {
        comp: 'textarea',
        rows: 3
      },
      description: 'Vous pouvez copier le CSS proposé par une plateforme comme Google Fonts.',
      'x-i18n-description': {
        fr: 'Vous pouvez copier le CSS proposé par une plateforme comme Google Fonts.',
        en: 'You can copy the CSS proposed by a platform like Google Fonts.',
        es: 'Puede copiar el CSS propuesto por una plataforma como Google Fonts.',
        it: 'Puoi copiare il CSS proposto da una piattaforma come Google Fonts.',
        pt: 'Você pode copiar o CSS proposto por uma plataforma como Google Fonts.',
        de: 'Sie können das von einer Plattform wie Google Fonts vorgeschlagene CSS kopieren.'
      },
      type: 'string'
    },
    headingFontFamily: {
      title: 'Nom de police de caractères pour les titres',
      'x-i18n-title': {
        fr: 'Nom de police de caractères pour les titres',
        en: 'Font name for headings',
        es: 'Nombre de fuente para los títulos',
        it: 'Nome del carattere per le intestazioni',
        pt: 'Nome da fonte para títulos',
        de: 'Schriftartname für Überschriften'
      },
      description: 'Renseignez de la même manière que pour le corps de texte, ou laissez vide pour utiliser la police du corps du texte',
      'x-i18n-description': {
        fr: 'Renseignez de la même manière que pour le corps de texte, ou laissez vide pour utiliser la police du corps du texte',
        en: 'Fill in the same way as for the body text, or leave blank to use the body text font',
        es: 'Complete de la misma manera que para el texto del cuerpo, o deje en blanco para usar la fuente del texto del cuerpo',
        it: 'Compilare nello stesso modo del testo del corpo, o lasciare vuoto per utilizzare il carattere del testo del corpo',
        pt: 'Preencha da mesma forma que para o texto do corpo, ou deixe em branco para usar a fonte do texto do corpo',
        de: 'Füllen Sie wie beim Fließtext aus, oder lassen Sie das Feld leer, um die Schriftart des Fließtexts zu verwenden'
      },
      type: 'string'
    },
    headingFontFamilyCss: {
      title: 'CSS police de caractères pour les titres',
      'x-i18n-title': {
        fr: 'CSS police de caractères pour les titres',
        en: 'CSS font for headings',
        es: 'CSS fuente para los títulos',
        it: 'CSS carattere per le intestazioni',
        pt: 'CSS fonte para títulos',
        de: 'CSS-Schriftart für Überschriften'
      },
      layout: {
        comp: 'textarea',
        rows: 3
      },
      type: 'string'
    },
    assistedMode: {
      type: 'boolean',
      title: 'mode de gestion des couleurs simplifié',
      'x-i18n-title': {
        fr: 'mode de gestion des couleurs simplifié',
        en: 'simplified color management mode',
        es: 'modo de gestión de colores simplificado',
        it: 'modalità di gestione semplificata dei colori',
        pt: 'modo de gerenciamento simplificado de cores',
        de: 'vereinfachteter Farbverwaltungsmodus'
      },
      description: "Si activé vous ne devrez saisir que les couleurs principales du thème, d'autres couleurs seront affectées par défaut et les couleurs de texte seront automatiquement ajustées pour être lisibles sur les couleurs de fond.",
      'x-i18n-description': {
        fr: "Si activé vous ne devrez saisir que les couleurs principales du thème, d'autres couleurs seront affectées par défaut et les couleurs de texte seront automatiquement ajustées pour être lisibles sur les couleurs de fond.",
        en: 'If enabled, you will only need to enter the main theme colors, other colors will be assigned by default and text colors will be automatically adjusted to be readable on the background colors.',
        es: 'Si está activado, solo deberá ingresar los colores principales del tema, otros colores se asignarán por defecto y los colores de texto se ajustarán automáticamente para ser legibles en los colores de fondo.',
        it: 'Se abilitato, dovrai inserire solo i colori principali del tema, gli altri colori verranno assegnati per impostazione predefinita e i colori del testo verranno automaticamente regolati per essere leggibili sui colori di sfondo.',
        pt: 'Se ativado, você só precisará inserir as cores principais do tema, outras cores serão atribuídas por padrão e as cores do texto serão ajustadas automaticamente para serem legíveis nas cores de fundo.',
        de: 'Wenn aktiviert, müssen Sie nur die Hauptthemenfarben eingeben. Andere Farben werden standardmäßig zugewiesen und die Textfarben werden automatisch angepasst, um lesbar auf den Hintergrundfarben zu sein.'
      },
      default: true
    },
    assistedModeColors: {
      type: 'object',
      properties: {
        primary: {
          type: 'string',
          title: 'Couleur principale',
          'x-i18n-title': {
            fr: 'Couleur principale',
            en: 'Primary color',
            es: 'Color principal',
            it: 'Colore principale',
            pt: 'Cor principal',
            de: 'Primärfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        },
        secondary: {
          type: 'string',
          title: 'Couleur secondaire',
          'x-i18n-title': {
            fr: 'Couleur secondaire',
            en: 'Secondary color',
            es: 'Color secundario',
            it: 'Colore secondario',
            pt: 'Cor secundário',
            de: 'Sekundärfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        },
        accent: {
          type: 'string',
          title: 'Couleur accentuée',
          'x-i18n-title': {
            fr: 'Couleur accentuée',
            en: 'Accent color',
            es: 'Color de acento',
            it: 'Colore di accento',
            pt: 'Cor de destaque',
            de: 'Akzentfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        }
      }
    },
    colors: { $ref: '#/$defs/colors' },
    dark: {
      type: 'boolean',
      title: 'proposer ce thème aux utilisateurs',
      'x-i18n-title': {
        fr: 'proposer ce thème aux utilisateurs',
        en: 'offer this theme to users',
        es: 'ofrecer este tema a los usuarios',
        it: 'offri questo tema agli utenti',
        pt: 'oferecer este tema aos usuários',
        de: 'bieten Sie dieses Thema den Benutzern an'
      }
    },
    darkColors: { $ref: '#/$defs/colors' },
    hc: {
      type: 'boolean',
      title: 'proposer ce thème aux utilisateurs',
      'x-i18n-title': {
        fr: 'proposer ce thème aux utilisateurs',
        en: 'offer this theme to users',
        es: 'ofrecer este tema a los usuarios',
        it: 'offri questo tema agli utenti',
        pt: 'oferecer este tema aos usuários',
        de: 'bieten Sie dieses Thema den Benutzern an'
      }
    },
    hcColors: { $ref: '#/$defs/colors' },
    hcDark: {
      type: 'boolean',
      title: 'proposer ce thème aux utilisateurs',
      'x-i18n-title': {
        fr: 'proposer ce thème aux utilisateurs',
        en: 'offer this theme to users',
        es: 'ofrecer este tema a los usuarios',
        it: 'offri questo tema agli utenti',
        pt: 'oferecer este tema aos usuários',
        de: 'bieten Sie dieses Thema den Benutzern an'
      }
    },
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
          'x-i18n-title': {
            fr: 'Couleur de fond',
            en: 'Background color',
            es: 'Color de fondo',
            it: 'Colore di sfondo',
            pt: 'Cor de fundo',
            de: 'Hintergrundfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 3 }
          }
        },
        'on-background': {
          type: 'string',
          title: 'Couleur de texte sur couleur de fond',
          'x-i18n-title': {
            fr: 'Couleur de texte sur couleur de fond',
            en: 'Text color on background color',
            es: 'Color de texto sobre color de fondo',
            it: 'Colore del testo sul colore di sfondo',
            pt: 'Cor do texto na cor de fundo',
            de: 'Textfarbe auf Hintergrundfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 3 }
          }
        },
        surface: {
          type: 'string',
          title: 'Couleur des surfaces (vignettes, listes, etc)',
          'x-i18n-title': {
            fr: 'Couleur des surfaces (vignettes, listes, etc)',
            en: 'Surface color (tiles, lists, etc)',
            es: 'Color de las superficies (vignetas, listas, etc)',
            it: 'Colore delle superfici (tile, elenchi, ecc.)',
            pt: 'Cor das superfícies (vignetas, listas, etc)',
            de: 'Oberflächenfarbe (Kacheln, Listen, etc.)'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 3 }
          }
        },
        'on-surface': {
          type: 'string',
          title: 'Couleur de texte sur couleur des surfaces',
          'x-i18n-title': {
            fr: 'Couleur de texte sur couleur des surfaces',
            en: 'Text color on surface color',
            es: 'Color de texto sobre color de superficie',
            it: 'Colore del testo sul colore della superficie',
            pt: 'Cor do texto na cor da superfície',
            de: 'Textfarbe auf Oberflächenfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 3 }
          }
        },
        'surface-inverse': {
          type: 'string',
          title: 'Couleur des surfaces avec contraste inversé',
          'x-i18n-title': {
            fr: 'Couleur des surfaces avec contraste inversé',
            en: 'Surface color with inverted contrast',
            es: 'Color de las superficies con contraste invertido',
            it: 'Colore delle superfici con contrasto invertito',
            pt: 'Cor das superfícies com contraste invertido',
            de: 'Oberflächenfarbe mit invertiertem Kontrast'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 3 }
          }
        },
        'on-surface-inverse': {
          type: 'string',
          title: 'Couleur de texte sur couleur des surfaces avec contraste inversé',
          'x-i18n-title': {
            fr: 'Couleur de texte sur couleur des surfaces avec contraste inversé',
            en: 'Text color on surface color with inverted contrast',
            es: 'Color de texto sobre color de superficie con contraste invertido',
            it: 'Colore del testo sul colore della superficie con contrasto invertito',
            pt: 'Cor do texto na cor da superfície com contraste invertido',
            de: 'Textfarbe auf Oberflächenfarbe mit invertiertem Kontrast'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 3 }
          }
        },
        primary: {
          type: 'string',
          title: 'Couleur principale',
          'x-i18n-title': {
            fr: 'Couleur principale',
            en: 'Primary color',
            es: 'Color principal',
            it: 'Colore principale',
            pt: 'Cor principal',
            de: 'Primärfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        },
        'on-primary': {
          type: 'string',
          title: 'Couleur de texte sur couleur principale',
          'x-i18n-title': {
            fr: 'Couleur de texte sur couleur principale',
            en: 'Text color on primary color',
            es: 'Color de texto sobre color principal',
            it: 'Colore del testo sul colore principale',
            pt: 'Cor do texto na cor principal',
            de: 'Textfarbe auf Primärfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 }
          }
        },
        'text-primary': {
          type: 'string',
          title: 'Couleur de texte principal',
          'x-i18n-title': {
            fr: 'Couleur de texte principal',
            en: 'Primary text color',
            es: 'Color de texto principal',
            it: 'Colore del testo principale',
            pt: 'Cor do texto principal',
            de: 'Primäre Textfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 },
            hint: 'laissez vide pour utiliser la couleur principale',
            'x-i18n-hint': {
              fr: 'laissez vide pour utiliser la couleur principale',
              en: 'leave empty to use the primary color',
              es: 'deje en blanco para usar el color principal',
              it: 'lasciare vuoto per usare il colore principale',
              pt: 'deixe em branco para usar a cor principal',
              de: 'leer lassen, um die Primärfarbe zu verwenden'
            }
          }
        },
        secondary: {
          type: 'string',
          title: 'Couleur secondaire',
          'x-i18n-title': {
            fr: 'Couleur secondaire',
            en: 'Secondary color',
            es: 'Color secundario',
            it: 'Colore secondario',
            pt: 'Cor secundário',
            de: 'Sekundärfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        },
        'on-secondary': {
          type: 'string',
          title: 'Couleur de texte sur couleur secondaire',
          'x-i18n-title': {
            fr: 'Couleur de texte sur couleur secondaire',
            en: 'Text color on secondary color',
            es: 'Color de texto sobre color secundario',
            it: 'Colore del testo sul colore secondario',
            pt: 'Cor do texto na cor secundária',
            de: 'Textfarbe auf Sekundärfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 }
          }
        },
        'text-secondary': {
          type: 'string',
          title: 'Couleur de texte secondaire',
          'x-i18n-title': {
            fr: 'Couleur de texte secondaire',
            en: 'Secondary text color',
            es: 'Color de texto secundario',
            it: 'Colore del testo secondario',
            pt: 'Cor do texto secundário',
            de: 'Sekundäre Textfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 },
            hint: 'laissez vide pour utiliser la couleur secondaire',
            'x-i18n-hint': {
              fr: 'laissez vide pour utiliser la couleur secondaire',
              en: 'leave empty to use the secondary color',
              es: 'deje en blanco para usar el color secundario',
              it: 'lasciare vuoto per usare il colore secondario',
              pt: 'deixe em branco para usar a cor secundária',
              de: 'leer lassen, um die Sekundärfarbe zu verwenden'
            }
          }
        },
        accent: {
          type: 'string',
          title: 'Couleur accentuée',
          'x-i18n-title': {
            fr: 'Couleur accentuée',
            en: 'Accent color',
            es: 'Color de acento',
            it: 'Colore di accento',
            pt: 'Cor de destaque',
            de: 'Akzentfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        },
        'on-accent': {
          type: 'string',
          title: 'Couleur de texte sur couleur accentuée',
          'x-i18n-title': {
            fr: 'Couleur de texte sur couleur accentuée',
            en: 'Text color on accent color',
            es: 'Color de texto sobre color de acento',
            it: 'Colore del testo sul colore di accento',
            pt: 'Cor do texto na cor de destaque',
            de: 'Textfarbe auf Akzentfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 }
          }
        },
        'text-accent': {
          type: 'string',
          title: 'Couleur de texte accentué',
          'x-i18n-title': {
            fr: 'Couleur de texte accentué',
            en: 'Accent text color',
            es: 'Color de texto de acento',
            it: 'Colore del testo di accento',
            pt: 'Cor do texto de destaque',
            de: 'Akzenttextfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 },
            hint: 'laissez vide pour utiliser la couleur accentuée',
            'x-i18n-hint': {
              fr: 'laissez vide pour utiliser la couleur accentuée',
              en: 'leave empty to use the accent color',
              es: 'deje en blanco para usar el color de acento',
              it: 'lasciare vuoto per usare il colore di accento',
              pt: 'deixe em branco para usar a cor de destaque',
              de: 'leer lassen, um die Akzentfarbe zu verwenden'
            }
          }
        },
        info: {
          type: 'string',
          title: 'Couleur info',
          'x-i18n-title': {
            fr: 'Couleur info',
            en: 'Info color',
            es: 'Color de información',
            it: 'Colore info',
            pt: 'Cor de informação',
            de: 'Info-Farbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        },
        'on-info': {
          type: 'string',
          title: 'Couleur de texte sur couleur info',
          'x-i18n-title': {
            fr: 'Couleur de texte sur couleur info',
            en: 'Text color on info color',
            es: 'Color de texto sobre color de información',
            it: 'Colore del testo sul colore info',
            pt: 'Cor do texto na cor de informação',
            de: 'Textfarbe auf Info-Farbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 }
          }
        },
        'text-info': {
          type: 'string',
          title: 'Couleur de texte info',
          'x-i18n-title': {
            fr: 'Couleur de texte info',
            en: 'Info text color',
            es: 'Color de texto de información',
            it: 'Colore del testo info',
            pt: 'Cor do texto de informação',
            de: 'Info-Textfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 },
            hint: 'laissez vide pour utiliser la couleur info',
            'x-i18n-hint': {
              fr: 'laissez vide pour utiliser la couleur info',
              en: 'leave empty to use the info color',
              es: 'deje en blanco para usar el color de información',
              it: 'lasciare vuoto per usare il colore info',
              pt: 'deixe em branco para usar a cor de informação',
              de: 'leer lassen, um die Info-Farbe zu verwenden'
            }
          }
        },
        success: {
          type: 'string',
          title: 'Couleur succès',
          'x-i18n-title': {
            fr: 'Couleur succès',
            en: 'Success color',
            es: 'Color de éxito',
            it: 'Colore successo',
            pt: 'Cor de sucesso',
            de: 'Erfolgsfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        },
        'on-success': {
          type: 'string',
          title: 'Couleur succès',
          'x-i18n-title': {
            fr: 'Couleur succès',
            en: 'Success color',
            es: 'Color de éxito',
            it: 'Colore successo',
            pt: 'Cor de sucesso',
            de: 'Erfolgsfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 }
          }
        },
        'text-success': {
          type: 'string',
          title: 'Couleur de texte succès',
          'x-i18n-title': {
            fr: 'Couleur de texte succès',
            en: 'Success text color',
            es: 'Color de texto de éxito',
            it: 'Colore del testo successo',
            pt: 'Cor do texto de sucesso',
            de: 'Erfolgs-Textfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 },
            hint: 'laissez vide pour utiliser la couleur succès',
            'x-i18n-hint': {
              fr: 'laissez vide pour utiliser la couleur succès',
              en: 'leave empty to use the success color',
              es: 'deje en blanco para usar el color de éxito',
              it: 'lasciare vuoto per usare il colore successo',
              pt: 'deixe em branco para usar a cor de sucesso',
              de: 'leer lassen, um die Erfolgsfarbe zu verwenden'
            }
          }
        },
        error: {
          type: 'string',
          title: 'Couleur erreur',
          'x-i18n-title': {
            fr: 'Couleur erreur',
            en: 'Error color',
            es: 'Color de error',
            it: 'Colore errore',
            pt: 'Cor de erro',
            de: 'Fehlerfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        },
        'on-error': {
          type: 'string',
          title: 'Couleur de texte sur couleur erreur',
          'x-i18n-title': {
            fr: 'Couleur de texte sur couleur erreur',
            en: 'Text color on error color',
            es: 'Color de texto sobre color de error',
            it: 'Colore del testo sul colore errore',
            pt: 'Cor do texto na cor de erro',
            de: 'Textfarbe auf Fehlerfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 }
          }
        },
        'text-error': {
          type: 'string',
          title: 'Couleur de texte erreur',
          'x-i18n-title': {
            fr: 'Couleur de texte erreur',
            en: 'Error text color',
            es: 'Color de texto de error',
            it: 'Colore del testo errore',
            pt: 'Cor do texto de erro',
            de: 'Fehler-Textfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 },
            hint: 'laissez vide pour utiliser la couleur erreur',
            'x-i18n-hint': {
              fr: 'laissez vide pour utiliser la couleur erreur',
              en: 'leave empty to use the error color',
              es: 'deje en blanco para usar el color de error',
              it: 'lasciare vuoto per usare il colore errore',
              pt: 'deixe em branco para usar a cor de erro',
              de: 'leer lassen, um die Fehlerfarbe zu verwenden'
            }
          }
        },
        warning: {
          type: 'string',
          title: 'Couleur avertissement',
          'x-i18n-title': {
            fr: 'Couleur avertissement',
            en: 'Warning color',
            es: 'Color de advertencia',
            it: 'Colore avvertimento',
            pt: 'Cor de aviso',
            de: 'Warnfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 12, lg: 4 }
          }
        },
        'on-warning': {
          type: 'string',
          title: 'Couleur de texte sur avertissement',
          'x-i18n-title': {
            fr: 'Couleur de texte sur avertissement',
            en: 'Text color on warning color',
            es: 'Color de texto sobre color de advertencia',
            it: 'Colore del testo sul colore avvertimento',
            pt: 'Cor do texto na cor de aviso',
            de: 'Textfarbe auf Warnfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 }
          }
        },
        'text-warning': {
          type: 'string',
          title: 'Couleur de texte avertissement',
          'x-i18n-title': {
            fr: 'Couleur de texte avertissement',
            en: 'Warning text color',
            es: 'Color de texto de advertencia',
            it: 'Colore del testo avvertimento',
            pt: 'Cor do texto de aviso',
            de: 'Warn-Textfarbe'
          },
          layout: {
            comp: 'color-picker',
            cols: { sm: 6, lg: 4 },
            hint: 'laissez vide pour utiliser la couleur avertissement',
            'x-i18n-hint': {
              fr: 'laissez vide pour utiliser la couleur avertissement',
              en: 'leave empty to use the warning color',
              es: 'deje en blanco para usar el color de advertencia',
              it: 'lasciare vuoto per usare il colore avvertimento',
              pt: 'deixe em branco para usar a cor de aviso',
              de: 'leer lassen, um die Warnfarbe zu verwenden'
            }
          }
        },
        admin: { type: 'string', layout: 'none' },
        'on-admin': { type: 'string', layout: 'none' },
        'text-admin': { type: 'string', layout: 'none' }
      }
    }
  }
}
