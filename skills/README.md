# @data-fair/lib coding agent skills

Skills for AI coding agents that build on the data-fair stack: applications, processing plugins, configuration forms, and portals and platforms driven through their API or a browser. Each skill is self-contained.

## Available skills

| Skill | What it's for |
| --- | --- |
| [`data-fair-app`](./data-fair-app/SKILL.md) | Developing a data-fair application (Vue 3 + Vuetify 4 + Vite visualization): creating a new app, migrating a legacy one, the `window.APPLICATION` / `config-schema.json` / `df:*` metas contract, dev server, d-frame embedding, capture and thumbnails, dynamic theme, the session (user, active account, roles) and its i18n, URL and access-key security, RGAA accessibility, root files and Playwright tests. Written in French. |
| [`data-fair-app-dashboard`](./data-fair-app-dashboard/SKILL.md) | Building dashboards and observatories with `@data-fair/app-dashboards` through the API: a ten-criterion quality bar drawn from the best French observatories, multi-scale territory filters, data audit before design (concepts per scale, vintages, aggregate rows), the `DashboardConfig` anatomy and filter propagation, per sub-app capabilities and traps (app-charts, metrics, atelier-carto, list-details…), the API write cycle and a verification checklist. |
| [`data-fair-app-upgrades`](./data-fair-app-upgrades/SKILL.md) | Moving existing applications from version X to version Y of their base application: finding the served versions, diffing `config-schema.json` across tags, converting and validating old configurations, private `[MAJ]` copies, rendering comparison, promotion one at a time (`urlDraft` trap), and the per-application catalogue of how old configurations break (app-charts, app-catalog, app-dashboards, atelier-carto, metrics, periodic-series…) with converters. |
| [`data-fair-processing`](./data-fair-processing/SKILL.md) | Developing a processing plugin: anatomy of the repo, the `prepare`/`run`/`stop` contract and `ProcessingContext`, the processings-specific parts of `processing-config-schema.json` (dataset create/update block, context variables, secrets), writing to datasets (draft mode of a file update, waiting for the journal, `_bulk_lines` errors, primary key), generated types, graceful stop, security (SSRF-safe outbound requests, credentials on redirects and next-page links, remote names in paths, child processes), and porting an old CommonJS plugin to TypeScript+ESM. |
| [`vjsf`](./vjsf/SKILL.md) | Writing, reviewing or migrating any JSON schema rendered as a form by vjsf 3+ / json-layout: layout vocabulary, `getItems`, conditionals, discriminated `oneOf` (and its performance impact), `x-i18n-*` internationalization, label casing, the vjsf 2 → 3 migration table, and the fleet patterns (slider, MDI icon picker, tabs, advanced arrays). |
| [`data-fair-browse`](./data-fair-browse/SKILL.md) | Driving a running data-fair platform through a browser MCP (chrome-devtools or Playwright), usually under a non-human identity (`@data-fair/nhi-proxy`): what the NHI session implies, the ladder from in-page WebMCP tools (`navigator.modelContext`) to direct API calls to raw browser clicks, which tools each surface exposes (portal, data-fair back-office, portals-manager), VJSF form tools and `subagent_*` tools, and how to verify a real rendering. |
| [`portals-pages`](./portals-pages/SKILL.md) | Creating and editing content pages on a data-fair **portals v2** portal from the manager (`/portals-manager`): page-config API, admin/contrib permission model, element blocks (title, text, alert, Mermaid diagram, application/iframe embeds, button), composing harmonious pages (hero, full-width banners, section rhythm, card grids, theme-safe colors across dark/high-contrast themes), editing standard pages (home, contact…), publishing and moving a page between portals, transferring it between departments (sandbox → target), image upload and sizing, table of contents and breadcrumbs, sorted listings, and live browser verification. Portals v1 is out of scope. |
| [`portals-config`](./portals-config/SKILL.md) | Configuring a **portals v2** portal itself from the manager API: creation, draft/publish cycle, theme (assisted vs manual colours, theme CSS propagation), fonts, images (SVG kept as-is), navigation bar and menus, footer (legacy and rows shapes by version), catalog cards, dataset and application page sections, standard pages to create, sync with data-fair publication sites and simple-directory, and a verification recipe. Page content is `portals-pages`. |

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
npx skills add data-fair/lib --skill data-fair-processing --skill vjsf
```

The plugin skills link to `vjsf` (configuration schemas): install it with them.

Target a specific agent (Claude Code, Cursor, etc.):

```sh
npx skills add data-fair/lib --agent claude-code
```

See `npx skills --help` for the full set of flags (multi-skill, multi-agent, copy vs symlink, etc.).

## Authoring new skills

Use the best model available and reference the [skill-creator skill](https://skills.sh/anthropics/skills/skill-creator).

Keep each skill self-contained: it never sends the agent to a skill that is not in this folder.
