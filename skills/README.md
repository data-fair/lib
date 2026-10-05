# @data-fair/lib coding agent skills

Skills for AI coding agents working in the data-fair stack.

## Available skills

| Skill | What it's for |
| --- | --- |
| [`data-fair-session`](./data-fair-session/SKILL.md) | Consuming sessions in a data-fair service: reading user identity, checking permissions, protecting routes, and using session middleware on Express/Node and Vue. |
| [`data-fair-identities`](./data-fair-identities/SKILL.md) | Receiving the identity webhooks of simple-directory in a service: the contract (`POST` with the complete state, `DELETE`, reconciliation of memberships and partners), what a rename must update and a deletion must remove or anonymize (GDPR), mounting `createIdentitiesRouter`, and the integration test of that router. |
| [`data-fair-ws`](./data-fair-ws/SKILL.md) | Real-time websocket integration: server-side setup, emitting events, Vue subscriptions, and Node clients for integration tests. |
| [`data-fair-app`](./data-fair-app/SKILL.md) | Developing a data-fair application (Vue 3 + Vuetify 4 + Vite visualization): creating a new app, migrating a legacy one, the `window.APPLICATION` / `config-schema.json` / `df:*` metas contract, dev server, d-frame embedding, capture and thumbnails, dynamic theme, session i18n, RGAA accessibility, root files and Playwright tests. Written in French. |
| [`data-fair-app-dashboard`](./data-fair-app-dashboard/SKILL.md) | Building dashboards and observatories with `@data-fair/app-dashboards` through the API: a ten-criterion quality bar drawn from the best French observatories, multi-scale territory filters, data audit before design (concepts per scale, vintages, aggregate rows), the `DashboardConfig` anatomy and filter propagation, per sub-app capabilities and traps (app-charts, metrics, atelier-carto, list-details…), the API write cycle and a verification checklist. |
| [`data-fair-processing`](./data-fair-processing/SKILL.md) | Developing a processing plugin: anatomy of the repo, the `prepare`/`run`/`stop` contract and `ProcessingContext`, the processings-specific parts of `processing-config-schema.json` (dataset create/update block, context variables, secrets), generated types, graceful stop, and porting an old CommonJS plugin to TypeScript+ESM. |
| [`vjsf`](./vjsf/SKILL.md) | Writing, reviewing or migrating any JSON schema rendered as a form by vjsf 3+ / json-layout: layout vocabulary, `getItems`, conditionals, discriminated `oneOf` (and its performance impact), `x-i18n-*` internationalization, label casing, the vjsf 2 → 3 migration table, and the fleet patterns (slider, MDI icon picker, tabs, advanced arrays). |
| [`data-fair-browse`](./data-fair-browse/SKILL.md) | Driving a running data-fair platform through a browser MCP (chrome-devtools or Playwright), usually under a non-human identity (`@data-fair/nhi-proxy`): what the NHI session implies, the ladder from in-page WebMCP tools (`navigator.modelContext`) to direct API calls to raw browser clicks, which tools each surface exposes (portal, data-fair back-office, portals-manager), VJSF form tools and `subagent_*` tools, and how to verify a real rendering. |
| [`portals-pages`](./portals-pages/SKILL.md) | Creating and editing content pages on a data-fair **portals v2** portal from the manager (`/portals-manager`): page-config API, admin/contrib permission model, element blocks (title, text, alert, Mermaid diagram, application/iframe embeds, button), composing harmonious pages (hero, full-width banners, section rhythm, card grids, theme-safe colors across dark/high-contrast themes), editing standard pages (home, contact…), publishing and moving a page between portals, transferring it between departments (sandbox → target), image upload and sizing, table of contents and breadcrumbs, sorted listings, and live browser verification. Portals v1 is out of scope. |
| [`portals-config`](./portals-config/SKILL.md) | Configuring a **portals v2** portal itself from the manager API: creation, draft/publish cycle, theme (assisted vs manual colours, theme CSS propagation), fonts, images (SVG kept as-is), navigation bar and menus, footer (legacy and rows shapes by version), catalog cards, dataset and application page sections, standard pages to create, sync with data-fair publication sites and simple-directory, and a verification recipe. Page content is `portals-pages`. |
| [`data-fair-security`](./data-fair-security/SKILL.md) | Stack-wide security invariants for services and plugins: public vs private HTTP clients of lib-node (SSRF) and the clients they don't cover (fetch, SDKs, ftp/sftp, child processes), parsed-origin URL matching, credentials on redirects and pagination links, remote names in paths and commands, and why `reqIsInternal` alone never grants a privilege. Review checklist. |
| [`upgrade-scripts`](./upgrade-scripts/SKILL.md) | Writing database migrations with `@data-fair/lib-node/upgrade-scripts`: which version goes in the folder name (the common gotcha), idempotency patterns, fresh-install handling, and debugging. |
| [`deps-refresh`](./deps-refresh/SKILL.md) | Routine "up to date" maintenance pass on a service: measuring with npm audit + a trivy scan of the built image, security fixes first, then dead/phantom/replaceable deps, then majors proven behaviour-neutral against the repo's own fixtures, then a written blocker for each one declined. Manual invocation only. |
| [`pr-ready`](./pr-ready/SKILL.md) | Pre-PR flight check. A macro pass that re-anchors on the original intent and reviews the branch against it for scope, completeness, and drift, flags risky or sensitive changes, and drafts a compact PR title (conventional-commit style) and description. Manual invocation only. |

## Installing

Install all skills from this repo into the current project:

```sh
npx skills add data-fair/lib
```

Install globally (user-level, available across projects):

```sh
npx skills add data-fair/lib -g
```

Install a specific skill only:

```sh
npx skills add data-fair/lib --skill pr-ready
```

Target a specific agent (Claude Code, Cursor, etc.):

```sh
npx skills add data-fair/lib --agent claude-code
```

See `npx skills --help` for the full set of flags (multi-skill, multi-agent, copy vs symlink, etc.).

## Authoring new skills

Use the best model available and reference the [skill-creator skill](https://skills.sh/anthropics/skills/skill-creator).

Example of a prompt used to create the `data-fair-ws` skill with Opus 4.6:

> Look into `packages/vue/ws.ts` `packages/express/ws-server.ts` `packages/node/ws-emitter.ts` to get an understanding of how websocket integration is managed in the data-fair services stack. Also have a look into `../events` and `../processings` for examples of actual usage. Then use the skill-creator skill and create a new skill in `./skills` that will allow a coding agent to exploit this knowledge with reasonable context use.
