#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-var-requires */

const { compile } = require('json-schema-to-typescript')
const fs = require('node:fs')
const path = require('node:path')
const { camelCase } = require('camel-case')
const { sessionStateSchema } = require('./session-state');

(async () => {
  const dir = path.resolve(process.argv[2] || './types')
  let prefix = process.argv[3]
  if (!prefix) {
    let pJsonName
    try {
      const pJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
      pJsonName = pJson.name
    } catch (err) {
      // nothing to do
    }
    if (!pJsonName) {
      const pJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'))
      pJsonName = pJson.name
    }
    prefix = pJsonName.replace('@data-fair/', 'https://github.com/data-fair/')
  }
  console.log(`look for schemas in subdirectories of ${dir} and match wityh prefix ${prefix}`)

  const dataFairLibResolver = {
    order: 1,
    canRead (file: { url: string }) {
      return file.url.startsWith('https://github.com/data-fair/lib/')
    },
    read (file: { url: string }, callback: (err: Error | null, doc?: any) => void) {
      const key = file.url.replace('https://github.com/data-fair/lib/', '')
      console.log(`match url to @data-fair/lib type ${file.url} -> ${key}`)
      if (key === 'session-state') callback(null, sessionStateSchema)
      else callback(new Error(`unknown schema in @data-fair/lib ${key}`))
    }
  }

  const localResolver = {
    order: 2,
    canRead (file: { url: string }) {
      return file.url.startsWith(prefix)
    },
    async read (file: { url: string }, callback: (err: any, doc?: any) => void) {
      const schemaPath = path.join(dir, file.url.replace(prefix, ''), 'schema.json')
      console.log(`match url to local type ${file.url} -> ${schemaPath}`)
      try {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
        callback(null, schema)
      } catch (err) {
        callback(err)
      }
    }
  }

  for (const key of fs.readdirSync(dir)) {
    if (key === 'node_modules' || !fs.lstatSync(path.join(dir, key)).isDirectory()) continue
    console.log(`compute ${key}`)
    const schema = require(path.join(dir, key, 'schema'))
    const ts = await compile(schema, key, { $refOptions: { resolve: { 'data-fair-lib': dataFairLibResolver, local: localResolver } } })
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
