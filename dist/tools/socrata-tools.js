import { z } from 'zod';
import { McpError, ErrorCode } from '../utils/mcp-errors.js';
import { fetchFromSocrataApi } from '../utils/api.js';
import { handleSearch } from './search.js';
import { searchIds } from './search-ids.js';
import { retrieveDocuments, retrieveAllDocuments } from './document-retrieval.js';
// import { McpToolHandlerContext } from '@modelcontextprotocol/sdk/types.js'; // Removed incorrect import
// Get the default domain from environment
const getDefaultDomain = () => {
    const url = process.env.DATA_PORTAL_URL || 'https://data.cityofnewyork.us';
    return url.replace(/^https?:\/\//, '');
};
// Handler for catalog functionality
async function handleCatalog(params) {
    const { query, domain = getDefaultDomain(), limit = 10, offset = 0 } = params;
    const apiParams = {
        limit,
        offset,
        search_context: domain // Add search_context parameter with the domain
    };
    if (query) {
        apiParams.q = query;
    }
    const baseUrl = `https://${domain}`;
    const response = await fetchFromSocrataApi('/api/catalog/v1', apiParams, baseUrl);
    // Map the nested structure to our DatasetMetadata interface
    return response.results.map((result) => ({
        id: result.resource?.id || result.id,
        name: result.resource?.name || result.name,
        description: result.resource?.description || result.description,
        datasetType: result.resource?.type || result.type,
        category: result.classification?.domain_category,
        tags: result.classification?.domain_tags || [],
        createdAt: result.resource?.createdAt,
        updatedAt: result.resource?.updatedAt,
        ...result.resource // Include any other fields
    }));
}
// Handler for categories functionality
async function handleCategories(params) {
    const { domain = getDefaultDomain() } = params;
    const apiParams = {
        search_context: domain // Add search_context parameter with the domain
    };
    const baseUrl = `https://${domain}`;
    try {
        // First try the standard domain_categories endpoint
        const response = await fetchFromSocrataApi('/api/catalog/v1/domain_categories', apiParams, baseUrl);
        // If we get a valid array response, return it
        if (Array.isArray(response) && response.length > 0) {
            return response;
        }
        // Otherwise, try the alternate approach with only=categories parameter
        const altResponse = await fetchFromSocrataApi('/api/catalog/v1', { ...apiParams, only: 'categories' }, baseUrl);
        return altResponse.categories || [];
    }
    catch (error) {
        // If the primary endpoint fails, try the alternate approach
        try {
            const altResponse = await fetchFromSocrataApi('/api/catalog/v1', { ...apiParams, only: 'categories' }, baseUrl);
            return altResponse.categories || [];
        }
        catch {
            // If both approaches fail, rethrow the original error
            throw error;
        }
    }
}
// Handler for tags functionality
async function handleTags(params) {
    const { domain = getDefaultDomain() } = params;
    const apiParams = {
        search_context: domain // Add search_context parameter with the domain
    };
    const baseUrl = `https://${domain}`;
    try {
        // First try the standard domain_tags endpoint
        const response = await fetchFromSocrataApi('/api/catalog/v1/domain_tags', apiParams, baseUrl);
        // If we get a valid array response, return it
        if (Array.isArray(response) && response.length > 0) {
            return response;
        }
        // Otherwise, try the alternate approach with only=tags parameter
        const altResponse = await fetchFromSocrataApi('/api/catalog/v1', { ...apiParams, only: 'tags' }, baseUrl);
        return altResponse.tags || [];
    }
    catch (error) {
        // If the primary endpoint fails, try the alternate approach
        try {
            const altResponse = await fetchFromSocrataApi('/api/catalog/v1', { ...apiParams, only: 'tags' }, baseUrl);
            return altResponse.tags || [];
        }
        catch {
            // If both approaches fail, rethrow the original error
            throw error;
        }
    }
}
// Handler for dataset metadata functionality
async function handleDatasetMetadata(params) {
    const { datasetId, domain = getDefaultDomain() } = params;
    const baseUrl = `https://${domain}`;
    const response = await fetchFromSocrataApi(`/api/views/${datasetId}`, {}, baseUrl);
    return response;
}
// Handler for column information functionality
async function handleColumnInfo(params) {
    const { datasetId, domain = getDefaultDomain() } = params;
    const baseUrl = `https://${domain}`;
    const response = await fetchFromSocrataApi(`/api/views/${datasetId}/columns`, {}, baseUrl);
    return response;
}
// Handler for data access functionality (preserved for backward compatibility)
async function handleDataAccess(params) {
    const { datasetId, domain = getDefaultDomain(), soqlQuery, limit = 10, offset = 0, select, where, order, group, having, q } = params;
    const apiParams = {};
    if (soqlQuery && soqlQuery.trim().length > 0) {
        apiParams.$query = soqlQuery;
    }
    else {
        apiParams.$limit = limit;
        apiParams.$offset = offset;
        if (select)
            apiParams.$select = select;
        if (where)
            apiParams.$where = where;
        if (order)
            apiParams.$order = order;
        if (group)
            apiParams.$group = group;
        if (having)
            apiParams.$having = having;
        if (q)
            apiParams.$q = q;
    }
    const baseUrl = `https://${domain}`;
    const response = await fetchFromSocrataApi(`/resource/${datasetId}.json`, apiParams, baseUrl);
    return response;
}
// Handler for site metrics functionality
async function handleSiteMetrics(params) {
    const { domain = getDefaultDomain() } = params;
    const baseUrl = `https://${domain}`;
    const response = await fetchFromSocrataApi('/api/site_metrics.json', {}, baseUrl);
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
    type: z.enum(['catalog', 'metadata', 'query', 'metrics'])
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
// 2️⃣ Manually defined JSON Schema (conforming to JsonSchema7Type)
// This defines how the tool's parameters are presented to the MCP client (e.g., in MCP Inspector).
const jsonParameters = {
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
const searchJsonParameters = {
    type: 'object',
    additionalProperties: false,
    properties: {
        dataset_id: {
            type: 'string',
            description: 'Dataset ID to search within. If omitted, searches across all datasets'
        },
        domain: {
            type: 'string',
            description: 'The Socrata domain (e.g., data.cityofnewyork.us)'
        },
        query: {
            type: 'string',
            description: 'Search query for full-text search'
        },
        where: {
            type: 'string',
            description: 'SoQL WHERE clause'
        },
        limit: {
            type: 'integer',
            description: 'Number of results to return'
        },
        offset: {
            type: 'integer',
            description: 'Offset for pagination'
        }
    },
    required: ['query']
};
const documentRetrievalJsonParameters = {
    type: 'object',
    additionalProperties: false,
    properties: {
        ids: {
            type: 'array',
            items: {
                type: 'string'
            },
            description: 'Array of document IDs to retrieve. IDs can be encoded as "dataset_id:row_id"'
        },
        dataset_id: {
            type: 'string',
            description: 'Dataset ID to retrieve documents from. Can be omitted if IDs are encoded'
        },
        domain: {
            type: 'string',
            description: 'The Socrata domain (e.g., data.cityofnewyork.us)'
        }
    },
    required: ['ids']
};
// 3️⃣ Tool uses the manually crafted JSON schema
export const UNIFIED_SOCRATA_TOOL = {
    name: 'get_data',
    description: 'A unified tool to interact with Socrata open-data portals.',
    parameters: jsonParameters,
    // Assert the handler type to satisfy the generic Tool.handler signature.
    // The actual call from src/index.ts will provide the correctly typed SocrataToolParams.
    handler: handleSocrataTool
};
// New search tool that returns only id/score pairs
export const SEARCH_TOOL = {
    name: 'search',
    description: 'Search Socrata datasets and return matching document IDs with relevance scores.',
    parameters: searchJsonParameters,
    handler: handleSearchTool
};
// New document retrieval tool
export const DOCUMENT_RETRIEVAL_TOOL = {
    name: 'document_retrieval',
    description: 'Retrieve full document content from Socrata datasets by document IDs.',
    parameters: documentRetrievalJsonParameters,
    handler: handleDocumentRetrievalTool
};
// Main handler function that dispatches to specific handlers based on type
// It now expects parameters already parsed by the MCP SDK according to socrataToolZodSchema.
export async function handleSocrataTool(rawParams
// context?: McpToolHandlerContext // Context removed for now to align with Tool.handler type
) {
    // Map old parameter names to new ones for backward compatibility
    const params = {
        ...rawParams,
        dataset_id: rawParams.dataset_id || rawParams.datasetId
    };
    const type = params.type; // Directly use the parsed 'type'
    const query = params.query; // Directly use the parsed 'query'
    // Use a mutable copy for potential modifications like adding default domain/limit/offset.
    const modifiableParams = { ...params };
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
            if (!query)
                throw new Error('Query (expected as dataset_id) is required for type=metadata');
            // Ensure dataset_id is passed; prefer params.dataset_id if available, else use query.
            return handleDatasetMetadata({
                datasetId: modifiableParams.dataset_id || query,
                domain: modifiableParams.domain
            });
        case 'query': // This corresponds to 'data-access'
            const { dataset_id: dsId, query: queryField, domain: domainField, limit: limitField, offset: offsetField, select: selectField, where: whereField, order: orderField, group: groupField, having: havingField, q: zodQ } = modifiableParams;
            let effectiveDatasetId = dsId;
            if (!effectiveDatasetId && queryField && !/^\s*select/i.test(queryField)) {
                effectiveDatasetId = queryField;
            }
            if (!effectiveDatasetId) {
                throw new Error('Dataset ID (from dataset_id field, or from query field if not a SoQL SELECT) is required for type=query operation.');
            }
            let passAsSoqlQuery = undefined;
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
            }
            else if (queryField) {
                passAsQ = queryField;
                console.log('[handleSocrataTool] Treating "query" field as general search term mapped to $q parameter.');
            }
            // Use the new search handler which includes metadata
            return handleSearch({
                datasetId: effectiveDatasetId,
                domain: domainField,
                soqlQuery: passAsSoqlQuery,
                limit: limitField,
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
            const exhaustiveCheck = type;
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
function mapSearchParams(params) {
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
export async function handleSearchTool(rawParams) {
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
        const searchResults = catalogResults.map((dataset, index) => {
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
function mapDocumentRetrievalParams(params) {
    return {
        ids: params.ids,
        dataset_id: params.dataset_id || params.datasetId,
        domain: params.domain
    };
}
// Handler for the new document retrieval tool
export async function handleDocumentRetrievalTool(rawParams) {
    // Map old parameter names to new ones for backward compatibility
    const params = mapDocumentRetrievalParams(rawParams);
    // Ensure default domain if not provided
    const domain = params.domain || getDefaultDomain();
    // If no IDs provided, retrieve all documents with default limits
    if (!params.ids || params.ids.length === 0) {
        if (!params.dataset_id) {
            throw new McpError(ErrorCode.InvalidParams, 'Either ids or dataset_id must be provided');
        }
        return retrieveAllDocuments({
            datasetId: params.dataset_id,
            domain
        });
    }
    // Parse encoded IDs to extract dataset_id if needed
    let effectiveDatasetId = params.dataset_id;
    const decodedIds = [];
    // Check if this is a catalog metadata request
    const isCatalogRequest = params.ids.some(id => id.endsWith(':catalog'));
    if (isCatalogRequest) {
        // Extract dataset IDs and fetch their metadata
        const datasetIds = params.ids
            .filter(id => id.endsWith(':catalog'))
            .map(id => id.replace(':catalog', ''));
        // Fetch metadata for each dataset
        const metadataResults = [];
        for (const datasetId of datasetIds) {
            try {
                const metadata = await handleDatasetMetadata({ datasetId, domain });
                metadataResults.push(metadata);
            }
            catch (error) {
                console.error(`Failed to fetch metadata for dataset ${datasetId}:`, error);
                // Include error information in the result
                metadataResults.push({
                    id: datasetId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return metadataResults;
    }
    // Otherwise, handle regular document retrieval
    for (const id of params.ids) {
        if (id.includes(':')) {
            // This is an encoded ID: datasetId:rowId
            const [encodedDatasetId, rowId] = id.split(':', 2);
            // If we don't have a datasetId yet, use the one from the encoded ID
            if (!effectiveDatasetId) {
                effectiveDatasetId = encodedDatasetId;
            }
            else if (effectiveDatasetId !== encodedDatasetId) {
                // All IDs must be from the same dataset
                throw new McpError(ErrorCode.InvalidParams, `Mixed dataset IDs not supported. Found ${encodedDatasetId} but expected ${effectiveDatasetId}`);
            }
            decodedIds.push(rowId);
        }
        else {
            // Regular ID
            decodedIds.push(id);
        }
    }
    if (!effectiveDatasetId) {
        throw new McpError(ErrorCode.InvalidParams, 'Could not determine dataset_id from parameters or encoded IDs');
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
//# sourceMappingURL=socrata-tools.js.map