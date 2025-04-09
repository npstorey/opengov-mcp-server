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
        description: 'Optional domain (hostname only, without protocol). Used with all operation types.',
      },
      // Search and query parameters
      query: {
        type: 'string',
        description: 'Search or query string with different uses depending on operation type:' +
          '\n- For type=catalog: Search query to filter datasets' +
          '\n- For type=data-access: SoQL query string for complex data filtering',
      },
      // Dataset specific parameters
      datasetId: {
        type: 'string',
        description: 'Dataset identifier required for the following operations:' +
          '\n- For type=dataset-metadata: Get dataset details' +
          '\n- For type=column-info: Get column information' +
          '\n- For type=data-access: Specify which dataset to query (e.g., 6zsd-86xi)',
      },
      // Data access specific parameters
      soqlQuery: {
        type: 'string',
        description: 'For type=data-access only. Optional SoQL query string for filtering data.' +
          '\nThis is an alias for the query parameter and takes precedence if both are provided.',
      },
      // Additional SoQL parameters for data-access
      select: {
        type: 'string',
        description: 'For type=data-access only. Specifies which columns to return in the result set.',
      },
      where: {
        type: 'string',
        description: 'For type=data-access only. Filters the rows to be returned (e.g., "magnitude > 3.0").',
      },
      order: {
        type: 'string',
        description: 'For type=data-access only. Orders the results based on specified columns (e.g., "date DESC").',
      },
      group: {
        type: 'string',
        description: 'For type=data-access only. Groups results for aggregate functions.',
      },
      having: {
        type: 'string',
        description: 'For type=data-access only. Filters for grouped results, similar to where but for grouped data.',
      },
      // Full-text search parameter
      q: {
        type: 'string',
        description: 'For type=data-access only. Full text search parameter for free-text searching across the dataset.',
      },
      // Pagination parameters
      limit: {
        type: 'number',
        description: 'Maximum number of results to return:' +
          '\n- For type=catalog: Limits dataset results' +
          '\n- For type=data-access: Limits data records returned',
        default: 10,
      },
      offset: {
        type: 'number',
        description: 'Number of results to skip for pagination:' +
          '\n- For type=catalog: Skips dataset results' +
          '\n- For type=data-access: Skips data records for pagination',
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
      return handleDataAccess(params as { 
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
      });
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