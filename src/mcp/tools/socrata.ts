import axios from 'axios';
import { z } from 'zod';

/** Parameters for the get_data tool */
export const GetDataArgs = z
  .object({
    domain: z.string().min(1, 'domain required'),
    type: z.enum(['catalog', 'dataset']).default('catalog'),
    query: z.string().optional(),
    resourceId: z.string().optional(),
    limit: z.number().positive().optional(),
    offset: z.number().nonnegative().optional()
  })
  .refine(v => v.query || v.resourceId, {
    message: 'Either query or resourceId must be supplied'
  });

export type GetDataArgs = z.infer<typeof GetDataArgs>;

/**
 * Build a Socrata request URL based on arguments.
 * Catalog queries keep paging params as plain `limit`/`offset` while
 * dataset calls use `$limit`/`$offset`. When a SOQL `$query` is supplied,
 * paging parameters are expected inside the query string and are therefore
 * omitted from the URL.
 */
export function buildSocrataUrl(args: GetDataArgs): string {
  const { domain, type, query, resourceId, limit, offset } = args;
  const base = `https://${domain}`;

  if (type === 'catalog') {
    const params: string[] = [];
    if (query) params.push(`q=${encodeURIComponent(query)}`);
    if (limit !== undefined) params.push(`limit=${limit}`);
    if (offset !== undefined) params.push(`offset=${offset}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return `${base}/api/catalog/v1${qs}`;
  }

  if (!resourceId) {
    throw new Error('resourceId required for dataset requests');
  }
  const url = `${base}/resource/${resourceId}.json`;
  if (query) {
    return `${url}?$query=${encodeURIComponent(query)}`;
  }
  const params: string[] = [];
  if (limit !== undefined) params.push(`$limit=${limit}`);
  if (offset !== undefined) params.push(`$offset=${offset}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

/**
 * Execute the get_data request against the Socrata API.
 */
export async function executeGetData(args: GetDataArgs): Promise<unknown> {
  const url = buildSocrataUrl(args);
  const response = await axios.get(url);
  return response.data;
}
