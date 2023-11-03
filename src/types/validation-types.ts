import { type ValidateFunction } from 'ajv'

export type ValidateThrowType = <Type>(validate: ValidateFunction, data: any, lang?: string, name?: string, internal?: boolean) => Type
