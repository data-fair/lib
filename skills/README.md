# @data-fair/lib coding agent skills

Skills for AI coding agents working in the data-fair stack.

## Available skills

| Skill | What it's for |
| --- | --- |
| [`data-fair-session`](./data-fair-session/SKILL.md) | Consuming sessions in a data-fair service: reading user identity, checking permissions, protecting routes, and using session middleware on Express/Node and Vue. |
| [`data-fair-ws`](./data-fair-ws/SKILL.md) | Real-time websocket integration: server-side setup, emitting events, Vue subscriptions, and Node clients for integration tests. |
| [`data-fair-processings`](./data-fair-processings/SKILL.md) | Developing a processing plugin: anatomy of the repo, the `prepare`/`run`/`stop` contract and `ProcessingContext`, the processings-specific parts of `processing-config-schema.json` (dataset create/update block, context variables, secrets), generated types, graceful stop, and porting an old CommonJS plugin to TypeScript+ESM. |
| [`vjsf`](./vjsf/SKILL.md) | Writing, reviewing or migrating any JSON schema rendered as a form by vjsf 3+ / json-layout: layout vocabulary, `getItems`, conditionals, discriminated `oneOf` (and its performance impact), `x-i18n-*` internationalization, label casing, the vjsf 2 → 3 migration table, and the fleet patterns (slider, MDI icon picker, tabs, advanced arrays). |
| [`upgrade-scripts`](./upgrade-scripts/SKILL.md) | Writing database migrations with `@data-fair/lib-node/upgrade-scripts`: which version goes in the folder name (the common gotcha), idempotency patterns, fresh-install handling, and debugging. |
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
