#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pascalCase } from 'change-case'
import { program } from 'commander'
import clone from '@data-fair/lib-utils/clone.js'
import { fdir as Fdir } from 'fdir'
import { makeLocalDefs } from '@data-fair/lib-utils/json-schema.js'
import { ensureDir } from '@data-fair/lib-node/fs.js'
// import { ensureDir } from '@data-fair/lib-node/fs.js'

type TypesBuilderOptions = { mjs: boolean, vjsfDir?: string }
type FileRef = { url: string }
type SchemaExport = ('types' | 'validate' | 'stringify' | 'schema' | 'resolvedSchema' | 'resolvedSchemaJson' | 'localDefsSchema' | 'localDefsSchemaJson' | 'vjsf')

const hashObject = (obj: any) => {
  return createHash('md5').update(JSON.stringify(obj)).digest('hex')
}

const main = async (dir: string, options: TypesBuilderOptions) => {
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

  const rootDir = path.resolve(dir)

  console.log(`scan dir ${dir} looking for pattern */schema.{json|js|ts}`)
  const dirs: [string, string, string][] = []
  const crawler = (new Fdir())
    .exclude((dirName) => ['node_modules', 'data'].includes(dirName) || dirName.startsWith('.'))
    .filter((file, isDirectory) => {
      return (!isDirectory && ['schema.json', 'schema.js', 'schema.ts'].includes(path.basename(file)))
    })
    .withFullPaths()
  const files = crawler.crawl(rootDir).sync()
  for (const file of files) {
    const fileName = path.basename(file)
    const dir = path.dirname(file)
    if (dirs.some(d => d[0] === dir)) continue
    dirs.push([dir, path.basename(dir), fileName])
  }
  console.log(`found ${dirs.length} types to compile`)

  const schemas: Record<string, any> = {}
  if (!inLib) {
    const sessionStateSchema = (await import('@data-fair/lib-common-types/session/schema.js')).default
    schemas[sessionStateSchema.$id] = sessionStateSchema
    const accountSchema = (await import('@data-fair/lib-common-types/account/schema.js')).default
    schemas[accountSchema.$id] = accountSchema
    const appSchema = (await import('@data-fair/lib-common-types/application/schema.js')).default
    schemas[appSchema.$id] = appSchema
    const eventSchema = (await import('@data-fair/lib-common-types/event/schema.js')).default
    schemas[eventSchema.$id] = eventSchema
    const catalogSchema = (await import('@data-fair/lib-common-types/catalog/schema.js')).default
    schemas[catalogSchema.$id] = catalogSchema
    const themeSchema = (await import('@data-fair/lib-common-types/theme/schema.js')).default
    schemas[themeSchema.$id] = themeSchema
  }

  const schemaIds: Record<string, string> = {}
  for (const [dir, key, fileName] of dirs) {
    const filePath = path.join(dir, fileName)
    let schema
    if (fileName === 'schema.json') schema = JSON.parse(readFileSync(filePath, 'utf8'))
    else schema = clone((await import(filePath)).default)
    schema.$id = schema.$id || key
    if (schemas[schema.$id]) throw new Error(`duplicate schema key ${schema.$id}`)
    schemas[schema.$id] = schema
    schemaIds[dir] = schema.$id
  }

  const localResolver = {
    order: 1,
    canRead (file: FileRef): boolean {
      if (file.url.startsWith('https://github.com/data-fair/') && !schemas[file.url]) {
        throw new Error(`the $ref ${file.url} should probably be resolved locally but was not found`)
      }
      return !!schemas[file.url]
    },
    async read (file: FileRef, callback: (err: any, doc?: any) => void) {
      const clonedSchema = clone(schemas[file.url])
      delete clonedSchema.$id
      callback(null, clonedSchema)
    }
  }

  const hashes: Record<string, string> = {}
  let existingHashes: Record<string, string> | undefined
  try {
    existingHashes = JSON.parse(readFileSync('node_modules/.cache/@data-fair/lib-types-builder/hashes.json', 'utf8'))
  } catch (err: any) {}

  for (const [dir, key] of dirs) {
    console.log(`compile ${key} in ${dir}`)

    const schema = schemas[schemaIds[dir]]
    if (schema.$id) console.log(`  $id: ${JSON.stringify(schema.$id)}`)
    const mainTypeName = pascalCase(schema.title || key)

    const $refOptions = { resolve: { local: localResolver } }
    const refParser = await import('@bcherny/json-schema-ref-parser')
    const localDefsSchema = makeLocalDefs(schemas, schema.$id)

    hashes[dir] = hashObject(localDefsSchema)
    if (hashes[dir] === existingHashes?.[dir]) {
      console.log('  no change in schema, use previously built version')
      continue
    }

    const resolvedSchema = (await refParser.dereference(schema, $refOptions)) as any
    if (resolvedSchema.$id) resolvedSchema.$id += '-resolved'

    const schemaExports: SchemaExport[] = schema['x-exports'] || ['types', 'validate']
    console.log(`  exports: ${JSON.stringify(schemaExports)}`)
    let importsCode = '/* eslint-disable */\n\n'
    let code = ''
    let dtsCode = ''
    if (existsSync(path.join(dir, '.type'))) rmSync(path.join(dir, '.type'), { recursive: true })
    mkdirSync(path.join(dir, '.type'))

    code += `
export const schemaExports = ${JSON.stringify(schemaExports, null, 2)}
`
    dtsCode += `
export const schemaExports: string[]
`

    for (const schemaExport of schemaExports) {
      if (schemaExport === 'types') {
        const schemaJSTTOpts = schema['x-jstt'] || {}
        console.log(`  json-schema-to-typescript options: ${JSON.stringify(schemaJSTTOpts)}`)
        const compileTs = (await import('json-schema-to-typescript')).compile
        let typesCode = await compileTs(clone(schema), schema.$id || key,
          { bannerComment: '', unreachableDefinitions: true, ...schemaJSTTOpts, $refOptions })

        // types are better because of this problem with index definitions https://github.com/microsoft/TypeScript/issues/15300
        // but see the discussion here https://github.com/bcherny/json-schema-to-typescript/issues/461 for why
        // json-schema-to-typescript uses interfaces, maybe we will have to make this replace optional
        typesCode = typesCode.replace(/export interface (.*) {/g, 'export type $1 = {')

        dtsCode += `
// see https://github.com/bcherny/json-schema-to-typescript/issues/439 if some types are not exported
${typesCode}
`
      } else if (schemaExport === 'schema') {
        code += `
export const schema = ${JSON.stringify(schema, null, 2)}
`
        dtsCode += `
export declare const schema: any
        `
      } else if (schemaExport === 'resolvedSchema') {
        code += `
export const resolvedSchema = ${JSON.stringify(resolvedSchema, null, 2)}
`
        dtsCode += `
export declare const resolvedSchema: any
        `
      } else if (schemaExport === 'resolvedSchemaJson') {
        delete resolvedSchema['x-exports']
        writeFileSync(path.join(dir, '.type', 'resolved-schema.json'), JSON.stringify(resolvedSchema, null, 2))
      } else if (schemaExport === 'localDefsSchema') {
        code += `
export const localDefsSchema = ${JSON.stringify(localDefsSchema, null, 2)}
`
        dtsCode += `
export declare const localDefsSchema: any
        `
      } else if (schemaExport === 'localDefsSchemaJson') {
        delete resolvedSchema['x-exports']
        writeFileSync(path.join(dir, '.type', 'local-defs-schema.json'), JSON.stringify(resolvedSchema, null, 2))
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

        const validationImport = '@data-fair/lib-validation'
        writeFileSync(path.join(dir, '.type', 'validate.' + (options.mjs ? 'mjs' : 'js')), '/* eslint-disable */\n// @ts-nocheck\n\n' + validateCode)
        importsCode += `
import validate from './validate.${options.mjs ? 'mjs' : 'js'}'
import { assertValid as assertValidGeneric } from '${validationImport}'`
        code += `
export { validate } from './validate.js'
export function assertValid(data, options) {
  assertValidGeneric(validate, data, options)
}
export function returnValid(data, options) {
  assertValid(data, options)
  return data
}
`
        dtsCode += `
export declare function validate(data: any): data is ${mainTypeName}
export declare function assertValid(data: any, options?: import('${validationImport}').AssertValidOptions): asserts data is ${mainTypeName}
export declare function returnValid(data: any, options?: import('${validationImport}').AssertValidOptions): ${mainTypeName}
      `
      } else if (schemaExport === 'stringify') {
        // TODO: is this really a good idea ? over-optimization ?
        throw new Error('stringify export is not supported')
        //         const fastJsonStringify = (await import('fast-json-stringify')).default
        //         const stringifyCode = fastJsonStringify(schema, { mode: 'standalone', schema: schemas })
        //           .replace('module.exports = ', 'export default (')
        //           .replace('const { dependencies } = require(\'fast-json-stringify/lib/standalone\')', 'import {dependencies} from \'fast-json-stringify/lib/standalone.js\'') +
        //           ')'

        //         writeFileSync(path.join(dir, '.type', 'stringify.' + (options.mjs ? 'mjs' : 'js')), '/* eslint-disable */\n// @ts-nocheck\n\n' + stringifyCode)
        //         importsCode += `
        // // stringify function compiled using fast-json-stringify
        // // @ts-ignore
        // import stringifyUnsafe from './stringify.${options.mjs ? 'mjs' : 'js'}'
        // // @ts-ignore
        // import flatstr from 'flatstr'
        // `
        //         code += `
        // /**
        //  * @param {import('./types.js').${mainTypeName}} data
        //  * @returns {string}
        //  */
        // export const stringify = (data) => {
        //   const str = stringifyUnsafe(data)
        //   flatstr(str)
        //   return str
        // }
        // `
      } else if (schemaExport === 'vjsf') {
        if (!options.vjsfDir) {
          console.error('vjsf exports requires the vjsf-dir option')
        } else {
          const vjsfLocales: string[] = schema['x-vjsf-locales'] ?? ['fr']
          let compName = key

          const vjsfDir = path.resolve(options.vjsfDir)
          const compileVjsf = (await import('@koumoul/vjsf-compiler')).compile
          const { resolveXI18n } = await import('@json-layout/core')

          for (const locale of vjsfLocales) {
            const schemaVjsfOpts = { ...schema['x-vjsf'] }
            if (schemaVjsfOpts.compName) {
              compName = schemaVjsfOpts.compName
              delete schemaVjsfOpts.compName
            }
            console.log(`  vjsf options: ${JSON.stringify(schemaVjsfOpts)}`)
            const otherSchemas = { ...schemas }
            for (const [key, otherSchema] of Object.entries(schemas)) {
              if (key === schema.$id) continue
              otherSchemas[key] = clone(otherSchema)
              resolveXI18n(otherSchemas[key], locale)
            }
            if (schema.$id) delete otherSchemas[schema.$id]
            schemaVjsfOpts.ajvOptions = { schemas: otherSchemas }

            const vjsfCode = await compileVjsf(schema, { locale, ...schemaVjsfOpts })
            const vjsfFilePath = path.join(vjsfDir, vjsfLocales.length > 1 ? `vjsf-${compName}-${locale}.vue` : `vjsf-${compName}.vue`)
            console.log(`  vjsf ${locale} component path : ${vjsfFilePath}`)
            writeFileSync(vjsfFilePath, vjsfCode)
          }

          if (vjsfLocales.length > 1) {
            const globalVjsfCode = `
<script setup>
// @ts-nocheck

import { defineAsyncComponent, defineProps, defineEmits } from 'vue'
import { emits } from '@koumoul/vjsf/composables/use-vjsf.js'

const localeComps = {
  ${vjsfLocales.map(locale => `${locale}: defineAsyncComponent(() => import('./vjsf-${compName}-${locale}.vue'))`).join(',\n  ')}
}

const props = defineProps({
  locale: {
    type: String,
    required: true
  },
  modelValue: {
    type: null,
    default: null
  },
  options: {
    /** @type import('vue').PropType<import('@koumoul/vjsf/types.js').PartialVjsfOptions | null> */
    type: Object,
    default: null
  }
})

const emit = defineEmits(emits)
</script>

<template>
<component :is="localeComps[locale]" :model-value="modelValue" :options="options" @update:model-value="value => emit('update:modelValue', value)" @update:state="state => emit('update:state')">
  <template v-for="(_, name) in $slots" v-slot:[name]="slotData">
    <slot :name="name" v-bind="slotData" />
  </template>
</component>
</template>
`

            const vjsfFilePath = path.join(vjsfDir, `vjsf-${compName}.vue`)
            console.log(`  vjsf global component path : ${vjsfFilePath}`)
            writeFileSync(vjsfFilePath, globalVjsfCode)
          }
        }
      } else {
        throw new Error(`unsupported export ${schemaExport}`)
      }
    }
    writeFileSync(path.join(dir, '.type', 'index.' + (options.mjs ? 'mjs' : 'js')), importsCode + '\n' + code)
    writeFileSync(path.join(dir, '.type', 'index.d.ts'), dtsCode)

    const indexFilePath = path.join(dir, 'index.' + (options.mjs ? 'mjs' : 'js'))
    const tsIndexFilePath = path.join(dir, 'index.ts')
    const dtsIndexFilePath = path.join(dir, 'index.d.ts')
    if (!existsSync(indexFilePath) && !existsSync(tsIndexFilePath) && !existsSync(dtsIndexFilePath)) {
      writeFileSync(indexFilePath, `export * from './.type/index.${options.mjs ? 'mjs' : 'js'}'\n`)
      writeFileSync(dtsIndexFilePath, `export * from './.type/index.${options.mjs ? 'mjs' : 'js'}'\n`)
    }
  }

  await ensureDir('node_modules/.cache/@data-fair/lib-types-builder')
  writeFileSync('node_modules/.cache/@data-fair/lib-types-builder/hashes.json', JSON.stringify(hashes))
}

program
  .argument('[dir]', 'root directory to scan for schema.json files', './')
  .option('--mjs', 'produce mjs files', false)
  .option('--vjsf-dir <dir>', 'the directory where built vjsf components will be written')
  .action(main)
  .parseAsync()
