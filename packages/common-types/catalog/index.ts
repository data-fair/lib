import type { Capability, Folder, Metadata, Publication, Resource } from './.type/index.js'

export * from './.type/index.js'

/** Utility type to check if a type T includes a type U */
type Includes<T extends any[], U> = U extends T[number] ? true : false

/**
 * Generic catalog plugin interface.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @template TCapabilities - The capabilities of the catalog.
 */
export type CatalogPlugin<TCatalogConfig = object, TCapabilities extends Capability[] = Capability[]> =
  BaseCatalogPlugin<TCatalogConfig, TCapabilities> &
  (Includes<TCapabilities, 'import'> extends true ? WithImport<TCatalogConfig, TCapabilities> : {}) &
  (Includes<TCapabilities, 'publishDataset'> extends true ? WithPublishDataset<TCatalogConfig> : {}) &
  (Includes<TCapabilities, 'deletePublication'> extends true ? WithDeletePublication<TCatalogConfig> : {})

type BaseCatalogPlugin<TCatalogConfig, TCapabilities extends Capability[]> = {
  metadata: CatalogMetadata<TCapabilities>
  configSchema: TCatalogConfig
  /** Function to validates the catalog configuration. */
  assertConfigValid(catalogConfig: any): asserts catalogConfig is TCatalogConfig
}

/**
 * Type for catalog implementations that support listing and retrieving resources.
 * Resources are organized within folders in the catalog structure.
 *
 * @template TCatalogConfig - Configuration type for the catalog
 * @template TCapabilities - Array of capability types that the catalog supports
 */
type WithImport<TCatalogConfig, TCapabilities extends Capability[]> = {
  /** List available folders and resources in the catalog. */
  list: (context: ListContext<TCatalogConfig, TCapabilities>) => Promise<{ count: number; results: (Folder | Resource)[], path: Folder[] }>;
  /** Get informations about a specific resource. */
  getResource: (catalogConfig: TCatalogConfig, resourceId: string) => Promise<Resource | undefined>;
  /**
   * Download the resource to a temporary file from a context
   * @returns The path to the downloaded resource file, or undefined if the download failed
   */
  downloadResource: (context: DownloadResourceContext<TCatalogConfig>) => Promise<string | undefined>;
}
  & (Includes<TCapabilities, 'additionalFilters'> extends true ? { filtersSchema: Record<string, any> } : {})
  & (Includes<TCapabilities, 'importConfig'> extends true ? { importConfigSchema: Record<string, any> } : {})

type WithPublishDataset<TCatalogConfig> = {
  /**
   * Publish/Update a dataset or add/update a resource to a dataset
   * @param catalogConfig The configuration of the catalog
   * @param dataset The datafair dataset to publish
   * @param publication The publication to process
   * @returns A promise that is resolved when the dataset is published
   */
  publishDataset: (catalogConfig: TCatalogConfig, dataset: object, publication: Publication) => Promise<Publication>
}

type WithDeletePublication<TCatalogConfig> = {
  /**
   * Delete a dataset or remove a resource from a dataset
   * @param catalogConfig The configuration of the catalog
   * @param datasetId The id of the remoteDataset to delete, or the dataset where the resource to delete is
   * @param resourceId The id of the resource to delete
   */
  deleteDataset: (catalogConfig: TCatalogConfig, datasetId: string, resourceId?: string) => Promise<void>
}

export type ListContext<TCatalogConfig, TCapabilities extends Capability[]> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The specific import configuration, if applicable */
  params: ListParams<TCapabilities>
}

type ListParams<TCapabilities extends Capability[]> = {
  /** The current level folder is used to list subfolders and resources. */
  currentFolderId?: string
} &
  (Includes<TCapabilities, 'search'> extends true ? SearchParams : {}) &
  (Includes<TCapabilities, 'pagination'> extends true ? PaginationParams : {}) &
  (Includes<TCapabilities, 'additionalFilters'> extends true ? Record<string, string> : {})

type SearchParams = { q?: string }
type PaginationParams = { page?: number; size?: number }

export type DownloadResourceContext<TCatalogConfig> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The specific import configuration, if applicable */
  importConfig: Record<string, any>
  /** The ID of the remote resource to download */
  resourceId: string,
  /** The path to the working directory */
  tmpDir: string
}
/**
 * The metadata of the catalog plugin.
 * @template TCapabilities - This ensures that the `capabilities` field in the metadata is of the same type as `TCapabilities`.
 */
export type CatalogMetadata<TCapabilities extends Capability[]> = Metadata & {
  capabilities: TCapabilities
}
