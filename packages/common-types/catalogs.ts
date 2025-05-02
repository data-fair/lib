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
  assertConfigValid(catalogConfig: TCatalogConfig): asserts catalogConfig is TCatalogConfig
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
  {} &
  (Includes<TCapabilities, 'search'> extends true ? SearchParams : {}) &
  (Includes<TCapabilities, 'pagination'> extends true ? PaginationParams : {})

type SearchParams = { q?: string }
type PaginationParams = { page?: number; size?: number }

/**
 * The metadata of a catalog is used to describe the catalog and its capabilities.
 */
export type CatalogMetadata<TCapabilities extends Capability[]> = {
  /** The title of the plugin to be displayed in the UI */
  title: string
  /** The description of the plugin to be displayed in the UI */
  description: string
  /** The SVG Path icon of the plugin */
  icon: string
  capabilities: TCapabilities
}

/**
 * The list of capabilities that a catalog can have.
 * - listDatasets: The catalog can list datasets and get one dataset
 * - search: The catalog can use a search param in the listDatasets method
 * - pagination: The catalog can paginate the results of the listDatasets method
 * - publishDataset: The catalog can publish and delete datasets
 */
export type Capability = 'listDatasets' | 'search' | 'pagination' | 'additionalFilters' | 'publishDataset'

/**
 * The normalized dataset format.
 */
export type CatalogDataset = {
  id: string
  title: string
  description?: string
  keywords?: string[]
  origin?: string
  image?: string
  license?: string
  frequency?: string
  private?: boolean
  resources?: CatalogResourceDataset[]
}

export type CatalogResourceDataset = {
  id: string
  title: string
  format: string
  url: string
  fileName?: string
  mimeType?: string
  size?: number
}

// TODO use DataFair Publication Type
export type Publication = {
  /** Id of this publication, for a better search in database */
  publicationId: string
  /** Id of the catalog where the resource is published */
  catalogId: string
  /** Id of the dataset in the remote catalog */
  remoteDatasetId?: string
  /** Id of the resource in the dataset in the remote catalog, used if a DataFair dataset is published as a resource in a remote catalog */
  remoteResourceId?: string
  /** True if the publication is a resource, false or undefined if it is a dataset */
  isResource?: boolean
  /** A simple flag to clearly identify the publications that were successful. If "error" then the error key should be defined. */
  status: 'waiting' | 'published' | 'error' | 'deleted'
  /** Date of the last update for this publication */
  publishedAt?: string
  error?: string
}
