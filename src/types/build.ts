#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-var-requires */

const { compile } = require('json-schema-to-typescript')
const fs = require('node:fs')
const path = require('node:path')
const { camelCase } = require('camel-case');

(async () => {
  const dir = path.resolve(process.argv[2] || './types')
  console.log(`look for schemas in subdirectories of ${dir}`)

  for (const key of fs.readdirSync(dir)) {
    if (key === 'node_modules' || !fs.lstatSync(path.join(dir, key)).isDirectory()) continue
    console.log(`compute ${key}`)
    const schema = require(path.join(dir, key, 'schema'))
    const ts = await compile(schema, key)
    fs.writeFileSync(path.join(dir, key, 'index.ts'), `${ts}
export const ${camelCase(key)}Schema = ${JSON.stringify(schema, null, 2)}
`)
  }
})()

/*
keep for reference a version using schema2td + jtd-codegen

const { spawnSync } = require('node:child_process')

for (const key of ['agg-result']) {
  const schema2td = `schema2td types/${key}/${key}.schema.json types/${key}/${key}.jtd.json`
  console.log(`> ${schema2td}`)
  spawnSync(
    `npx --package @koumoul/schema-jtd@0.3.0 ${schema2td}`,
    [],
    {shell: true, stdio: 'inherit'}
  )

  const jtdCodegen = `jtd-codegen types/${key}/${key}.jtd.json --typescript-out types/${key}`
  console.log(`> ${jtdCodegen}`)
  spawnSync(
    `docker compose run --rm jtd ${jtdCodegen}`,
    [],
    {shell: true, stdio: 'inherit'}
  )
} */
