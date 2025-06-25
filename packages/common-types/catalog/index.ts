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
  assertConfigValid(catalogConfig: any): asserts catalogConfig is TCatalogConfig,
  /**
   * Prepare function to extract secrets to cipher from the configuration,
   * and dynamically update capabilities.
   * This function is called when the catalog configuration is updated.
   * It can be used to:
   * - throw additional errors to validate the config
   * - remove secrets from the config and store them in the secrets object :<br>
   *      This function must copy the configuration fields to be encrypted into the secret object,
   *      then replace these fields in the configuration with ****.
   *      If the received configuration already contains ****, the secret should not be copied.
   *      If the field is empty, it should delete the secret.
   * - update the capabilities of the catalog based on the configuration
   *
   * @param context.catalogConfig The catalog configuration, that can contain secrets to extract
   * @param context.capabilities The actuals capabilities of the catalog
   * @param context.secrets The actuals deciphered secrets of the catalog
   * @returns A promise that resolves to an object containing the catalog configuration, capabilities, and secrets.
   */
  prepare: (context: PrepareContext<TCatalogConfig, TCapabilities>) => Promise<{
    catalogConfig?: TCatalogConfig,
    capabilities?: TCapabilities,
    secrets?: Record<string, string>
  }>
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
  list: (context: ListContext<TCatalogConfig, TCapabilities>) => Promise<{
    /** The total number of items in the current folder */
    count: number;
    /** The list of folders and resources in the current folder, filtered with the search and pagination parameters */
    results: (Folder | Resource)[],
    /** The path to the current folder, including the current folder itself, used to navigate back */
    path: Folder[]
  }>;
  /** Get informations about a specific resource. */
  getResource: (context: GetResourceContext<TCatalogConfig>) => Promise<Resource | undefined>;
  /**
   * Download the resource to a temporary file from a context
   * @returns The path to the downloaded resource file, or undefined if the download failed
   */
  downloadResource: (context: DownloadResourceContext<TCatalogConfig>) => Promise<string | undefined>;
}
  & (Includes<TCapabilities, 'additionalFilters'> extends true ? { listFiltersSchema: Record<string, any> } : {})
  & (Includes<TCapabilities, 'importConfig'> extends true ? { importConfigSchema: Record<string, any> } : {})

type WithPublishDataset<TCatalogConfig> = {
  /**
   * Publish/Update a dataset or add/update a resource to a dataset
   * @param catalogConfig The configuration of the catalog
   * @param dataset The datafair dataset to publish
   * @param publication The publication to process
   * @param publicationSite The site where the user will be redirected from the remote dataset
   * @returns A promise that is resolved when the dataset is published
   */
  publishDataset: (context: PublishDatasetContext<TCatalogConfig>) => Promise<Publication>
}

type WithDeletePublication<TCatalogConfig> = {
  /**
   * Delete a dataset or remove a resource from a dataset
   * @param catalogConfig The configuration of the catalog
   * @param datasetId The id of the remoteDataset to delete, or the dataset where the resource to delete is
   * @param resourceId The id of the resource to delete
   */
  deleteDataset: (context: DeletePublicationContext<TCatalogConfig>) => Promise<void>
}

/**
 * Context for preparing a catalog configuration.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @template TCapabilities - The capabilities of the catalog.
 * @property catalogConfig - The catalog configuration, that can contain secrets to extract.
 * @property capabilities - The actuals capabilities of the catalog.
 * @property secrets - The actuals deciphered secrets of the catalog, if any.
 */
export type PrepareContext<TCatalogConfig, TCapabilities extends Capability[]> = {
  /** The catalog configuration, that can contain secrets to extract */
  catalogConfig: TCatalogConfig,
  /** The actuals capabilities of the catalog */
  capabilities: TCapabilities,
  /** The actuals deciphered secrets of the catalog */
  secrets: Record<string, string>,
}

export type ListContext<TCatalogConfig, TCapabilities extends Capability[]> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The specific import configuration, if applicable */
  params: ListParams<TCapabilities>
}

