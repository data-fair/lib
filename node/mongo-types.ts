import { type IndexSpecification, type CreateIndexesOptions } from 'mongodb'

export type IndexDefinitions = Record<string, Record<string, IndexSpecification | [IndexSpecification, CreateIndexesOptions]>>
