#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { pascalCase } from 'change-case'
import { program } from 'commander'
import clone from '../clone.js'

/**
 * @param {string} dir
 * @param {{mjs: boolean}} options
 */
const main = async (dir, options) => {
  let pJsonName
  try {
    const pJson = JSON.parse(readFileSync('./package.json', 'utf8'))
    pJsonName = pJson.name
  } catch (err) {
    // nothing to do
  }
  if (!pJsonName) {
    const pJson = JSON.parse(readFileSync('../package.json', 'utf8'))
    pJsonName = pJson.name
  }
  const inLib = pJsonName === '@data-fair/lib'
  const inTest = pJsonName === '@data-fair/lib-test'

  const rootDir = path.resolve(dir)

  console.log(`scan dir ${dir} looking for pattern */schema.{json|js}`)
  const dirs = []
  for (const _file of readdirSync(rootDir, { recursive: true })) {
    const file = /** @type {string} */(_file)
    const fileName = path.basename(file)
    if (!['schema.json', 'schema.js'].includes(fileName)) continue
    const filePath = path.resolve(rootDir, file.toString())
    const parts = filePath.split(path.sep)
    if (parts.includes('node_modules')) continue
    const lastParts = parts.slice(-3)
    if (lastParts[1] === 'type' || lastParts[1] === 'types') dirs.push([path.dirname(filePath), lastParts[0], fileName])
    else dirs.push([path.dirname(filePath), lastParts[1], fileName])
  }
  console.log(`found ${dirs.length} types to compile`)

  /** @type {Record<string, any>} */
  const schemas = {}
  if (!inLib) {
    const { schema: sessionStateSchema } = await import('../shared/session/.type/index.js')
    schemas[sessionStateSchema.$id] = sessionStateSchema
    const { schema: accountSchema } = await import('../shared/account/.type/index.js')
    schemas[accountSchema.$id] = accountSchema
    const { schema: appSchema } = await import('../shared/application/.type/index.js')
    schemas[appSchema.$id] = appSchema
    const { schema: colorsSchema } = await import('../color-scheme/.type/index.js')
    schemas[colorsSchema.$id] = colorsSchema
  }

  for (const [dir, key, fileName] of dirs) {
    const filePath = path.join(dir, fileName)
    let schema
    if (fileName === 'schema.json') schema = JSON.parse(readFileSync(filePath, 'utf8'))
    else schema = clone((await import(filePath)).default)
    schema.$id = schema.$id || key
    if (schemas[schema.$id]) throw new Error(`duplicate schema key ${schema.$id}`)
    schemas[schema.$id] = schema
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
      const clonedSchema = clone(schemas[file.url])
      delete clonedSchema.$id
      callback(null, clonedSchema)
    }
  }

  for (const [dir, key, fileName] of dirs) {
    console.log(`compile ${key} in ${dir}`)
    const filePath = path.join(dir, fileName)
    let schema
    if (fileName === 'schema.json') schema = JSON.parse(readFileSync(filePath, 'utf8'))
    else schema = clone((await import(filePath)).default)
    if (schema.$id) console.log(`  $id: ${JSON.stringify(schema.$id)}`)
    const mainTypeName = pascalCase(schema.title || key)
    /** @type {('types' | 'validate' | 'stringify' | 'schema' | resolvedSchema | 'resolvedSchemaJson')[]} */
    const schemaExports = schema['x-exports'] || ['types', 'validate', 'stringify', 'schema']
    console.log(`  exports: ${JSON.stringify(schemaExports)}`)
    let importsCode = '/* eslint-disable */\n\n'
    let code = ''
    if (existsSync(path.join(dir, '.type'))) rmSync(path.join(dir, '.type'), { recursive: true })
    mkdirSync(path.join(dir, '.type'))

    const $refOptions = { resolve: { local: localResolver } }
    let resolvedSchema
    if (schemaExports.includes('resolvedSchema') || schemaExports.includes('resolvedSchemaJson')) {
      const refParser = await import('@bcherny/json-schema-ref-parser')
      resolvedSchema = /** @type {any} */(await refParser.dereference(schema, $refOptions))
      if (resolvedSchema.$id) resolvedSchema.$id += '-resolved'
    }

    code += `
/** @type {string[]} */
export const schemaExports = ${JSON.stringify(schemaExports, null, 2)}
`

    for (const schemaExport of schemaExports) {
      if (schemaExport === 'types') {
        const compileTs = (await import('json-schema-to-typescript')).compile
        const typesCode = await compileTs(clone(schema), schema.$id || key,
          { bannerComment: '', unreachableDefinitions: true, $refOptions })
        writeFileSync(path.join(dir, '.type', 'types.ts'), '/* eslint-disable */\n\n' + typesCode)
        const importedTypes = [mainTypeName]
        if (schema.$defs) {
          for (const key of Object.keys(schema.$defs)) {
            importedTypes.push(pascalCase(schema.$defs[key].title ?? key))
          }
        }
        code += '\n// see https://github.com/bcherny/json-schema-to-typescript/issues/439 if some types are not exported\n'
        code += '/**'
        for (const importedType of importedTypes) {
          code += `\n * @typedef {import('./types.js').${importedType}} ${importedType}`
        }
        code += '\n */\n'
      } else if (schemaExport === 'schema') {
        code += `
export const schema = ${JSON.stringify(schema, null, 2)}
`
      } else if (schemaExport === 'resolvedSchema') {
        code += `
export const resolvedSchema = ${JSON.stringify(resolvedSchema, null, 2)}
`
      } else if (schemaExport === 'resolvedSchemaJson') {
        delete resolvedSchema['x-exports']
        writeFileSync(path.join(dir, '.type', 'resolved-schema.json'), JSON.stringify(resolvedSchema, null, 2))
      } else if (schemaExport === 'validate') {
        const Ajv = (await import('ajv')).default
        const addFormats = (await import('ajv-formats')).default
        const ajvErrors = (await import('ajv-errors')).default
        const standaloneCode = (await import('ajv/dist/standalone/index.js')).default

        const schemaAjvOpts = schema['x-ajv'] || {}
        console.log(`  ajv options: ${JSON.stringify(schemaAjvOpts)}`)
        // @ts-ignore
        const ajv = new Ajv({
          ...schemaAjvOpts,
          allErrors: true,
          strict: false,
          code: { source: true, esm: true, optimize: true, lines: true },
          schemas
        })
        // @ts-ignore
        addFormats(ajv)
        // @ts-ignore
        ajvErrors(ajv)
        const validate = resolvedSchema ? ajv.compile(resolvedSchema) : ajv.getSchema(schema.$id || key)
        // @ts-ignore
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

        let validationImport = '@data-fair/lib/types/validation.js'
        if (inLib) validationImport = '#lib/types/validation.js'
        if (inTest) validationImport = '../../../../validation.js'
        writeFileSync(path.join(dir, '.type', 'validate.' + (options.mjs ? 'mjs' : 'js')), '/* eslint-disable */\n// @ts-nocheck\n\n' + validateCode)
        importsCode += `
// validate function compiled using ajv
// @ts-ignore
import validateUnsafe from './validate.${options.mjs ? 'mjs' : 'js'}'
import { assertValid as assertValidGeneric } from '${validationImport}'`
        code += `
/** @type {{errors?: import('ajv').ErrorObject[] | null | undefined} & ((data: any) => data is ${mainTypeName})} */
export const validate = /** @type {import('ajv').ValidateFunction} */(validateUnsafe)
/** @type {(data: any, options?: import('${validationImport}').AssertValidOptions) => asserts data is ${mainTypeName}} */
export const assertValid = (data, options) => {
  assertValidGeneric(/** @type {import('ajv').ValidateFunction} */(validateUnsafe), data, options)
}
/**
 * @param {any} data
 * @param {import('${validationImport}').AssertValidOptions} [options]
 * @return {${mainTypeName}}
*/
export const returnValid = (data, options) => {
  assertValid(data, options)
  return data
}
`
      } else if (schemaExport === 'stringify') {
        const fastJsonStringify = (await import('fast-json-stringify')).default
        const stringifyCode = fastJsonStringify(schema, { mode: 'standalone', schema: schemas })
          .replace('module.exports = ', 'export default (')
          .replace('const { dependencies } = require(\'fast-json-stringify/lib/standalone\')', 'import {dependencies} from \'fast-json-stringify/lib/standalone.js\'') +
          ')'

        writeFileSync(path.join(dir, '.type', 'stringify.' + (options.mjs ? 'mjs' : 'js')), '/* eslint-disable */\n// @ts-nocheck\n\n' + stringifyCode)
        importsCode += `
// stringify function compiled using fast-json-stringify
// @ts-ignore
import stringifyUnsafe from './stringify.${options.mjs ? 'mjs' : 'js'}'
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
    writeFileSync(path.join(dir, '.type', 'index.' + (options.mjs ? 'mjs' : 'js')), importsCode + '\n' + code)

    const indexFilePath = path.join(dir, 'index.' + (options.mjs ? 'mjs' : 'js'))
    if (!existsSync(indexFilePath)) writeFileSync(indexFilePath, `export * from './.type/index.${options.mjs ? 'mjs' : 'js'}'\n`)
  }
}

program
  .argument('[dir]', 'root directory to scan for schema.json files', './')
  .option('--mjs', 'produce mjs files', false)
  .action(main)
  .parseAsync()
