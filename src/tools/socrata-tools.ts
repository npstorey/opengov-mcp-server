import { z } from 'zod';
// import { zodToJsonSchema, type JsonSchema7Type } from 'zod-to-json-schema'; // No longer using zodToJsonSchema
import { type JsonSchema7Type } from 'zod-to-json-schema'; // Keep for typing if manually constructing
import { Tool } from '@modelcontextprotocol/sdk/types.js'; // Suffix needed
import {
  fetchFromSocrataApi,
  DatasetMetadata,
  CategoryInfo,
  TagInfo,
  ColumnInfo,
  PortalMetrics
} from '../utils/api.js';
// import { McpToolHandlerContext } from '@modelcontextprotocol/sdk/types.js'; // Removed incorrect import

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

// 1️⃣ Zod definition for the Socrata tool's parameters.
// This is used by the MCP SDK to parse/validate parameters from the client.
export const socrataToolZodSchema = z.object({
  type: z.enum(['catalog','metadata','query','metrics'])
         .describe('Operation to perform'),
  query: z.string().min(1)
         .describe('Search phrase, dataset id, or SoQL string'),
  // Optional parameters - these should also be in jsonParameters if they are to be exposed to the client
  domain: z.string().optional().describe('The Socrata domain (e.g., data.cityofnewyork.us)'),
  limit: z.number().int().positive().optional().describe('Number of results to return'),
  offset: z.number().int().nonnegative().optional().describe('Offset for pagination'),
  select: z.string().optional().describe('SoQL SELECT clause'),
  where: z.string().optional().describe('SoQL WHERE clause'),
  order: z.string().optional().describe('SoQL ORDER BY clause'),
  group: z.string().optional().describe('SoQL GROUP BY clause'),
  having: z.string().optional().describe('SoQL HAVING clause'),
  datasetId: z.string().optional().describe('Dataset ID (for metadata, column-info, data-access)'), // Added for clarity, though 'query' is often used for this
  q: z.string().optional().describe('Full-text search query within the dataset (used in data access)') // Added q
});

// Infer the type from the Zod schema for use in the handler
export type SocrataToolParams = z.infer<typeof socrataToolZodSchema>;

// 2️⃣ Manually defined JSON Schema (conforming to JsonSchema7Type)
// This defines how the tool's parameters are presented to the MCP client (e.g., in MCP Inspector).
const jsonParameters: JsonSchema7Type = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['catalog', 'metadata', 'query', 'metrics'],
      description: 'Operation to perform'
    },
    query: {
      type: 'string',
      minLength: 1,
      description: 'Search phrase, dataset id, or SoQL string'
    },
    // Optional parameters reflected from socrataToolZodSchema
    domain: {
      type: 'string',
      description: 'The Socrata domain (e.g., data.cityofnewyork.us)'
    },
    limit: {
      type: 'integer',
      description: 'Number of results to return'
    },
    offset: {
      type: 'integer',
      description: 'Offset for pagination'
    },
    select: {
      type: 'string',
      description: 'SoQL SELECT clause'
    },
    where: {
      type: 'string',
      description: 'SoQL WHERE clause'
    },
    order: {
      type: 'string',
      description: 'SoQL ORDER BY clause'
    },
    group: {
      type: 'string',
      description: 'SoQL GROUP BY clause'
    },
    having: {
      type: 'string',
      description: 'SoQL HAVING clause'
    },
    datasetId: {
      type: 'string',
      description: 'Dataset ID (for metadata, column-info, data-access)'
    },
    q: {
      type: 'string',
      description: 'Full-text search query within the dataset (used in data access)'
    }
  },
  required: ['type', 'query']
};

// 3️⃣ Tool uses the manually crafted JSON schema
export const UNIFIED_SOCRATA_TOOL: Tool = {
  name: 'get_data',
  description: 'A unified tool to interact with Socrata open-data portals.',
  parameters: jsonParameters,
  // Assert the handler type to satisfy the generic Tool.handler signature.
  // The actual call from src/index.ts will provide the correctly typed SocrataToolParams.
  handler: handleSocrataTool as (params: Record<string, unknown>) => Promise<unknown>
};

