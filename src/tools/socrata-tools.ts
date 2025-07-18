import { z } from 'zod';
// import { zodToJsonSchema, type JsonSchema7Type } from 'zod-to-json-schema'; // No longer using zodToJsonSchema
import { type JsonSchema7Type } from 'zod-to-json-schema'; // Keep for typing if manually constructing
import { Tool } from '@modelcontextprotocol/sdk/types.js'; // Suffix needed
import { McpError, ErrorCode } from '../utils/mcp-errors.js';
import {
  fetchFromSocrataApi,
  DatasetMetadata,
  CategoryInfo,
  TagInfo,
  ColumnInfo,
  PortalMetrics
} from '../utils/api.js';
import { handleSearch, SearchResponse } from './search.js';
import { searchIds, SearchIdsResponse, SearchResult } from './search-ids.js';
import { retrieveDocuments, retrieveAllDocuments, DocumentRetrievalRequest, DocumentRetrievalResponse } from './document-retrieval.js';
// import { McpToolHandlerContext } from '@modelcontextprotocol/sdk/types.js'; // Removed incorrect import

// Get the default domain from environment
const getDefaultDomain = () => {
  const url = process.env.DATA_PORTAL_URL || 'https://data.cityofnewyork.us';
  return url.replace(/^https?:\/\//, '');
};

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
  const response = await fetchFromSocrataApi<{ results: any[] }>(
    '/api/catalog/v1',
    apiParams,
    baseUrl
  );

  // Map the nested structure to our DatasetMetadata interface
  return response.results.map((result: any) => ({
    id: result.resource?.id || result.id,
    name: result.resource?.name || result.name,
    description: result.resource?.description || result.description,
    datasetType: result.resource?.type || result.type,
    category: result.classification?.domain_category,
    tags: result.classification?.domain_tags || [],
    createdAt: result.resource?.createdAt,
    updatedAt: result.resource?.updatedAt,
    ...result.resource // Include any other fields
  } as DatasetMetadata));
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

// Handler for data access functionality (preserved for backward compatibility)
async function handleDataAccess(params: {
  datasetId: string;
  domain?: string;
  soqlQuery?: string;
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
    soqlQuery,
    limit = 10,
    offset = 0,
    select,
    where,
    order,
    group,
    having,
    q
  } = params;

  const apiParams: Record<string, unknown> = {};

  if (soqlQuery && soqlQuery.trim().length > 0) {
    apiParams.$query = soqlQuery;
  } else {
    apiParams.$limit = limit;
    apiParams.$offset = offset;
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

// Zod schemas for different tool types

// Search tool schema - returns only id/score pairs
export const searchToolZodSchema = z.object({
  dataset_id: z.string().optional().describe('Dataset ID to search within. If omitted, searches across all datasets'),
  domain: z.string().optional().describe('The Socrata domain (e.g., data.cityofnewyork.us)'),
  query: z.string().optional().describe('Search query for full-text search'),
  where: z.string().optional().describe('SoQL WHERE clause'),
  limit: z.number().int().positive().optional().describe('Number of results to return'),
  offset: z.number().int().nonnegative().optional().describe('Offset for pagination')
});

// Document retrieval tool schema - fetches full documents by IDs
export const documentRetrievalZodSchema = z.object({
  ids: z.array(z.string()).describe('Array of document IDs to retrieve. IDs can be encoded as "dataset_id:row_id"'),
  dataset_id: z.string().optional().describe('Dataset ID to retrieve documents from. Can be omitted if IDs are encoded'),
  domain: z.string().optional().describe('The Socrata domain (e.g., data.cityofnewyork.us)')
});

// 1️⃣ Zod definition for the Socrata tool's parameters.
// This is used by the MCP SDK to parse/validate parameters from the client.
export const socrataToolZodSchema = z.object({
  type: z.enum(['catalog','metadata','query','metrics'])
         .describe('Operation to perform'),
  query: z.string().min(1).optional()
         .describe('General search phrase OR a full SoQL query string. If this is a full SoQL query (e.g., starts with SELECT), other SoQL parameters like select, where, q might be overridden or ignored by the handler in favor of the full SoQL query. If it\'s a search phrase, it will likely be used for a full-text search ($q parameter to Socrata).'),
  // Optional parameters - these should also be in jsonParameters if they are to be exposed to the client
  domain: z.string().optional().describe('The Socrata domain (e.g., data.cityofnewyork.us)'),
  limit: z.union([z.number().int().positive(), z.literal('all')]).optional().describe('Number of results to return, or "all" to fetch all available data up to configured cap'),
  offset: z.number().int().nonnegative().optional().describe('Offset for pagination'),
  select: z.string().optional().describe('SoQL SELECT clause'),
  where: z.string().optional().describe('SoQL WHERE clause'),
  order: z.string().optional().describe('SoQL ORDER BY clause'),
  group: z.string().optional().describe('SoQL GROUP BY clause'),
  having: z.string().optional().describe('SoQL HAVING clause'),
  dataset_id: z.string().optional().describe('Dataset ID (for metadata, column-info, data-access)'), // Added for clarity, though 'query' is often used for this
  q: z.string().optional().describe('Full-text search query within the dataset (used in data access)') // Added q
});

// Infer the type from the Zod schema for use in the handler
export type SocrataToolParams = z.infer<typeof socrataToolZodSchema>;
export type SearchToolParams = z.infer<typeof searchToolZodSchema>;
export type DocumentRetrievalParams = z.infer<typeof documentRetrievalZodSchema>;

// 2️⃣ Manually defined JSON Schema (conforming to JsonSchema7Type)
// This defines how the tool's parameters are presented to the MCP client (e.g., in MCP Inspector).
const jsonParameters: any = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['catalog', 'metadata', 'query', 'metrics'],
      description: 'Operation to perform'
    },
    query: {
      type: 'string',
      description: 'General search phrase OR a full SoQL query string. If this is a full SoQL query (e.g., starts with SELECT), other SoQL parameters like select, where, q might be overridden or ignored by the handler in favor of the full SoQL query. If it\'s a search phrase, it will likely be used for a full-text search ($q parameter to Socrata).'
    },
    // Optional parameters reflected from socrataToolZodSchema
    domain: {
      type: 'string',
      description: 'The Socrata domain (e.g., data.cityofnewyork.us)'
    },
    limit: {
      type: 'string',
      description: 'Number of results to return (e.g., "10", "100"), or "all" to fetch all available data'
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
    dataset_id: {
      type: 'string',
      description: 'Dataset ID (for metadata, column-info, data-access)'
    },
    q: {
      type: 'string',
      description: 'Full-text search query within the dataset (used in data access)'
    }
  },
  required: ['type']
};

// JSON schemas for the new tools
const searchJsonParameters: any = {
  type: 'object',
  additionalProperties: false,
  properties: {
    query: {
      type: 'string',
      description: 'Search query for full-text search'
    }
  },
  required: ['query']
};

const documentRetrievalJsonParameters: any = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ids: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Array of document IDs to retrieve'
    }
  },
  required: ['ids']
};

