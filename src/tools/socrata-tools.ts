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
  parameters: z.object({
    type: z.enum(['catalog', 'metadata', 'query', 'metrics'])
      .describe('Operation to perform'),
    query: z.string().min(1)
      .describe('Search term / dataset identifier')
  }),
};

// Main handler function that dispatches to specific handlers based on type
export async function handleSocrataTool(params: Record<string, unknown>): Promise<unknown> {
  const type = params.type as string;
  const query = params.query as string;
  const typedParams = params as any;

  // Ensure a default domain is set if not provided, applicable to most handlers
  if (!typedParams.domain) {
    typedParams.domain = getDefaultDomain();
  }
  if (!typedParams.domain && ['catalog', 'metadata', 'query', 'metrics'].includes(type)) {
    throw new Error('Domain parameter is required for this operation type and no default DATA_PORTAL_URL is configured.');
  }

  // Default for limit/offset might apply to 'catalog' and 'query' (data-access)
  if (typedParams.limit === undefined && (type === 'catalog' || type === 'query')) {
    typedParams.limit = 10;
  }
  if (typedParams.offset === undefined && (type === 'catalog' || type === 'query')) {
    typedParams.offset = 0;
  }

  switch (type) {
    case 'catalog':
      return handleCatalog({ ...typedParams, query });
    case 'metadata':
      console.warn("[handleSocrataTool] 'metadata' case needs review: 'query' param received, but 'datasetId' was expected for dataset metadata.");
      if (!query) throw new Error('Query (expected as datasetId) is required for type=metadata');
      return handleDatasetMetadata({ ...typedParams, datasetId: query });
    case 'query':
      console.warn("[handleSocrataTool] 'query' case needs review: mapping generic 'query' to data access parameters.");
      if (!query) throw new Error('Query (expected as datasetId) is required for type=query (data-access)');
      return handleDataAccess({ ...typedParams, datasetId: query, q: typedParams.q || query });
    case 'metrics':
      return handleSiteMetrics(typedParams as { domain?: string });
    case 'categories':
      return handleCategories(typedParams as { domain?: string });
    case 'tags':
      return handleTags(typedParams as { domain?: string });
    case 'column-info':
      if (!typedParams.datasetId) {
        throw new Error('datasetId is required for type=column-info');
      }
      return handleColumnInfo(typedParams as {
        datasetId: string;
        domain?: string;
      });
    default:
      throw new Error(`Unknown Socrata operation type: ${type}. Supported types are catalog, metadata, query, metrics.`);
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