/**
 * Parameters for listing resources in a catalog.
 * @template TCapabilities - The capabilities of the catalog.
 * @property currentFolderId - The ID of the current folder used to list subfolders and resources.
 * @property q - The search field to filter resources when the 'search' capability is included.
 * @property page - The page number for pagination when the 'pagination' capability is included.
 * @property size - The number of items per page for pagination when the 'pagination' capability is included.
 * @property others - Additional filters for the list method when the 'additionalFilters' capability is included.
 */
type ListParams<TCapabilities extends Capability[]> = {
  /** The current level folder is used to list subfolders and resources. */
  currentFolderId?: string
} &
  (Includes<TCapabilities, 'search'> extends true ? SearchParams : {}) &
  (Includes<TCapabilities, 'pagination'> extends true ? PaginationParams : {}) &
  (Includes<TCapabilities, 'additionalFilters'> extends true ? Record<string, string | number> : {})

/** The params q is used to search resources */
type SearchParams = { q?: string }
/** The params page and size are used for pagination */
type PaginationParams = { page?: number; size?: number }

/**
 * Context for getting a resource.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @property catalogConfig - The catalog configuration.
 * @property secrets - The deciphered secrets of the catalog.
 * @property resourceId - The ID of the remote resource to get.
 */
export type GetResourceContext<TCatalogConfig> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The ID of the remote resource to get */
  resourceId: string
}

/**
 * Context for downloading a resource.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @property catalogConfig - The catalog configuration.
 * @property secrets - The deciphered secrets of the catalog.
 * @property importConfig - The specific import configuration, if applicable.
 * @property resourceId - The ID of the remote resource to download.
 * @property tmpDir - The path to the working directory where the resource will be downloaded.
 */
export type DownloadResourceContext<TCatalogConfig> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The specific import configuration, if applicable */
  importConfig: Record<string, any>
  /** The ID of the remote resource to download */
  resourceId: string,
  /** The path to the working directory where the resource will be downloaded */
  tmpDir: string
}

/**
 * Context for publishing a dataset.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @property catalogConfig - The catalog configuration.
 * @property secrets - The deciphered secrets of the catalog.
 * @property dataset - The datafair dataset to publish.
 * @property publication - The publication to process.
 * @property publicationSite - The site where the user will be redirected from the remote dataset.
 * @property publicationSite.title - The title of the publication site.
 * @property publicationSite.url - The URL of the publication site.
 * @property publicationSite.datasetUrlTemplate - The template for the URL to view the dataset in the publication site, using url-template syntax.
 */
export type PublishDatasetContext<TCatalogConfig> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The datafair dataset to publish */
  dataset: Record<string, any>,
  /** The publication to process */
  publication: Publication
  /** The site where the user will be redirected from the remote dataset. */
  publicationSite: {
    /** The title of the publication site */
    title: string,
    /** The URL of the publication site */
    url: string,
    /** The template for the URL to view the dataset in the publication site, using url-template syntax. */
    datasetUrlTemplate: string
  }
}

/**
 * Context for deleting a publication.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @property catalogConfig - The catalog configuration.
 * @property secrets - The deciphered secrets of the catalog.
 * @property datasetId - The ID of the remote dataset to delete, or the dataset where the resource to delete is.
 * @property resourceId - The ID of the resource to delete, if applicable.
 */
export type DeletePublicationContext<TCatalogConfig> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The ID of the remote dataset to delete, or the dataset where the resource to delete is */
  datasetId: string,
  /** The ID of the resource to delete, if applicable */
  resourceId?: string
}

/**
 * The metadata of the catalog plugin.
 * @template TCapabilities - This ensures that the `capabilities` field in the metadata is of the same type as `TCapabilities`.
 * @property capabilities - The capabilities of the catalog plugin, which is an array of `Capability` types.
 */
export type CatalogMetadata<TCapabilities extends Capability[]> = Metadata & {
  /** The capabilities of the catalog plugin */
  capabilities: TCapabilities
}
