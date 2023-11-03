#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-var-requires */

import * as fs from 'node:fs'
import path from 'node:path'
import ajvModule from 'ajv'
import ajvFormatsModule from 'ajv-formats'
import ajvErrorsModule from 'ajv-errors'
import standaloneCodeModule from 'ajv/dist/standalone/index.js'
import fastJsonStringify from 'fast-json-stringify'
import { compile as compileTs } from 'json-schema-to-typescript'
import { pascalCase } from 'pascal-case'

// @ts-ignore
const Ajv = /** @type {typeof ajvModule.default} */ (ajvModule)
// @ts-ignore
const addFormats = /** @type {typeof ajvFormatsModule.default} */ (ajvFormatsModule)
// @ts-ignore
const ajvErrors = /** @type {typeof ajvErrorsModule.default} */ (ajvErrorsModule)
// @ts-ignore
const standaloneCode = /** @type {typeof standaloneCodeModule.default} */ (standaloneCodeModule)

const ajv = new Ajv({
  useDefaults: true,
  coerceTypes: 'array',
  allErrors: true,
  strict: false,
  code: { source: true, esm: true, optimize: true, lines: true }
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
  const inTest = pJsonName === '@data-fair/lib-test'

  const dir = path.resolve(process.argv[2] || './types')
  let prefix = process.argv[3]
  if (!prefix) prefix = pJsonName.replace('@data-fair/', 'https://github.com/data-fair/')
  console.log(`look for schemas in subdirectories of ${dir} and match with prefix ${prefix}`)

  /** @type {Record<string, any>} */
  const schemas = {}

  const keys = fs.readdirSync(dir)
    .filter(key => key !== 'node_modules' && key !== 'test' && key !== 'tests' && fs.lstatSync(path.join(dir, key)).isDirectory())

  if (!inLib) {
    const { schema: sessionStateSchema } = await import('../types/session-state/index.js')
    ajv.addSchema(sessionStateSchema)
    schemas[sessionStateSchema.$id] = sessionStateSchema
  }

  // first loop to read all raw schemas
  for (const key of keys) {
    if (key === 'node_modules' || !fs.lstatSync(path.join(dir, key)).isDirectory()) continue
    console.log(`compile schema for type ${key}`)
    const schema = JSON.parse(fs.readFileSync(path.join(dir, key, 'schema.json'), 'utf8'))
    schemas[schema.$id || key] = schema
    ajv.addSchema(schema, schema.$id || key)
  }

  const localResolver = {
    order: 1,
    /**
     * @param {{ url: string }} file
     * @returns {boolean}
     */
    canRead (file) {
      if (file.url.startsWith('https://github.com/data-fair/') && !schemas[file.url]) {
        throw new Error(`the $ref ${file.url} should probably be resolved locally but was not found`)
      }
      return !!schemas[file.url]
    },
    /**
     * @param {{ url: string }} file
     * @param {(err: any, doc?: any) => void} callback
     */
    async read (/** @type {{ url: string }} */file, callback) {
      callback(null, schemas[file.url])
    }
  }

  for (const key of keys) {
    // const ts = await compile(schema, key, { $refOptions: { resolve: { 'data-fair-lib': dataFairLibResolver, local: localResolver } } })
    const schema = JSON.parse(fs.readFileSync(path.join(dir, key, 'schema.json'), 'utf8'))
    const mainTypeName = pascalCase(schema.title || key)
    const schemaExports = schema['x-exports'] || ['types', 'validate', 'stringify', 'schema']
    let importsCode = ''
    let code = ''
    if (fs.existsSync(path.join(dir, key, 'validate.js'))) fs.unlinkSync(path.join(dir, key, 'validate.js'))
    if (fs.existsSync(path.join(dir, key, 'stringify.js'))) fs.unlinkSync(path.join(dir, key, 'stringify.js'))
    if (fs.existsSync(path.join(dir, key, 'index.js'))) fs.unlinkSync(path.join(dir, key, 'index.js'))
    if (fs.existsSync(path.join(dir, key, 'types.ts'))) fs.unlinkSync(path.join(dir, key, 'types.ts'))

    const $refOptions = { resolve: { local: localResolver } }
    let resolvedSchema
    if (schemaExports.includes('resolvedSchema')) {
      const refParser = await import('@bcherny/json-schema-ref-parser')
      resolvedSchema = await refParser.dereference(schema, $refOptions)
      if (resolvedSchema.$id) resolvedSchema.$id += '-resolved'
    }

    for (const schemaExport of schemaExports) {
      if (schemaExport === 'types') {
        const typesCode = await compileTs(schema, schema.$id || key,
          { bannerComment: '', unreachableDefinitions: true, $refOptions })
        fs.writeFileSync(path.join(dir, key, 'types.ts'), typesCode)
      } else if (schemaExport === 'schema') {
        code += `
export const schema = ${JSON.stringify(schema, null, 2)}
`
      } else if (schemaExport === 'resolvedSchema') {
        code += `
export const resolvedSchema = ${JSON.stringify(resolvedSchema, null, 2)}
`
      } else if (schemaExport === 'validate') {
        const validate = resolvedSchema ? ajv.compile(resolvedSchema) : ajv.getSchema(schema.$id || key)
        let validateCode = standaloneCode(ajv, validate)

        // some internal imports to ajv are not translated to esm, we do it here
        // cf https://github.com/ajv-validator/ajv-formats/pull/73
        if (validateCode.includes('require("ajv-formats/dist/formats")')) {
          validateCode = 'import { fullFormats } from "ajv-formats/dist/formats.js";\n' + validateCode
          validateCode = validateCode.replace(/require\("ajv-formats\/dist\/formats"\)\.fullFormats/g, 'fullFormats')
        }
        if (validateCode.includes('require("ajv/dist/runtime/ucs2length")')) {
          validateCode = 'import ucs2length from "ajv/dist/runtime/ucs2length.js";\n' + validateCode
          validateCode = validateCode.replace(/require\("ajv\/dist\/runtime\/ucs2length"\)/g, 'ucs2length')
        }

        let validationImport = '@data-fair/lib/cjs/types/validation'
        if (inLib) validationImport = '../validation.js'
        if (inTest) validationImport = '../../../validation.js'
        fs.writeFileSync(path.join(dir, key, 'validate.js'), '// @ts-nocheck\n\n' + validateCode)
        importsCode += `
// validate function compiled using ajv
// @ts-ignore
import validateUnsafe from './validate.js'
import { validateThrow } from '${validationImport}'`
        code += `
/**
 * @param {any} data
 * @param {string} [lang]
 * @param {string} [name]
 * @param {boolean} [internal]
 * @returns {import('./types.js').${mainTypeName}}
 */
export const validate = (data, lang = 'fr', name = 'data', internal) => {
  return validateThrow(/** @type {import('ajv').ValidateFunction} */(validateUnsafe), data, lang, name, internal)
}
`
      } else if (schemaExport === 'stringify') {
        const stringifyCode = fastJsonStringify(schema, { mode: 'standalone', schema: schemas })
        fs.writeFileSync(path.join(dir, key, 'stringify.js'), '// @ts-nocheck\n\n' + stringifyCode.replace('module.exports = main', 'export default main'))
        importsCode += `
// stringify function compiled using fast-json-stringify
// @ts-ignore
import stringifyUnsafe from './stringify.js'
// @ts-ignore
import flatstr from 'flatstr'
`
        code += `
/**
 * @param {import('./types.js').${mainTypeName}} data
 * @returns {string}
 */
export const stringify = (data) => {
  const str = stringifyUnsafe(data)
  flatstr(str)
  return str
}
`
      } else {
        throw new Error(`unsupported export ${schemaExport}`)
      }
    }
    fs.writeFileSync(path.join(dir, key, 'index.js'), importsCode + '\n' + code)
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
