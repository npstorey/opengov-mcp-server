import { fetchFromSocrataApi } from '../utils/api.js';

// Constants for Socrata API limits
export const MAX_ROWS = 50000; // Socrata per-request hard limit
export const DEFAULT_PREVIEW_ROWS = 1000; // Default preview size for large datasets
export const ROW_FETCH_CAP = parseInt(process.env.ROW_FETCH_CAP || '100000', 10); // Configurable cap for "all" requests

// Response type with metadata
export interface SearchResponse {
  data: any[];
  is_sample: boolean;
  returned_rows: number;
  total_rows: number;
  has_more?: boolean;
  next_offset?: number;
}

// Helper function to get total row count for a dataset
export async function getRowCount(params: {
  datasetId: string;
  domain: string;
  where?: string;
  q?: string;
}): Promise<number> {
  const { datasetId, domain, where, q } = params;
  
  const apiParams: Record<string, unknown> = {
    $select: 'count(*)',
    $limit: 1
  };
  
  if (where) apiParams.$where = where;
  if (q) apiParams.$q = q;
  
  const baseUrl = `https://${domain}`;
  const response = await fetchFromSocrataApi<Array<{ count: string }>>(
    `/resource/${datasetId}.json`,
    apiParams,
    baseUrl
  );
  
  return parseInt(response[0]?.count || '0', 10);
}

// Enhanced search handler with pagination and metadata
export async function handleSearch(params: {
  datasetId: string;
  domain: string;
  soqlQuery?: string;
  limit?: number | 'all';
  offset?: number;
  select?: string;
  where?: string;
  order?: string;
  group?: string;
  having?: string;
  q?: string;
}): Promise<SearchResponse> {
  const {
    datasetId,
    domain,
    soqlQuery,
    limit,
    offset = 0,
    select,
    where,
    order,
    group,
    having,
    q
  } = params;

  // If a full SoQL query is provided, we can't easily determine row count
  // So we'll fetch with the query and check results
  if (soqlQuery && soqlQuery.trim().length > 0) {
    const apiParams: Record<string, unknown> = {
      $query: soqlQuery
    };
    
    const baseUrl = `https://${domain}`;
    const data = await fetchFromSocrataApi<Record<string, unknown>[]>(
      `/resource/${datasetId}.json`,
      apiParams,
      baseUrl
    );
    
    return {
      data,
      is_sample: false,
      returned_rows: data.length,
      total_rows: data.length, // Can't determine total with custom query
      has_more: data.length === MAX_ROWS // Might have more if we hit the limit
    };
  }

  // Get total row count first
  const totalRows = await getRowCount({ datasetId, domain, where, q });
  
  // Determine fetch strategy
  const requestAll = limit === 'all';
  const userLimit = typeof limit === 'number' ? limit : undefined;
  
  // Case 1: Small dataset or specific limit within MAX_ROWS
  if (totalRows <= MAX_ROWS && (!requestAll && (userLimit ?? totalRows) <= MAX_ROWS)) {
    const apiParams: Record<string, unknown> = {
      $limit: userLimit ?? totalRows,
      $offset: offset
    };
    
    if (select) apiParams.$select = select;
    if (where) apiParams.$where = where;
    if (order) apiParams.$order = order;
    if (group) apiParams.$group = group;
    if (having) apiParams.$having = having;
    if (q) apiParams.$q = q;
    
    const baseUrl = `https://${domain}`;
    const data = await fetchFromSocrataApi<Record<string, unknown>[]>(
      `/resource/${datasetId}.json`,
      apiParams,
      baseUrl
    );
    
    return {
      data,
      is_sample: false,
      returned_rows: data.length,
      total_rows: totalRows
    };
  }
  
  // Case 2: User explicitly requested "all" data
  if (requestAll) {
    const allData: Record<string, unknown>[] = [];
    let currentOffset = offset;
    const maxToFetch = Math.min(totalRows, ROW_FETCH_CAP);
    
    while (allData.length < maxToFetch && currentOffset < totalRows) {
      const batchSize = Math.min(MAX_ROWS, maxToFetch - allData.length);
      const apiParams: Record<string, unknown> = {
        $limit: batchSize,
        $offset: currentOffset
      };
      
      if (select) apiParams.$select = select;
      if (where) apiParams.$where = where;
      if (order) apiParams.$order = order;
      if (group) apiParams.$group = group;
      if (having) apiParams.$having = having;
      if (q) apiParams.$q = q;
      
      const baseUrl = `https://${domain}`;
      const batch = await fetchFromSocrataApi<Record<string, unknown>[]>(
        `/resource/${datasetId}.json`,
        apiParams,
        baseUrl
      );
      
      if (batch.length === 0) break; // No more data
      
      allData.push(...batch);
      currentOffset += batch.length;
    }
    
    const hasMore = totalRows > ROW_FETCH_CAP;
    
    return {
      data: allData,
      is_sample: false,
      returned_rows: allData.length,
      total_rows: totalRows,
      has_more: hasMore,
      next_offset: hasMore ? currentOffset : undefined
    };
  }
  
  // Case 3: Large dataset, no explicit "all" - return preview
  const previewLimit = userLimit ?? DEFAULT_PREVIEW_ROWS;
  const apiParams: Record<string, unknown> = {
    $limit: Math.min(previewLimit, MAX_ROWS),
    $offset: offset
  };
  
  if (select) apiParams.$select = select;
  if (where) apiParams.$where = where;
  if (order) apiParams.$order = order;
  if (group) apiParams.$group = group;
  if (having) apiParams.$having = having;
  if (q) apiParams.$q = q;
  
  const baseUrl = `https://${domain}`;
  const data = await fetchFromSocrataApi<Record<string, unknown>[]>(
    `/resource/${datasetId}.json`,
    apiParams,
    baseUrl
  );
  
  return {
    data,
    is_sample: true,
    returned_rows: data.length,
    total_rows: totalRows,
    has_more: offset + data.length < totalRows,
    next_offset: offset + data.length < totalRows ? offset + data.length : undefined
  };
}