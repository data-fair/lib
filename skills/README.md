# @data-fair/lib coding agent skills

Skills for AI coding agents working in the data-fair stack.

## Available skills

| Skill | What it's for |
| --- | --- |
| [`data-fair-session`](./data-fair-session/SKILL.md) | Consuming sessions in a data-fair service: reading user identity, checking permissions, protecting routes, and using session middleware on Express/Node and Vue. |
| [`data-fair-ws`](./data-fair-ws/SKILL.md) | Real-time websocket integration: server-side setup, emitting events, Vue subscriptions, and Node clients for integration tests. |
| [`pr-ready`](./pr-ready/SKILL.md) | Pre-PR flight check. Reviews the current branch against the original intent, flags scope creep, regression risks, and commit hygiene problems, and drafts a compact PR description. Manual invocation only. |

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
