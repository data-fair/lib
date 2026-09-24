# Fichiers de configuration racine — contenus complets

Ces fichiers ne se devinent pas et se recopient mal : reprendre celui d'une application maintenue au hasard fait hériter de ses divergences. Les pièges principaux sont résumés dans le SKILL.md ; ce fichier porte les contenus intégraux à copier.

> **Statut** : ce boilerplate est la **cible**, définie sur `bar-chart-race` (le pilote) en s'inspirant des services `data-fair` / `catalogs` / `processings`. Ce n'est **pas** l'état du parc — l'écart réel est signalé section par section (« État du parc »). Sur un nouveau projet, appliquer la cible telle quelle ; sur une reprise, migrer vers la cible.

## package.json — dépendances et version

> **⚠️ Champ `version` : ne jamais modifier ni bumper la version de l'application.** Les agents ne doivent absolument jamais, en aucun cas, modifier le numéro de version dans `package.json`. La gestion des versions (semver, releases, tags git) est strictement réservée aux mainteneurs humains et aux pipelines de publication. Lors d'une création, migration ou refonte, conserver la version existante sans y toucher.

**Les peerDependencies de `@data-fair/lib-vue` doivent être déclarées explicitement.** La lib les déclare en `peerDependencies` et ne les installe donc pas :

```
@vueuse/core >=10 · dayjs 1 · ofetch 1 · reconnecting-websocket 4 · vue 3 · vue-router 4||5
```

