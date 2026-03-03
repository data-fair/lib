# @data-fair/lib-agent-skills

Skills for AI coding agents in the data-fair stack.

When creating skills you should use the best model available and reference the [skill-creator skill](https://skills.sh/anthropics/skills/skill-creator).

Example of prompt used to create the data-fair-ws skill with Opus 4.6:

```Look into packages/vue/ws.ts packages/express/ws-server.ts packages/node/ws-emitter.ts to get an understanding of how websocket integration is managed in the data-fair services stack. Also have a look into ../events and ../processings for examples of actual usage. Then use the skill-creator skill and create a new skill in packages/agent-skills/skills that will allow coding agent to exploit this knowledge with reasonable context use.```