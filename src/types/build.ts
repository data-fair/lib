#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-var-requires */

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import ajvErrors from 'ajv-errors'
import fastJsonStringify from 'fast-json-stringify'
import * as fs from 'fs'
const { compile: compileTs } = require('json-schema-to-typescript')
const path = require('node:path')
const standaloneCode = require('ajv/dist/standalone').default
const { pascalCase } = require('pascal-case')

const ajv = new Ajv({
  useDefaults: true,
  coerceTypes: 'array',
  allErrors: true,
  strict: false,
  code: { source: true, optimize: true }
})
addFormats(ajv)
ajvErrors(ajv)

const main = async () => {
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
  const inLib = pJsonName === '@data-fair/lib'

  const dir = path.resolve(process.argv[2] || './types')
  let prefix = process.argv[3]
  if (!prefix) prefix = pJsonName.replace('@data-fair/', 'https://github.com/data-fair/')
  console.log(`look for schemas in subdirectories of ${dir} and match wityh prefix ${prefix}`)

  const schemas: Record<string, any> = {}

  const keys = fs.readdirSync(dir)
    .filter(key => key !== 'node_modules' && fs.lstatSync(path.join(dir, key)).isDirectory())

  if (!inLib) {
    const { schema: sessionStateSchema } = require('../types/session-state')
    ajv.addSchema(sessionStateSchema)
    schemas[sessionStateSchema.$id] = sessionStateSchema
  }

  // first loop to read all raw schemas
  for (const key of keys) {
    if (key === 'node_modules' || !fs.lstatSync(path.join(dir, key)).isDirectory()) continue
    console.log(`compute ${key}`)
    const schema = require(path.join(dir, key, 'schema'))
    schemas[schema.$id || key] = schema
    ajv.addSchema(schema, schema.$id || key)
  }

  const localResolver = {
    order: 1,
    canRead (file: { url: string }) {
      if (file.url.startsWith('https://github.com/data-fair/') && !schemas[file.url]) {
        throw new Error(`the $ref ${file.url} should probably be resolved locally but was not found`)
      }
      return !!schemas[file.url]
    },
    async read (file: { url: string }, callback: (err: any, doc?: any) => void) {
      callback(null, schemas[file.url])
    }
  }

  for (const key of keys) {
    // const ts = await compile(schema, key, { $refOptions: { resolve: { 'data-fair-lib': dataFairLibResolver, local: localResolver } } })
    const schema = require(path.join(dir, key, 'schema'))
    const mainTypeName = pascalCase(schema.title || key)
    const schemaExports = schema['x-exports'] || ['types', 'validate', 'stringify', 'schema']
    let code = ''
    for (const schemaExport of schemaExports) {
      if (schemaExport === 'types') {
        code += await compileTs(schema, schema.$id || key,
          { bannerComment: '', unreachableDefinitions: true, $refOptions: { resolve: { local: localResolver } } }) as string
      } else if (schemaExport === 'schema') {
        code += `
// raw schema
export const schema = ${JSON.stringify(schema, null, 2)}
`
      } else if (schemaExport === 'validate') {
        const validate = ajv.getSchema(schema.$id || key)
        const validateCode = standaloneCode(ajv, validate)
        fs.writeFileSync(path.join(dir, key, 'validate.js'), validateCode)
        code += `
// validate function compiled using ajv
// @ts-ignore
import validateUnsafe from './validate.js'
import { validateThrow } from '${inLib ? '../validation' : '@data-fair/lib/types/validation'}'
import { type ValidateFunction } from 'ajv'
export const validate = (data: any, lang: string = 'fr', name: string = 'data', internal?: boolean): ${mainTypeName} => {
  return validateThrow<${mainTypeName}>(validateUnsafe as unknown as ValidateFunction, data, lang, name, internal)
}
        `
      } else if (schemaExport === 'stringify') {
        const stringifyCode = fastJsonStringify(schema, { mode: 'standalone', schema: schemas })
        fs.writeFileSync(path.join(dir, key, 'stringify.js'), stringifyCode)
        code += `
// stringify function compiled using fast-json-stringify
// @ts-ignore
import stringifyUnsafe from './stringify.js'
// @ts-ignore
import flatstr from 'flatstr'
export const  stringify = (data: ${mainTypeName}): string => {
  const str = stringifyUnsafe(data)
  flatstr(str)
  return str
}
        `
      } else {
        throw new Error(`unsupported export ${schemaExport}`)
      }
    }
    fs.writeFileSync(path.join(dir, key, 'index.ts'), code)
  }
}
main()

/*
const { sessionStateSchema } = require('./session-state');
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
  } */

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