`dayjs` est le piège courant : il n'est jamais importé directement (on passe par `createLocaleDayjs` / `useLocaleDayjs`), donc son absence ne se voit ni au `type-check` ni au build tant que npm l'a hissé depuis une dépendance transitive — puis casse ailleurs. Les applications de référence la déclarent toutes. Ne déclarer que les peers réellement utilisées (`reconnecting-websocket` et `vue-router` ne servent qu'aux apps qui font du WS ou du routage).

**Scripts** : cf. « Scripts obligatoires » du SKILL.md. Deux précisions :

- `"dev": "df-dev-env && dotenv -- zellij --layout .zellij.kdl"` **suppose que `.zellij.kdl` existe** — sans lui le script échoue. 24 applications du parc l'ont ; c'est la convention, pas une option. `df-dev-env` génère le `.env` au premier lancement (cf. « Ports de développement »), `dotenv --` le rend visible de tous les panes. Ni `dev-app` ni `dev-server` ne portent plus de variable en préfixe : `vite` lit le `.env` par `loadEnv`, `df-dev-server` par `dotenv`.
- `build-types` doit tourner **avant** `type-check` et `build` sur un clone neuf : `src/config/.type/` est git-ignoré et `src/config/index.ts` le réexporte. Ordonner la CI en conséquence (`build-types` → `lint` → `type-check` → `build`) — le `"build": "vite build"` nu ne le garantit pas seul.
- **Scripts de test au tiret comme les services** : `test` / `test-unit` / `test-e2e` (`playwright test --max-failures=1`, `--project unit` / `--project e2e`). La plupart des apps legacy utilisent encore la variante `test:e2e` / `test:unit` (deux-points) — adopter la forme tiret en reprise. Pas de variante `--ui` en script : le flag se passe à la volée (`npm run test-e2e -- --ui`). `test` et `test-e2e` sont préfixés de `df-dev-env && dotenv --` (ils ont besoin d'`E2E_PORT`) ; `test-unit` ne lance pas de `webServer` et n'a besoin d'aucun port.
- **État du parc** : `quality`, `lint-fix` et `lint` sans `--fix` n'existent que dans bar-chart-race. **Toutes les autres apps ont `"lint": "eslint . --fix"`** — un `lint` qui réécrit les fichiers, y compris dans un hook pre-commit : à scinder en `lint`/`lint-fix` dès qu'on touche au dépôt.

## Husky, commitlint et `npm run quality`

Comme les services (`data-fair`, `portals`, `catalogs`, `processings`) et les plugins, une application installe **husky + commitlint** et fait passer la qualité au push. Ne pas faire tourner les e2e en CI : le hook pre-push les a déjà lancés sur la machine du dev (cf. le commentaire `commits.yml` des services : *« husky already did it on the dev computer »*).

**État du parc** : seule bar-chart-race a un `.husky/` ; `infos-territoires` a `"prepare": "husky"` mais aucun dossier `.husky/`. Le setup husky d'une app en reprise est donc presque toujours à faire entièrement.

**devDependencies** — `husky ^9.1.7` est la seule version commune à tout l'écosystème ; pour commitlint, s'aligner sur bar-chart-race et les plugins :

```
husky ^9.1.7 · @commitlint/cli ^19.8 · @commitlint/config-conventional ^19.8
```

(Les services sont hétérogènes : `^20.5` chez catalogs/processings/portals — certains sans `@commitlint/cli` explicite, le `npx --no-install` du hook le résolvant en transitif. Ne pas les imiter là-dessus : déclarer les deux paquets.)

**Scripts** : `"prepare": "husky || true"` (le `|| true` évite qu'un `npm install` sans dépôt git — archive, CI — ne casse) et `"quality"` (cf. « Scripts obligatoires »). Le `lint` n'a **pas** de `--fix` : c'est `lint-fix` qui le porte, comme dans les services.

**Fichiers `.husky/`** (le répertoire `.husky/_` est auto-généré et git-ignoré par husky v9) :

```
.husky/pre-commit → npm run lint
.husky/commit-msg → npx --no-install commitlint --edit ""
.husky/pre-push   → npm run quality
```

(Chez les plugins processings, `pre-push` lance `npm run test` — ils n'ont pas de script `quality`.)

**Config commitlint : un fichier `commitlint.config.ts`**, comme les services et les plugins :

```ts
export default { extends: ['@commitlint/config-conventional'] }
```

C'est la convention de tout l'écosystème (et la seule forme qui accueille proprement des règles custom, cf. portals : `scope-enum`, `scope-empty`). Une clé `commitlint` dans `package.json` fonctionne aussi (cosmiconfig) mais n'est pas la convention — la migrer vers le fichier si on en croise une. Sans configuration du tout, commitlint refuse tous les messages (`Please add rules to your commitlint.config.js [empty-rules]`).

> **⚠️ Pourquoi `pre-commit` exécute `npm run lint` sans `--fix`** : un `--fix` dans le hook réécrirait les fichiers au moment du commit (modifications non stagées, surprises). D'où le couple `lint` (signale) / `lint-fix` (réécrit), identique aux services.

## .nvmrc

**Obligatoire dès que `.zellij.kdl` existe** : chaque pane lance `nvm use` (sans argument) avant la vraie commande. Sans `.nvmrc` à la racine, `nvm use` échoue avec `No .nvmrc file found` et sort en code 127 — le `&&` court-circuite, la vraie commande (`npm run dev-app` / `dev-server`) ne démarre jamais, et comme le pane redirige `nvm use` vers `/dev/null 2>&1`, l'erreur reste invisible : le pane affiche juste `[ EXIT CODE: 127 ]` sans message. C'est l'oubli le plus facile à faire en générant les fichiers racine d'un nouveau projet — le vérifier systématiquement.

**Version majeure seule** pour les applications :

```
24
```

**État du parc** : 18 apps sur 25 sont à `24` ; traînent encore un `18`, un `21`, un `22`, un `v14.17.1`, et 5 apps sans `.nvmrc`. Côté services, `catalogs` et `processings` sont à `24` mais `data-fair` (`24.9`) et `portals` (`24.11.1`) épinglent une mineure — pour une app, rester à la majeure seule.

## Ports de développement — le `.env`

Une application tient trois ports en développement. Tant qu'ils sont en dur (3000 pour Vite, 5888 pour `df-dev-server`), **une seule application tourne à la fois** — c'était le cas des 37 apps du parc avant `@data-fair/dev-server` 2.5.0.

`df-dev-env`, bin du paquet, génère un `.env` **git-ignoré** portant trois ports libres consécutifs tirés dans 20000–29999 :

```
# généré par df-dev-env — ne pas commiter
APP_PORT=24730
DEV_SERVER_PORT=24731
E2E_PORT=24732
APP_PATH=/app/
```

Plage choisie sous le range éphémère du noyau (32768–60999, où un port peut déjà être tenu par une connexion sortante) et au-dessus du bloc `191xx` du docker compose de `data-fair`. Le générateur vérifie que les trois ports bindent avant d'écrire ; en cas de collision malgré tout, `df-dev-env --force` tire un nouveau triplet — en conservant l'`APP_PATH` du fichier remplacé, pour que le remède à une collision de ports ne replace pas en silence sous `/app/` une application servie à la racine. Un `--app-path` explicite prime sur la valeur conservée.

Le fichier est généré **une fois**, au premier `npm run dev`, puis laissé tel quel : le port doit rester stable (favoris, onglets, `webServer` Playwright).

**Trois consommateurs, trois mécanismes de chargement — c'est le piège principal :**

| Consommateur | Mécanisme |
|---|---|
| `df-dev-server` | `import 'dotenv/config'`, intégré au paquet, rien à faire |
| `vite.config.ts` | `loadEnv(mode, process.cwd(), '')` — **Vite ne peuple pas `process.env` depuis un `.env`**, un `process.env.APP_PORT` ne verrait jamais le fichier |
| scripts npm (zellij, Playwright) | `dotenv -- <cmd>`, devDependency `dotenv-cli` |

> **⚠️ `dotenv --` devant `zellij` n'est pas optionnel.** Dans un layout zellij chaque pane est un process fils : sans lui, `$DEV_SERVER_PORT` est vide dans tous les panes et le bandeau d'URL affiche `http://localhost:`. C'est exactement ce que fait `data-fair` (`"dev-zellij": "dotenv -- zellij --layout .zellij.kdl"`).

> **⚠️ `E2E_PORT` doit rester distinct de `APP_PORT`.** Avec `reuseExistingServer: !process.env.CI`, un Playwright pointant sur `APP_PORT` accroche le Vite de développement déjà lancé — lequel n'a pas `DATA_FAIR_TEST=true`, donc `%APPLICATION%` n'est pas substitué et les e2e échouent sans indiquer pourquoi.

`APP_PATH` n'est pas un port mais suit le précédent de `DEV_HOST` dans le `.env` généré de `data-fair` : `df-dev-server` en dérive son `app.url` (`http://localhost:$APP_PORT$APP_PATH`), ce qui rend impossible la désynchronisation entre le port de Vite et celui de l'URL proxifiée. `APP_URL` reste prioritaire pour une app qui n'est pas servie sur `localhost` (les apps nuxt, `carto-stats`).

### Migrer une application existante

27 des 37 applications du parc sont encore sur la convention en dur (3000 / 5888) et passeront par là une à une. Dans l'ordre :

1. `npm i -D @data-fair/dev-server@^2.5.0 dotenv-cli`
2. **`package.json`** : `"dev": "df-dev-env && dotenv -- zellij --layout .zellij.kdl"` ; `"dev-server": "df-dev-server"` — **retirer le préfixe `APP_URL=http://localhost:3000/app/`** ; `"dev-app": "vite"`, nu comme `dev-server` ; `"test"` et `"test-e2e"` gagnent le préfixe `df-dev-env && dotenv --` ; `"test-unit"` ne change pas, il ne lance aucun `webServer` et n'a donc besoin d'aucun port.
3. **`vite.config`** : passer à la forme factory `loadEnv`, avec `hmr.port` aligné sur `server.port` — code exact au § « vite.config.ts » ci-dessus, ne pas le reproduire ici.
4. **`playwright.config.ts`** : lire `E2E_PORT`, passer `APP_PORT` par `webServer.env` — code exact au § « Tests — Playwright » ci-dessus.
5. Supprimer `tests/helpers/port.ts` et la ligne `tests/.test-port` du `.gitignore` : le port vient désormais du `.env`.
6. **`.gitignore`** : ajouter `.env` et `.dev-config.json`, **puis** `git rm --cached .dev-config.json` — une ligne de `.gitignore` n'a aucun effet sur un fichier déjà suivi. 27 applications du parc suivent `.dev-config.json` aujourd'hui, dont 8 qui l'ont pourtant déjà dans leur `.gitignore`.
7. **`.zellij.kdl`** : ajouter le bandeau d'URL en dernière ligne (§ « .zellij.kdl » ci-dessous).

**Trois pièges** :

> **⚠️ Une application qui a déjà un `.env`.** `df-dev-env` est idempotent : s'il trouve un `.env`, il ne le réécrit pas. Une application qui porte déjà un `.env` pour une tout autre raison ne reçoit donc **aucun port** — le cas se rencontre avec un `.env` qui ne sert qu'à figer un `PUBLIC_URL`. Depuis 2.5.0 le générateur ne se tait plus dessus : il relit le fichier et avertit quand `APP_PORT` en est absent. Correction : ajouter les trois lignes de port à la main, ou lancer `df-dev-env --force` puis recoller le contenu préexistant par-dessus.

> **⚠️ Une application servie à la racine plutôt que sous `/app/`.** Depuis dev-server 2.5.0, `APP_PATH` **vaut `/app/` par défaut** (il valait la chaîne vide avant) — un défaut utile puisque 27 des 37 applications sont des apps Vite servies sous `/app/`, et c'est ce qui fait fonctionner un clone neuf avant même qu'on ait lancé `df-dev-env`. Une application servie à la racine doit donc déclarer `APP_PATH=` explicitement — chaîne vide, non nullish, donc bien conservée. En pratique son script `dev` appelle `df-dev-env --app-path=` : le flag n'agit qu'à la génération, et `--force` conserve ensuite la valeur. Passer un `--app-path` qui contredit un `.env` déjà écrit ne le réécrit pas non plus — le générateur le dit, plutôt que de laisser l'application démarrer sur le mauvais chemin. C'est une **rupture volontaire**, posée à la montée de version : elle touche toute application qui appelle `df-dev-server` sans son propre `APP_URL` et qui n'est pas servie sous `/app/` — typiquement une app Nuxt, dont la racine sert directement l'application. Une application qui garde son propre `APP_URL` n'est pas concernée — `APP_URL` prime toujours.

> **⚠️ Retirer le préfixe `APP_URL=…/app/` du script `dev-server` n'est sûr qu'une fois le `.env` en place.** C'est le défaut `/app/` ci-dessus qui rend l'opération sûre sur un clone neuf ; sans lui le proxy viserait silencieusement la racine de Vite pendant que Vite sert sous `/app/`, et l'application ne chargerait tout simplement pas, sans aucune erreur.

## .zellij.kdl

Trois panes : un shell libre, `dev-app` (Vite) et `dev-server` (`df-dev-server`). Le `nvm use` de chaque pane aligne la version de Node — d'où la dépendance stricte au `.nvmrc` ci-dessus. 24 apps du parc ont ce fichier, 22 au motif exact (exceptions : `app-humidex` et `carto-explore` sans `nvm use`, `app-timelines` sur un vieux layout). Les services ont un layout plus riche (panes `ui`/`api`/`worker`/`deps`) qui ne s'applique pas aux apps, mais leur **bandeau d'URL en dernière ligne**, lui, est repris : depuis que le port est généré, il n'est plus mémorisable. Il exige le `dotenv --` du script `dev` (cf. « Ports de développement »).

```kdl
layout {
    pane {
      split_direction "vertical"
      pane name="MonApp" borderless=true {
        command "bash"
        args "-ic" "nvm use > /dev/null 2>&1 && bash"
      }
    }
    pane {
      split_direction "vertical"
      pane name="app" {
        command "bash"
        args "-ic" "nvm use > /dev/null 2>&1 && npm run dev-app"
      }
      pane name="dev-server" {
        command "bash"
        args "-ic" "nvm use > /dev/null 2>&1 && npm run dev-server"
      }
    }
    pane size=1 borderless=true {
        command "bash"
        args "-ic" "echo -n -e \"Dev server available at \\e[1;96mhttp://localhost:$DEV_SERVER_PORT\\033[0m\""
    }
}
```

## eslint.config.js

Ne pas s'aligner sur les applications : 11 apps sur 25 sont encore en `.eslintrc` legacy, et plusieurs configs flat n'utilisent que `tseslint.configs.recommended` + `eslint-plugin-vue`, deux presets qui ne portent **aucune règle de formatage**. Un dépôt ainsi configuré n'impose ni indentation, ni quotes, ni point-virgule sur ses `.ts` — le style ne tient plus qu'aux réglages d'éditeur de chacun. La cible ci-dessous est celle de `bar-chart-race`, calquée sur `data-fair/ui`.

```js
import neostandard from 'neostandard'
import pluginVue from 'eslint-plugin-vue'
import pluginVuetify from 'eslint-plugin-vuetify'
import dfLibRecommended from '@data-fair/lib-utils/eslint/recommended.js'

// le flat/base de eslint-plugin-vuetify enregistre déjà le plugin `vue`, et
// ESLint 9.39+ refuse qu'un plugin soit redéfini — retirer `plugins` de la config de vue.
const vueFlatRecommended = pluginVue.configs['flat/recommended'].map(({ plugins, ...rest }) => rest)

export default [
  ...dfLibRecommended,
  ...vueFlatRecommended,
  ...pluginVuetify.configs['flat/recommended'],
  ...neostandard({ ts: true, env: ['browser'] }),
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'no-undef': 'off' // typescript s'en charge
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: '@typescript-eslint/parser' } }
  },
  { ignores: ['dist/', 'node_modules/', 'src/config/.type/', 'tests/output/'] }
]
```

> **⚠️ Ordre et double enregistrement du plugin `vue`.** Le `flat/base` de `eslint-plugin-vuetify` enregistre lui-même le plugin `vue`, et **ESLint 9.39+ lève une erreur si un plugin est redéfini**. Empiler naïvement `pluginVue.configs['flat/recommended']` et `pluginVuetify.configs['flat/recommended']` casse donc `npm run lint`. Le contournement — retirer la clé `plugins` de la config de vue avec un `.map(({ plugins, ...rest }) => rest)` — vient de `data-fair/ui`, seul service déjà en ESLint 9.39+ ; `catalogs`/`processings` (ESLint 9.35, presets `flat/base`) n'en ont pas encore besoin mais y passeront en montant de version. Et `neostandard` vient **après** vue et vuetify, pas avant.

- `neostandard({ ts: true, env: ['browser'] })` apporte le **style** et les globals navigateur (`neostandard` en devDependencies).
- `eslint-plugin-vuetify` détecte les composants et props Vuetify dépréciés — précieux sur une migration depuis Vuetify 2. Les cinq services le configurent (dans leur `ui/`), en `^2.7.2`.
- `@data-fair/lib-utils/eslint/recommended.js` est livré avec `lib-utils`, déjà installé : il bloque les imports de modules dépréciés (`@koumoul/sd-vue`, `http-errors`, `rfdc`…). Il ne fait que ça — il ne remplace pas `neostandard`.
- `src/config/.type/` doit être ignoré : c'est du généré.

> **Piège** : `"lint-fix"` (`eslint --fix .`) **réécrit** les fichiers qu'il atteint. Sur une migration, tout répertoire legacy encore présent sera reformaté au premier `npm run lint-fix`. L'ajouter aux `ignores` tant qu'il n'est pas supprimé — `lint`, lui, se contente de signaler.

## Pas de `.editorconfig`

Aucun dépôt maison n'en a. Sur une reprise, le supprimer — mais seulement après avoir vérifié qu'ESLint porte bien les règles de style (`neostandard`), sinon le dépôt se retrouve sans aucune convention.

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue", "tests/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

> **Pas de `baseUrl`** : `baseUrl` est déprécié depuis TypeScript 5/6 et sera retiré dans TS 7.0. `paths` résout automatiquement par rapport au dossier du `tsconfig.json` dès lors que les chemins cibles commencent explicitement par `./` (`"./src/*"` et non `"src/*"`).

`include` doit couvrir `tests/**` : sans lui les fichiers de test échappent au `type-check`, et l'alias `@/` n'y résout pas. **C'est l'écart le plus répandu du parc** — la quasi-totalité des apps n'incluent que `src/**` et leurs tests ne sont pas type-checkés ; à corriger dès qu'on touche au dépôt. L'alias `@/*` est constant côté apps (les services utilisent `~/*` ou `#api/*` — ne pas transposer).

## vite.config.ts

Extension : `vite.config.ts` pour les nouveaux projets (cohérent avec le TypeScript strict du reste du dépôt). Une bonne partie du parc a encore un `.mjs` ou `.js` — Vite accepte les trois, ne pas renommer sur une simple maintenance.

```ts
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import { settingsPath } from '@data-fair/lib-vuetify/vite.js'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.APP_PORT ?? 3000)
  return {
    base: env.PUBLIC_URL ?? '/app/',
    plugins: [
      vue({ template: { transformAssetUrls } }),
      vueI18n({}),
      vuetify({ autoImport: true, styles: { configFile: settingsPath } })
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port,
      strictPort: !!env.APP_PORT,
      // hmr suit le port du serveur : un websocket resté sur 3000 fait tenir deux
      // ports à l'application et annule le décalage
      hmr: { port, protocol: 'ws' }
    }
  }
})
```

> **⚠️ Police du site en dev — bug traité côté df-dev-server, pas dans l'app.** Le dev server de Vite réécrit les URLs root-relative d'`index.html` en `base + url` : `/simple-directory/api/sites/_theme.css` devient `/app/simple-directory/…`, que Vite sert en **`200 text/html`** (fallback SPA — encore plus silencieux qu'un 404) → `--d-body-font-family` garde son placeholder et l'app rend dans la serif par défaut du navigateur, **en dev seulement** (le build de prod ne réécrit rien). `@data-fair/dev-server` **≥ 2.3.4** redirige `<base>/simple-directory/*` vers son proxy `/simple-directory` (couvre `_theme.css` et `_public.js`). Symptôme « typo correcte en prod, serif en dev » → **mettre à jour `@data-fair/dev-server`**, ne pas ajouter de plugin Vite dans l'app.

> **⚠️ `vueI18n({})` — sans option `include`.** Certaines applications passent `include: '.../lib-vuetify/**/*.vue'`, hérité de l'ancien `@intlify/vite-plugin-vue-i18n`. Dans `@intlify/unplugin-vue-i18n`, `include` désigne les **fichiers ressources** i18n (JSON/YAML) : le plugin tente alors de parser un SFC entier comme du JSON et le build échoue sur `SyntaxError: Unexpected token '<'` en pointant `@data-fair/lib-vuetify/ui-notif.vue`. Les blocs `<i18n>` des SFC sont pris en charge sans aucune option. Symptôme trompeur : l'erreur n'apparaît qu'une fois un composant de `lib-vuetify` réellement importé — le build passe tant que `App.vue` est un squelette.

> **⚠️ `loadEnv`, pas `process.env`.** Vite ne peuple pas `process.env` depuis les fichiers `.env` — un `port: Number(process.env.APP_PORT ?? 3000)` retombe silencieusement sur 3000 et l'application collisionne à nouveau. `loadEnv(mode, process.cwd(), '')` est natif, sans dépendance, et laisse la priorité à un `process.env` déjà posé : c'est ce qui permet à Playwright d'injecter `APP_PORT=E2E_PORT` dans son `webServer`. Le préfixe vide n'expose rien au bundle client, gouverné séparément par `envPrefix`.

> **⚠️ `hmr.port` aligné sur `port`.** C'est l'oubli le plus coûteux : sans lui Vite laisse son websocket sur 3000, l'application tient deux ports au lieu d'un, et le décalage ne sert plus à rien. Le contrôle qui l'attrape : `ss -ltnp` ne doit montrer aucun port hors du triplet du `.env`.

`base` vaut `/app/` par défaut, ce qu'attend `df-dev-server` ; la CI le surcharge par `PUBLIC_URL`.

## Tests — Playwright, dans `tests/`

Cible (le modèle de `bar-chart-race`, seul à l'appliquer intégralement) : dossier `tests/`, extension `.spec.ts` (jamais `.test.ts`), Playwright découpé en **projets** `unit`/`e2e`.

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
const BASE_URL = `http://localhost:${PORT}`

// webServer est global à la config : le conditionner pour ne pas lancer Vite sur un run
// purement unitaire (plutôt que de scinder en deux fichiers). Playwright accepte `--project x`
// et `--project=x` : les deux formes doivent être lues.
const selectedProjects = process.argv.flatMap((arg, i) => {
  if (arg === '--project') return [process.argv[i + 1]]
  if (arg.startsWith('--project=')) return [arg.slice('--project='.length)]
  return []
})
const isUnitOnly = selectedProjects.length > 0 && selectedProjects.every(p => p === 'unit')

export default defineConfig({
  testMatch: /.*\.spec\.ts$/,
  forbidOnly: !!process.env.CI,
  // no per-project workers in Playwright: the browser suite runs alone, the unit project keeps the default pool
  workers: isUnitOnly ? undefined : 1,
  outputDir: './tests/output',
  use: { baseURL: BASE_URL },
  projects: [
    { name: 'unit', testDir: './tests/unit' },
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: isUnitOnly
    ? undefined
    : {
        command: 'PUBLIC_URL= npm run dev-app',
        url: BASE_URL,
        env: { ...process.env, APP_PORT: String(PORT), DATA_FAIR_TEST: 'true' },
        reuseExistingServer: !process.env.CI
      }
})
```

**Un seul worker pour l'e2e**, et le pool par défaut pour les tests unitaires. `workers` est global à la config — il n'existe pas de réglage par projet — donc le conditionner sur le même `isUnitOnly` que le `webServer`. Sans réglage, Playwright en ouvre la moitié des cœurs.

Un worker est un navigateur. La suite est bien plus rapide à plusieurs (mesuré sur une application de 146 tests, 8 cœurs : 2 min 44 à 1 worker, 2 min 11 à 2, ~1 min 20 à 4), mais une machine de développement est rarement au repos — dev-servers, `vue-tsc`, elasticsearch, autres sessions — et sous contention les tests dépassent leur timeout sans rien dire du code : le bouton attendu n'apparaît pas en 30 secondes. Un même run échoue alors sur un test différent à chaque fois, signature à reconnaître. Comme la suite tourne au `pre-push`, ce faux échec bloque une publication et coûte bien plus que la minute gagnée ; sur une machine chargée, la série est même souvent plus rapide que le parallèle. Le projet `unit` ne lance aucun navigateur et garde le pool par défaut.

Le plafond ne vise donc que la machine de développement et le hook `pre-push`. En CI, c'est le projet `unit` qui a vocation à tourner — léger, sans navigateur ni serveur Vite ; l'e2e reste local, là où la contention est précisément la règle.

```json
{
  "test": "df-dev-env && dotenv -- playwright test --max-failures=1",
  "test-unit": "playwright test --project unit",
  "test-e2e": "df-dev-env && dotenv -- playwright test --project e2e"
}
```

Trois détails du modèle qui se perdent facilement :

- **`PUBLIC_URL=` vidé dans la commande du `webServer`** — protège d'un `PUBLIC_URL` exporté dans le shell du dev, qui casserait la `base` de Vite.
- **`E2E_PORT` vient du `.env`**, pas d'un `$RANDOM` dans le script ni d'un fichier `tests/.test-port`. Les deux formes se croisent encore dans le parc — elles réimplémentaient, en double, le « tire une fois, persiste, réutilise » que porte désormais le `.env` (cf. « Ports de développement »). En reprise, supprimer `tests/helpers/port.ts` et la ligne `tests/.test-port` du `.gitignore`.
- **`APP_PORT` passé par `webServer.env`, jamais par `--port`.** Un `vite --port` ne change pas `hmr.port`, qui viendrait toujours d'`APP_PORT` et pointerait à côté : le HMR se connecterait au serveur de développement pendant que les tests tournent ailleurs.
- **`tests/e2e/fixtures.ts`** centralise les mocks (`mockSite`, `buildApplication`, dataset de test, config de base) pour des e2e sans instance data-fair réelle.

**État du parc** : les autres apps déclarent un seul projet `chromium` avec `webServer` inconditionnel (seule `atelier-carto` isole l'unitaire, via un fichier `playwright.unit.config.ts` séparé) ; `app-charts` et `app-timelines` rangent leurs specs dans `tests-e2e/specs/` ; `carto-explore` colocalise encore ses tests unitaires `node --test` à côté des sources. Les services suivent une convention différente (projets discriminés par suffixe `*.unit.spec.ts` / `*.api.spec.ts` / `*.e2e.spec.ts`, pas de `webServer` — leur stack démarre en docker) : ne pas la transposer aux apps.

Pour les tests e2e, mocker `**/simple-directory/**` (session) et les endpoints de données, et injecter `window.APPLICATION` via `page.addInitScript` avec `writable: false` **avant** le script inline de `index.html` : en `vite` nu, `window.APPLICATION=%APPLICATION%` lève une `SyntaxError` (placeholder non substitué) que le parser ignore ensuite.

> **Un test e2e qui ne peut pas échouer ne prouve rien.** Un `toHaveCount(0)` sur un élément que la configuration de test ne produit jamais passe trivialement. Écrire le **contrôle positif** en regard (même configuration, ressource valide → l'élément est présent), ou vérifier par mutation que l'assertion échoue bien quand on casse le code visé.

## .gitignore

```
node_modules
dist
.env
.dev-config.json
src/config/.type
tests/output
playwright-report
```

`src/config/.type/` est généré par `df-build-types` ; `public/config-schema.json`, lui, **est commité**.

`.env` et `.dev-config.json` sont de l'**état local**, jamais commités. Attention en reprise : **un `.gitignore` n'a aucun effet sur un fichier déjà suivi**. 27 apps du parc suivent `.dev-config.json` dans git, dont 8 qui l'ont pourtant dans leur `.gitignore` depuis des mois. La ligne ne suffit pas, il faut `git rm --cached .dev-config.json`.

## CI

Les applications sont sur **GitLab CI** (`.gitlab-ci.yml` — aucune app n'a de `.github/workflows`), avec un pipeline `npm install && npm run build-types && npm run lint && npm run type-check && npm run build` : pas de tests ni d'audit en CI, la qualité complète (dont les e2e) est portée par le hook `pre-push` — même philosophie que le `commits.yml` des services GitHub (*« husky already did it on the dev computer »*), mécanisme différent. Respecter l'ordre `build-types` → `lint` → `type-check` → `build` (cf. § package.json).
