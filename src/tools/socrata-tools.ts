import { Tool } from '@modelcontextprotocol/sdk/types.js';
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
}): Promise<Record<string, unknown>[]> {
  const { 
    datasetId, 
    domain = getDefaultDomain(),
    query,
    limit = 10,
    offset = 0
  } = params;
  
  const apiParams: Record<string, unknown> = {
    $limit: limit,
    $offset: offset,
  };
  
  if (query) {
    apiParams.$query = query;
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
  description: 'Access data and metadata to learn more about the city and its underlying information.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['catalog', 'categories', 'tags', 'dataset-metadata', 'column-info', 'data-access', 'site-metrics'],
        description: 'The type of operation to perform:' +
          '\n- catalog: List datasets with optional search' +
          '\n- categories: List all dataset categories' + 
          '\n- tags: List all dataset tags' +
          '\n- dataset-metadata: Get detailed metadata for a specific dataset' +
          '\n- column-info: Get column details for a specific dataset' +
          '\n- data-access: Access records from a dataset (with query support)' +
          '\n- site-metrics: Get portal-wide statistics',
      },
      domain: {
        type: 'string',
        description: 'Optional domain (hostname only, without protocol)',
      },
      // Catalog specific parameters
      query: {
        type: 'string',
        description: '[catalog] Optional search query to filter datasets',
      },
      // Dataset specific parameters
      datasetId: {
        type: 'string',
        description: '[dataset-metadata, column-info, data-access] The dataset ID (e.g., 6zsd-86xi)',
      },
      // Data access specific parameters
      soqlQuery: {
        type: 'string',
        description: '[data-access] Optional SoQL query string for filtering data',
      },
      // Pagination parameters
      limit: {
        type: 'number',
        description: '[catalog, data-access] Maximum number of results to return',
        default: 10,
      },
      offset: {
        type: 'number',
        description: '[catalog, data-access] Number of results to skip for pagination',
        default: 0,
      },
    },
    required: ['type'],
    additionalProperties: false,
  },
};

// Main handler for the unified tool that routes to the appropriate function
export async function handleSocrataTool(params: Record<string, unknown>): Promise<unknown> {
  const { type } = params;
  
  switch (type) {
    case 'catalog':
      return handleCatalog(params as { query?: string; domain?: string; limit?: number; offset?: number });
    case 'categories':
      return handleCategories(params as { domain?: string });
    case 'tags':
      return handleTags(params as { domain?: string });
    case 'dataset-metadata':
      // Validate required parameters
      if (!params.datasetId) {
        throw new Error('datasetId is required for dataset-metadata operation');
      }
      return handleDatasetMetadata(params as { datasetId: string; domain?: string });
    case 'column-info':
      // Validate required parameters
      if (!params.datasetId) {
        throw new Error('datasetId is required for column-info operation');
      }
      return handleColumnInfo(params as { datasetId: string; domain?: string });
    case 'data-access':
      // Validate required parameters
      if (!params.datasetId) {
        throw new Error('datasetId is required for data-access operation');
      }
      // Map soqlQuery to query for consistency with the handler
      if (params.soqlQuery) {
        params.query = params.soqlQuery;
      }
      return handleDataAccess(params as { datasetId: string; domain?: string; query?: string; limit?: number; offset?: number });
    case 'site-metrics':
      return handleSiteMetrics(params as { domain?: string });
    default:
      throw new Error(`Unknown operation type: ${type}`);
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