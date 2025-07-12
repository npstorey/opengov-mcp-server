/**
 * Helper function to make API requests to Socrata endpoints
 */
export declare function fetchFromSocrataApi<T>(path: string, params?: Record<string, unknown>, baseUrl?: string | undefined): Promise<T>;
/**
 * Common types for Socrata API responses
 */
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
export interface CategoryInfo {
    name: string;
    count: number;
}
export interface TagInfo {
    name: string;
    count: number;
}
export interface ColumnInfo {
    name: string;
    dataTypeName: string;
    description?: string;
    fieldName: string;
    [key: string]: unknown;
}
export interface PortalMetrics {
    datasets: number;
    views: number;
    downloads?: number;
    apiCalls?: number;
    [key: string]: unknown;
}