// Main handler function that dispatches to specific handlers based on type
// It now expects parameters already parsed by the MCP SDK according to socrataToolZodSchema.
export async function handleSocrataTool(
  params: SocrataToolParams
  // context?: McpToolHandlerContext // Context removed for now to align with Tool.handler type
): Promise<unknown> {
  // The 'rawParams' logging and Zod parsing are no longer needed here, as the SDK handles parsing.
  // console.log('[DEBUG] Raw params received by handler:', JSON.stringify(rawParams, null, 2)); 
  // const params = socrataToolZodSchema.parse(rawParams); // No longer needed

  const type = params.type; // Directly use the parsed 'type'
  const query = params.query; // Directly use the parsed 'query'
  
  // Use a mutable copy for potential modifications like adding default domain/limit/offset.
  const modifiableParams: Partial<SocrataToolParams> = { ...params };

  // Ensure a default domain is set if not provided, applicable to most handlers
  if (!modifiableParams.domain) {
    modifiableParams.domain = getDefaultDomain();
  }
  if (!modifiableParams.domain && ['catalog', 'metadata', 'query', 'metrics'].includes(type)) {
    throw new Error('Domain parameter is required for this operation type and no default DATA_PORTAL_URL is configured.');
  }

  // Default for limit/offset might apply to 'catalog' and 'query' (data-access)
  if (modifiableParams.limit === undefined && (type === 'catalog' || type === 'query')) {
    modifiableParams.limit = 10;
  }
  if (modifiableParams.offset === undefined && (type === 'catalog' || type === 'query')) {
    modifiableParams.offset = 0;
  }

  switch (type) {
    case 'catalog':
      // Pass all relevant params from modifiableParams
      return handleCatalog({ 
        query: modifiableParams.query, 
        domain: modifiableParams.domain, 
        limit: modifiableParams.limit, 
        offset: modifiableParams.offset 
      });
    case 'metadata':
      console.warn("[handleSocrataTool] 'metadata' case needs review: 'query' param received, but 'datasetId' was expected for dataset metadata.");
      if (!query) throw new Error('Query (expected as datasetId) is required for type=metadata');
      // Ensure datasetId is passed; prefer params.datasetId if available, else use query.
      return handleDatasetMetadata({ 
        datasetId: modifiableParams.datasetId || query, 
        domain: modifiableParams.domain 
      });
    case 'query': // This corresponds to 'data-access'
      console.warn("[handleSocrataTool] 'query' case needs review: mapping generic 'query' to data access parameters.");
      // Ensure datasetId is passed; prefer params.datasetId if available, else use query.
      if (!(modifiableParams.datasetId || query)) throw new Error('Dataset ID (from query or datasetId field) is required for type=query (data-access)');
      return handleDataAccess({ 
        datasetId: modifiableParams.datasetId || query, // Use query as fallback for datasetId
        domain: modifiableParams.domain,
        query: modifiableParams.query, // This can be the SoQL $query
        limit: modifiableParams.limit,
        offset: modifiableParams.offset,
        select: modifiableParams.select,
        where: modifiableParams.where,
        order: modifiableParams.order,
        group: modifiableParams.group,
        having: modifiableParams.having,
        q: modifiableParams.q // This is for full-text search within dataset, distinct from $query
      });
    case 'metrics':
      return handleSiteMetrics({ domain: modifiableParams.domain });
    // The following cases are not in the socrataToolZodSchema's 'type' enum,
    // so they won't be directly callable unless the schema is updated.
    // Consider adding them to the enum and jsonParameters if they should be exposed.
    /* 
    case 'categories':
      return handleCategories({ domain: modifiableParams.domain });
    case 'tags':
      return handleTags({ domain: modifiableParams.domain });
    case 'column-info':
      if (!modifiableParams.datasetId) {
        throw new Error('datasetId is required for type=column-info');
      }
      return handleColumnInfo({
        datasetId: modifiableParams.datasetId,
        domain: modifiableParams.domain,
      });
    */
    default:
      // This case should ideally not be reached if SDK validation is working with the enum.
      // However, to satisfy exhaustiveness for `type` from SocrataToolParams:
      const exhaustiveCheck: never = type;
      throw new Error(`Unknown Socrata operation type: ${exhaustiveCheck}. Supported types are catalog, metadata, query, metrics.`);
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

