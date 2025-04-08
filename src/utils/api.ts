import axios from 'axios';

// Get configured data portal URL from environment
const DATA_PORTAL_URL = process.env.DATA_PORTAL_URL;
if (!DATA_PORTAL_URL) {
  console.error('ERROR: DATA_PORTAL_URL environment variable must be set');
  process.exit(1);
}
const DEFAULT_BASE_URL = DATA_PORTAL_URL;

/**
 * Helper function to make API requests to Socrata endpoints
 */
export async function fetchFromSocrataApi<T>(path: string, params: Record<string, unknown> = {}, baseUrl = DEFAULT_BASE_URL): Promise<T> {
  const url = `${baseUrl}${path}`;
  
  try {
    const response = await axios.get(url, { params });
    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`API request failed: ${error.response.status} - ${error.response.statusText}\n${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Common types for Socrata API responses
 */

// Dataset metadata in catalog listings
export interface DatasetMetadata {
  id: string;
  name: string;
  description?: string;
  datasetType?: string;
  category?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

// Category information
export interface CategoryInfo {
  name: string;
  count: number;
}

// Tag information
export interface TagInfo {
  name: string;
  count: number;
}

// Column information
export interface ColumnInfo {
  name: string;
  dataTypeName: string;
  description?: string;
  fieldName: string;
  [key: string]: unknown;
}

// Portal metrics
export interface PortalMetrics {
  datasets: number;
  views: number;
  downloads?: number;
  apiCalls?: number;
  [key: string]: unknown;
}