// 3️⃣ Tool uses the manually crafted JSON schema
export const UNIFIED_SOCRATA_TOOL: Tool = {
  name: 'get_data',
  description: 'A unified tool to interact with Socrata open-data portals.',
  inputSchema: jsonParameters,  // Latest MCP spec uses 'inputSchema'
  // Assert the handler type to satisfy the generic Tool.handler signature.
  // The actual call from src/index.ts will provide the correctly typed SocrataToolParams.
  handler: handleSocrataTool as (params: Record<string, unknown>) => Promise<unknown>
};

// New search tool that returns only id/score pairs
export const SEARCH_TOOL: Tool = {
  name: 'search',
  title: 'Search NYC Open Data',
  description: 'Search NYC Open Data portal and return matching dataset IDs',
  inputSchema: searchJsonParameters,  // Latest MCP spec uses 'inputSchema'
  handler: handleSearchTool as (params: Record<string, unknown>) => Promise<unknown>
};

// New document retrieval tool
export const DOCUMENT_RETRIEVAL_TOOL: Tool = {
  name: 'document_retrieval',
  title: 'Retrieve NYC Data',
  description: 'Retrieve dataset information from NYC Open Data portal',
  inputSchema: documentRetrievalJsonParameters,  // Latest MCP spec uses 'inputSchema'
  handler: handleDocumentRetrievalTool as (params: Record<string, unknown>) => Promise<unknown>
};

