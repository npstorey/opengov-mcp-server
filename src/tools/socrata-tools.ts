import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js'; // Suffix needed
import {
  fetchFromSocrataApi,
  DatasetMetadata,
  CategoryInfo,
  TagInfo,
  ColumnInfo,
  PortalMetrics
} from '../utils/api.js';

// Get the default domain from environment
const getDefaultDomain = () => process.env.DATA_PORTAL_URL?.replace(/^https?:\/\//, '');

// Handler for catalog functionality
async function handleCatalog(params: {
  query?: string;
  domain?: string;
  limit?: number;
  offset?: number;
}): Promise<DatasetMetadata[]> {
  const { query, domain = getDefaultDomain(), limit = 10, offset = 0 } = params;

  const apiParams: Record<string, unknown> = {
    limit,
    offset,
    search_context: domain // Add search_context parameter with the domain
  };

  if (query) {
    apiParams.q = query;
  }

  const baseUrl = `https://${domain}`;
  const response = await fetchFromSocrataApi<{ results: DatasetMetadata[] }>(
    '/api/catalog/v1',
    apiParams,
    baseUrl
  );

  return response.results;
}

// Handler for categories functionality
async function handleCategories(params: {
  domain?: string;
}): Promise<CategoryInfo[]> {
  const { domain = getDefaultDomain() } = params;

  const apiParams: Record<string, unknown> = {
    search_context: domain // Add search_context parameter with the domain
  };

  const baseUrl = `https://${domain}`;

  try {
    // First try the standard domain_categories endpoint
    const response = await fetchFromSocrataApi<CategoryInfo[]>(
      '/api/catalog/v1/domain_categories',
      apiParams,
      baseUrl
    );

    // If we get a valid array response, return it
    if (Array.isArray(response) && response.length > 0) {
      return response;
    }

    // Otherwise, try the alternate approach with only=categories parameter
    const altResponse = await fetchFromSocrataApi<{categories: CategoryInfo[]}>(
      '/api/catalog/v1',
      { ...apiParams, only: 'categories' },
      baseUrl
    );

    return altResponse.categories || [];
  } catch (error) {
    // If the primary endpoint fails, try the alternate approach
    try {
      const altResponse = await fetchFromSocrataApi<{categories: CategoryInfo[]}>(
        '/api/catalog/v1',
        { ...apiParams, only: 'categories' },
        baseUrl
      );

      return altResponse.categories || [];
    } catch {
      // If both approaches fail, rethrow the original error
      throw error;
    }
  }
}

// Handler for tags functionality
async function handleTags(params: {
  domain?: string;
}): Promise<TagInfo[]> {
  const { domain = getDefaultDomain() } = params;

  const apiParams: Record<string, unknown> = {
    search_context: domain // Add search_context parameter with the domain
  };

  const baseUrl = `https://${domain}`;

  try {
    // First try the standard domain_tags endpoint
    const response = await fetchFromSocrataApi<TagInfo[]>(
      '/api/catalog/v1/domain_tags',
      apiParams,
      baseUrl
    );

    // If we get a valid array response, return it
    if (Array.isArray(response) && response.length > 0) {
      return response;
    }

    // Otherwise, try the alternate approach with only=tags parameter
    const altResponse = await fetchFromSocrataApi<{tags: TagInfo[]}>(
      '/api/catalog/v1',
      { ...apiParams, only: 'tags' },
      baseUrl
    );

    return altResponse.tags || [];
  } catch (error) {
    // If the primary endpoint fails, try the alternate approach
    try {
      const altResponse = await fetchFromSocrataApi<{tags: TagInfo[]}>(
        '/api/catalog/v1',
        { ...apiParams, only: 'tags' },
        baseUrl
      );

      return altResponse.tags || [];
    } catch {
      // If both approaches fail, rethrow the original error
      throw error;
    }
  }
}

// Handler for dataset metadata functionality
async function handleDatasetMetadata(params: {
  datasetId: string;
  domain?: string;
}): Promise<Record<string, unknown>> {
  const { datasetId, domain = getDefaultDomain() } = params;

  const baseUrl = `https://${domain}`;
  const response = await fetchFromSocrataApi<Record<string, unknown>>(
    `/api/views/${datasetId}`,
    {},
    baseUrl
  );

  return response;
}

// Handler for column information functionality
async function handleColumnInfo(params: {
  datasetId: string;
  domain?: string;
}): Promise<ColumnInfo[]> {
  const { datasetId, domain = getDefaultDomain() } = params;

  const baseUrl = `https://${domain}`;
  const response = await fetchFromSocrataApi<ColumnInfo[]>(
    `/api/views/${datasetId}/columns`,
    {},
    baseUrl
  );

  return response;
}

// Handler for data access functionality
async function handleDataAccess(params: {
  datasetId: string;
  domain?: string;
  query?: string;
  limit?: number;
  offset?: number;
  select?: string;
  where?: string;
  order?: string;
  group?: string;
  having?: string;
  q?: string;
}): Promise<Record<string, unknown>[]> {
  const {
    datasetId,
    domain = getDefaultDomain(),
    query,
    limit = 10,
    offset = 0,
    select,
    where,
    order,
    group,
    having,
    q
  } = params;

  const apiParams: Record<string, unknown> = {
    $limit: limit,
    $offset: offset,
  };

  // Handle comprehensive query parameter if provided
  if (query) {
    apiParams.$query = query;
  } else {
    // Otherwise handle individual SoQL parameters
    if (select) apiParams.$select = select;
    if (where) apiParams.$where = where;
    if (order) apiParams.$order = order;
    if (group) apiParams.$group = group;
    if (having) apiParams.$having = having;
    if (q) apiParams.$q = q;
  }

  const baseUrl = `https://${domain}`;
  const response = await fetchFromSocrataApi<Record<string, unknown>[]>(
    `/resource/${datasetId}.json`,
    apiParams,
    baseUrl
  );

  return response;
}

// Handler for site metrics functionality
async function handleSiteMetrics(params: {
  domain?: string;
}): Promise<PortalMetrics> {
  const { domain = getDefaultDomain() } = params;

  const baseUrl = `https://${domain}`;
  const response = await fetchFromSocrataApi<PortalMetrics>(
    '/api/site_metrics.json',
    {},
    baseUrl
  );

  return response;
}

// Consolidated Socrata tool
export const UNIFIED_SOCRATA_TOOL: Tool = {
  name: 'get_data',
  description: 'A unified tool to interact with Socrata open data portals. It can search the data catalog, get metadata about datasets and columns, retrieve categories and tags, access data using SoQL queries, and fetch site metrics.',
  inputSchema: z.object({
    type: z.enum([
      'catalog',
      'categories',
      'tags',
      'dataset-metadata',
      'column-info',
      'data-access',
      'site-metrics'
    ]).describe('The type of Socrata operation to perform (e.g., "catalog", "data-access"). This is required.')
  }).strict()
};

// Main handler function that dispatches to specific handlers based on type
export async function handleSocrataTool(params: Record<string, unknown>): Promise<unknown> {
  const type = params.type as string;
  const typedParams = params as any; // Cast to any to avoid excessive type checking here, validation is done by Zod

  // Ensure a default domain is set if not provided, applicable to most handlers
  if (!typedParams.domain) {
    typedParams.domain = getDefaultDomain();
  }
  if (!typedParams.domain && ['catalog', 'categories', 'tags', 'dataset-metadata', 'column-info', 'data-access', 'site-metrics'].includes(type)) {
    // For types that absolutely require a domain (either user-provided or default from .env)
    // and getDefaultDomain() returned undefined (meaning .env variable is not set)
    throw new Error('Domain parameter is required for this operation type and no default DATA_PORTAL_URL is configured.');
  }

  // Set defaults for limit and offset if not provided, applicable to relevant handlers
  if (typedParams.limit === undefined && (type === 'catalog' || type === 'data-access')) {
    typedParams.limit = 10;
  }
  if (typedParams.offset === undefined && (type === 'catalog' || type === 'data-access')) {
    typedParams.offset = 0;
  }

  switch (type) {
    case 'catalog':
      return handleCatalog(typedParams as {
        query?: string;
        domain?: string;
        limit?: number;
        offset?: number;
      });
    case 'categories':
      return handleCategories(typedParams as { domain?: string });
    case 'tags':
      return handleTags(typedParams as { domain?: string });
    case 'dataset-metadata':
      if (!typedParams.datasetId) {
        throw new Error('datasetId is required for type=dataset-metadata');
      }
      return handleDatasetMetadata(typedParams as {
        datasetId: string;
        domain?: string;
      });
    case 'column-info':
      if (!typedParams.datasetId) {
        throw new Error('datasetId is required for type=column-info');
      }
      return handleColumnInfo(typedParams as {
        datasetId: string;
        domain?: string;
      });
    case 'data-access':
      if (!typedParams.datasetId) {
        throw new Error('datasetId is required for type=data-access');
      }
      return handleDataAccess(typedParams as {
        datasetId: string;
        domain?: string;
        query?: string; // This refers to the simple 'q' text search if soqlQuery is not used
        limit?: number;
        offset?: number;
        select?: string;
        where?: string;
        order?: string;
        group?: string;
        having?: string;
        q?: string; // This is the specific Socrata param for full-text search if soqlQuery not used.
        soqlQuery?: string; // The comprehensive SoQL query.
      });
    case 'site-metrics':
      return handleSiteMetrics(typedParams as { domain?: string });
    default:
      throw new Error(`Unknown Socrata operation type: ${type}`);
  }
}

// Export for backward compatibility (we'll remove this later)
export const handleCatalogTool = handleCatalog;
export const handleCategoriesTool = handleCategories;
export const handleTagsTool = handleTags;
export const handleDatasetMetadataTool = handleDatasetMetadata;
export const handleColumnInfoTool = handleColumnInfo;
export const handleDataAccessTool = handleDataAccess;
export const handleSiteMetricsTool = handleSiteMetrics;

// Export all tools as an array (only contains the unified tool now)
export const SOCRATA_TOOLS = [UNIFIED_SOCRATA_TOOL];

