# Architecture conventions shared by services

Only "Settled" items are rules. "Open" items list today's variants so they are not mistaken for a convention: when a task touches one, follow the repo as it is and ask the maintainer instead of picking a variant.

## Settled

- **API version prefix.** No `/v1/`: routes live under `/api/...`. Only data-fair keeps `/api/v1/` for history. A service still on `/api/v1/...` (processings: `/api/v1/_ping`, `/api/v1/admin`) moves to `/api/...` and keeps the `/api/v1/...` path as a compatibility route.
- **Branch names.** Letters, digits, `.`, `_`, `-`, no `/`, and `<repo>_<branch>` at most 60 characters (enforced by `df-worktree`; the name becomes a directory, a zellij session whose socket path zellij caps at 107 bytes, and a `DEV_HOST` label).
- **Dev environment.** `@data-fair/lib-dev` + `dev/dev.json` + `.zellij.kdl` as described in SKILL.md and migrate-a-service.md.
- **Tooling.** [tooling.md](tooling.md).
- **test-env routers** (unauthenticated, destructive): mounted only when `process.env.NODE_ENV === 'development'`, with a dynamic import so production never loads the module. The dev environment is the test environment: CI starts the API with `NODE_ENV=development` too (with the mocks the dev config needs, e.g. portals' ingress-manager), never a separate `test` mode for the API.
- **BUILD.json.** Written by CI (`reuse-build.yml`) and copied by the Dockerfile (`COPY BUILD.json* ./`). The API reads it in production **without crashing when it is missing** (an image built outside CI must start):

```ts
let info: Record<string, string> = { version: process.env.NODE_ENV ?? 'development' }
if (process.env.NODE_ENV === 'production') {
  try {
    info = JSON.parse(await readFile(resolve(import.meta.dirname, '../../../BUILD.json'), 'utf8'))
  } catch {
    info = { version: 'unknown (built without CI)' }
  }
}
```

  No shared lib function: two lines per repo.
- **Generated `.d.ts`** (auto-imports, components, typed router): written under `ui/dts/` by the Vite plugins, gitignored (`ui/.gitignore`: `dts`), never committed; the UI build runs before `check-types` (locally `df-dev setup` builds the UI).
- **`/dev` pages of the UIs.** A repo with a single dev page keeps it at `/dev`; several dev pages go under `src/pages/dev/…`. They are excluded from the production build by the Vite command, not by `NODE_ENV` (which a build can inherit by mistake):

```ts
export default defineConfig(({ command }) => ({
  plugins: [
    VueRouter({ dts: './dts/typed-router.d.ts', exclude: command === 'build' ? ['src/pages/dev.vue', 'src/pages/dev/**'] : [] }),
    // …
  ]
}))
```

  Check after a build that no dev chunk is in `ui/dist/assets` (`ls ui/dist/assets | grep -i dev`).
- **`ui/vite.config.ts`.** Every choice below has a reason; keep the repo's plugin list (component dirs, polyfills, aliases legitimately differ).
  - `base: '/<service>'`, plus `experimental.renderBuiltUrl` and `html.cspNonce: '{CSP_NONCE}'` like the other services: the UI is served under a prefix and behind a CSP.
  - `defineConfig(({ command, isPreview }) => …)`; a `server` block only when `command === 'serve' && !isPreview` (`vite preview` also runs as `serve` and must not require the dev ports).
  - `server.port` and `server.hmr.port` from the `.env` variables declared in `dev/dev.json` (`DEV_UI_PORT`, `DEV_UI_HMR_PORT`), parsed with a check (no `NaN`), `strictPort: true`; never a hard-coded port (metrics and openapi-viewer both used 7200 and collided); no `proxy`: nginx routes.
  - `optimizeDeps.noDiscovery: true` + `optimizeDeps.include` (the 4 pilots): without it, the first visit of a page discovers dependencies and reloads it, which fails cold e2e runs. The include list: run Vite once with discovery on, take the `optimized` keys of `ui/node_modules/.vite/deps/_metadata.json` minus vjsf's `commonjsDeps`; each entry is the exact import specifier (`cronstrue/locales/en`, not `…/en.js`, else Vite serves the raw CommonJS file: blank page). A forgotten CommonJS dependency breaks the page instead of reloading it: validate with a cold cache (`rm -rf ui/node_modules/.vite`) and the e2e warmup.
  - Plugins: VueRouter (`dts: './dts/typed-router.d.ts'`, dev pages excluded at build), Vue, VueI18n, Vuetify (`settingsPath`), AutoImport (`dts: './dts/auto-imports.d.ts'`, `autoImports` from `@data-fair/lib-vuetify/vite.js`), Components (`dts: './dts/components.d.ts'`, `resolvers: [componentsResolver]`).
  - No `build` block unless it differs from Vite's defaults.
- **Site theme and public info.** `ui/index.html` loads both from simple-directory with hashed, cacheable URLs, and the session reads `window.__PUBLIC_SITE_INFO`:

```html
<link href="{SITE_PATH}/simple-directory/api/sites/{THEME_CSS_HASH}_theme.css" rel="stylesheet">
<script src="{SITE_PATH}/simple-directory/api/sites/{PUBLIC_SITE_INFO_HASH}_public.js"></script>
```

  The API passes `privateDirectoryUrl: config.privateDirectoryUrl` to `createSpaMiddleware`, which fills the hashes (and drops them for `_t_*` theme overrides); the Vite `inject-site-context` plugin fills them with `''` in dev. `main.ts` calls `createSession({ directoryUrl })` **without `siteInfo: true`**: that option fetches `_public` at startup and logs `refreshSiteInfo is deprecated`. A UI that can run without simple-directory (openapi-viewer standalone) injects the two tags through one template param (`extraHtmlTemplateParams`), empty in that mode, and passes `privateDirectoryUrl` only when the directory is used.

## Open (decide with the maintainer before changing)

- **Health route.** Today: `app.get('/api/ping')` (portals, catalogs), `app.use('/api/ping')` (events, registry, agents), `/api/v1/ping` from a router (data-fair), `/api/v1/_ping` (processings), `/ping` (portals' Nuxt server). Out of the current overhaul.
- **Admin routes.** `/api/admin` vs `/api/v1/admin`, different endpoint sets. Out of the current overhaul.
- **Shared mongo / Elasticsearch** for all stacks: feasible with one database per worktree and an ES index prefix per worktree, after aligning on mongo 8 and ES 8.