// Main handler function that dispatches to specific handlers based on type
// It now expects parameters already parsed by the MCP SDK according to socrataToolZodSchema.
export async function handleSocrataTool(
  rawParams: SocrataToolParams | any
  // context?: McpToolHandlerContext // Context removed for now to align with Tool.handler type
): Promise<unknown> {
  // Map old parameter names to new ones for backward compatibility
  const params: SocrataToolParams = {
    ...rawParams,
    dataset_id: rawParams.dataset_id || rawParams.datasetId
  };

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
      // Handle 'all' limit by converting to a large number for catalog
      const catalogLimit = modifiableParams.limit === 'all' ? 1000 : 
                          typeof modifiableParams.limit === 'number' ? modifiableParams.limit : 10;
      return handleCatalog({ 
        query: modifiableParams.query, 
        domain: modifiableParams.domain, 
        limit: catalogLimit, 
        offset: modifiableParams.offset 
      });
    case 'metadata':
      console.warn("[handleSocrataTool] 'metadata' case needs review: 'query' param received, but 'dataset_id' was expected for dataset metadata.");
      if (!query) throw new Error('Query (expected as dataset_id) is required for type=metadata');
      // Ensure dataset_id is passed; prefer params.dataset_id if available, else use query.
      return handleDatasetMetadata({ 
        datasetId: modifiableParams.dataset_id || query, 
        domain: modifiableParams.domain 
      });
    case 'query': // This corresponds to 'data-access'
      const {
        dataset_id: dsId,
        query: queryField,
        domain: domainField,
        limit: limitField,
        offset: offsetField,
        select: selectField,
        where: whereField,
        order: orderField,
        group: groupField,
        having: havingField,
        q: zodQ
      } = modifiableParams;

      let effectiveDatasetId = dsId;
      if (!effectiveDatasetId && queryField && !/^\s*select/i.test(queryField)) {
        effectiveDatasetId = queryField;
      }
      if (!effectiveDatasetId) {
        throw new Error('Dataset ID (from dataset_id field, or from query field if not a SoQL SELECT) is required for type=query operation.');
      }

      let passAsSoqlQuery: string | undefined = undefined;
      let passAsSelect = selectField;
      let passAsWhere = whereField;
      let passAsOrder = orderField;
      let passAsGroup = groupField;
      let passAsHaving = havingField;
      let passAsQ = zodQ;

      if (queryField && /^\s*select/i.test(queryField)) {
        passAsSoqlQuery = queryField;
        passAsSelect = undefined;
        passAsWhere = undefined;
        passAsOrder = undefined;
        passAsGroup = undefined;
        passAsHaving = undefined;
        passAsQ = undefined;
        console.log('[handleSocrataTool] Received full SoQL query in "query" field; ignoring select/where/order/group/having/q parameters.');
      } else if (queryField) {
        passAsQ = queryField;
        console.log('[handleSocrataTool] Treating "query" field as general search term mapped to $q parameter.');
      }

      // Use the new search handler which includes metadata
      return handleSearch({
        datasetId: effectiveDatasetId,
        domain: domainField,
        soqlQuery: passAsSoqlQuery,
        limit: limitField as number | 'all' | undefined,
        offset: offsetField,
        select: passAsSelect,
        where: passAsWhere,
        order: passAsOrder,
        group: passAsGroup,
        having: passAsHaving,
        q: passAsQ
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

// Helper function to provide backward compatibility for parameter names
function mapSearchParams(params: any): SearchToolParams {
  return {
    dataset_id: params.dataset_id || params.datasetId,
    domain: params.domain,
    query: params.query,
    where: params.where,
    limit: params.limit,
    offset: params.offset
  };
}

// Handler for the new search tool
export async function handleSearchTool(
  rawParams: SearchToolParams | any
): Promise<SearchIdsResponse> {
  // Map old parameter names to new ones for backward compatibility
  const params = mapSearchParams(rawParams);
  
  // Ensure default domain if not provided
  const domain = params.domain || getDefaultDomain();
  
  // If no dataset_id provided, search catalog
  if (!params.dataset_id) {
    console.log('[SearchTool] No dataset_id provided, searching catalog');
    
    // Search catalog and return dataset IDs as results
    const catalogResults = await handleCatalog({
      query: params.query,
      domain,
      limit: params.limit || 10,
      offset: params.offset || 0
    });
    
    // Convert catalog results to search results with encoded dataset IDs
    const searchResults: SearchResult[] = catalogResults.map((dataset: any, index) => {
      // Handle nested structure from catalog API
      const datasetId = dataset.resource?.id || dataset.id;
      return {
        id: `${datasetId}:catalog`, // Encode as datasetId:catalog to indicate this is a dataset result
        score: 1.0 - (index * 0.1) // Simple scoring based on order
      };
    });
    
    return searchResults;
  }
  
  // Otherwise search within the specified dataset
  return searchIds({
    datasetId: params.dataset_id,
    domain,
    query: params.query,
    where: params.where,
    limit: params.limit,
    offset: params.offset
  });
}

// Helper function to provide backward compatibility for document retrieval params
function mapDocumentRetrievalParams(params: any): DocumentRetrievalParams {
  return {
    ids: params.ids,
    dataset_id: params.dataset_id || params.datasetId,
    domain: params.domain
  };
}

// Handler for the new document retrieval tool
export async function handleDocumentRetrievalTool(
  rawParams: DocumentRetrievalParams | any
): Promise<DocumentRetrievalResponse> {
  // Map old parameter names to new ones for backward compatibility
  const params = mapDocumentRetrievalParams(rawParams);
  
  // Ensure default domain if not provided
  const domain = params.domain || getDefaultDomain();
  
  // If no IDs provided, retrieve all documents with default limits
  if (!params.ids || params.ids.length === 0) {
    if (!params.dataset_id) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Either ids or dataset_id must be provided'
      );
    }
    return retrieveAllDocuments({
      datasetId: params.dataset_id,
      domain
    });
  }
  
  // Parse encoded IDs to extract dataset_id if needed
  let effectiveDatasetId = params.dataset_id;
  const decodedIds: string[] = [];
  
  // Check if this is a catalog metadata request
  const isCatalogRequest = params.ids.some(id => id.endsWith(':catalog'));
  
  if (isCatalogRequest) {
    // Extract dataset IDs from the encoded IDs
    const datasetIds = params.ids
      .filter(id => id.endsWith(':catalog'))
      .map(id => id.replace(':catalog', ''));
    
    console.log('[DocumentRetrieval] Fetching catalog info for datasets:', datasetIds);
    
    // For catalog requests, return concise catalog information
    // We'll fetch all catalog results and filter for the requested IDs
    const catalogResults = await handleCatalog({
      domain,
      limit: 100, // Fetch more to ensure we find all requested datasets
      offset: 0
    });
    
    // Filter to only include the requested datasets
    const requestedDatasets = catalogResults.filter((dataset: any) => 
      datasetIds.includes(dataset.id)
    );
    
    // If some datasets weren't found in the first batch, try searching for them individually
    const foundIds = requestedDatasets.map((d: any) => d.id);
    const missingIds = datasetIds.filter(id => !foundIds.includes(id));
    
    for (const missingId of missingIds) {
      try {
        // Search specifically for this dataset ID
        const searchResults = await handleCatalog({
          query: missingId,
          domain,
          limit: 10,
          offset: 0
        });
        
        // Find exact match
        const exactMatch = searchResults.find((d: any) => d.id === missingId);
        if (exactMatch) {
          requestedDatasets.push(exactMatch);
        }
      } catch (error) {
        console.error(`Failed to find dataset ${missingId}:`, error);
        // Include a minimal dataset info with error indication
        requestedDatasets.push({
          id: missingId,
          name: `Dataset ${missingId} (not found)`,
          description: error instanceof Error ? error.message : 'Dataset not found',
          datasetType: 'error',
          category: 'Error',
          tags: ['error', 'not-found'],
          error: true
        } as DatasetMetadata);
      }
    }
    
    return requestedDatasets;
  }
  
  // Otherwise, handle regular document retrieval
  for (const id of params.ids) {
    if (id.includes(':')) {
      // This is an encoded ID: datasetId:rowId
      const [encodedDatasetId, rowId] = id.split(':', 2);
      
      // If we don't have a datasetId yet, use the one from the encoded ID
      if (!effectiveDatasetId) {
        effectiveDatasetId = encodedDatasetId;
      } else if (effectiveDatasetId !== encodedDatasetId) {
        // All IDs must be from the same dataset
        throw new McpError(
          ErrorCode.InvalidParams,
          `Mixed dataset IDs not supported. Found ${encodedDatasetId} but expected ${effectiveDatasetId}`
        );
      }
      
      decodedIds.push(rowId);
    } else {
      // Regular ID
      decodedIds.push(id);
    }
  }
  
  if (!effectiveDatasetId) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Could not determine dataset_id from parameters or encoded IDs'
    );
  }
  
  // Retrieve documents using the decoded IDs
  return retrieveDocuments({
    ids: decodedIds,
    datasetId: effectiveDatasetId,
    domain
  });
}

// Export all tools as an array (now includes all three tools)
export const SOCRATA_TOOLS = [UNIFIED_SOCRATA_TOOL, SEARCH_TOOL, DOCUMENT_RETRIEVAL_TOOL];

