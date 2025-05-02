import type { Capability, Metadata, CatalogDataset, Publication } from './.type/index.js'

export * from './.type/index.js'

/** Utility type to check if a type T includes a type U */
type Includes<T extends any[], U> = U extends T[number] ? true : false

/**
 * Generic catalog plugin interface.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @template TCapabilities - The capabilities of the catalog.
 */
export type CatalogPlugin<TCatalogConfig = any, TCapabilities extends Capability[] = any> =
  BaseCatalogPlugin<TCatalogConfig, TCapabilities> &
  (Includes<TCapabilities, 'listDatasets'> extends true ? WithListDatasets<TCatalogConfig, TCapabilities> : {}) &
  (Includes<TCapabilities, 'publishDataset'> extends true ? WithPublishDataset<TCatalogConfig> : {})

type BaseCatalogPlugin<TCatalogConfig, TCapabilities extends Capability[]> = {
  metadata: CatalogMetadata<TCapabilities>
  configSchema: TCatalogConfig
  /** Function to validates the catalog configuration. */
  assertConfigValid(catalogConfig: any): asserts catalogConfig is TCatalogConfig
}

type WithListDatasets<TCatalogConfig, TCapabilities extends Capability[]> = {
  /** List available datasets in the catalog. */
  listDatasets: (catalogConfig: TCatalogConfig, params: ListDatasetsParams<TCapabilities>) => Promise<{ count: number; results: CatalogDataset[] }>;
  /** Get a specific dataset. */
  getDataset: (catalogConfig: TCatalogConfig, datasetId: string) => Promise<CatalogDataset | undefined>;
}
  & (Includes<TCapabilities, 'additionalFilters'> extends true ? { filtersSchema: Record<string, any> } : {})

type WithPublishDataset<TCatalogConfig> = {
  /**
   * Publish/Update a dataset or add/update a resource to a dataset
   * @param catalogConfig The configuration of the catalog
   * @param dataset The datafair dataset to publish
   * @param publication The publication in the datafair dataset to process
   * @returns A promise that resolves to the updated publication object with the publicationId, the remoteDatasetId and the status after the dataset is published
   */
  publishDataset: (catalogConfig: TCatalogConfig, dataset: any, publication: Publication) => Promise<Publication>
  /**
   * Delete a dataset or remove a resource from a dataset
   * @param catalogConfig The configuration of the catalog
   * @param datasetId The id of the remoteDataset to delete, or the dataset where the resource to delete is
   * @param resourceId The id of the resource to delete
   */
  deleteDataset: (catalogConfig: TCatalogConfig, datasetId: string, resourceId?: string) => Promise<void>
}

/**
 * The parameters for the listDatasets method.
 * - search capability : take param q
 * - pagination capability : take params page and size
 */
type ListDatasetsParams<TCapabilities extends Capability[]> =
  (Includes<TCapabilities, 'search'> extends true ? SearchParams : {}) &
  (Includes<TCapabilities, 'pagination'> extends true ? PaginationParams : {}) &
  (Includes<TCapabilities, 'additionalFilters'> extends true ? Record<string, string> : {})

type SearchParams = { q?: string }
type PaginationParams = { page?: number; size?: number }

/**
 * The metadata of the catalog plugin.
 * @template TCapabilities - This ensures that the `capabilities` field in the metadata is of the same type as `TCapabilities`.
 */
export type CatalogMetadata<TCapabilities extends Capability[]> = Metadata & {
  capabilities: TCapabilities
}
