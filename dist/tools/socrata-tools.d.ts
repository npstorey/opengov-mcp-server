import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DatasetMetadata, CategoryInfo, TagInfo, ColumnInfo, PortalMetrics } from '../utils/api.js';
import { SearchIdsResponse } from './search-ids.js';
import { DocumentRetrievalResponse } from './document-retrieval.js';
declare function handleCatalog(params: {
    query?: string;
    domain?: string;
    limit?: number;
    offset?: number;
}): Promise<DatasetMetadata[]>;
declare function handleCategories(params: {
    domain?: string;
}): Promise<CategoryInfo[]>;
declare function handleTags(params: {
    domain?: string;
}): Promise<TagInfo[]>;
declare function handleDatasetMetadata(params: {
    datasetId: string;
    domain?: string;
}): Promise<Record<string, unknown>>;
declare function handleColumnInfo(params: {
    datasetId: string;
    domain?: string;
}): Promise<ColumnInfo[]>;
declare function handleDataAccess(params: {
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
}): Promise<Record<string, unknown>[]>;
declare function handleSiteMetrics(params: {
    domain?: string;
}): Promise<PortalMetrics>;
export declare const searchToolZodSchema: z.ZodObject<{
    datasetId: z.ZodOptional<z.ZodString>;
    domain: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    where: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    offset?: number | undefined;
    query?: string | undefined;
    datasetId?: string | undefined;
    domain?: string | undefined;
    where?: string | undefined;
    limit?: number | undefined;
}, {
    offset?: number | undefined;
    query?: string | undefined;
    datasetId?: string | undefined;
    domain?: string | undefined;
    where?: string | undefined;
    limit?: number | undefined;
}>;
export declare const documentRetrievalZodSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    datasetId: z.ZodOptional<z.ZodString>;
    domain: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ids: string[];
    datasetId?: string | undefined;
    domain?: string | undefined;
}, {
    ids: string[];
    datasetId?: string | undefined;
    domain?: string | undefined;
}>;
export declare const socrataToolZodSchema: z.ZodObject<{
    type: z.ZodEnum<["catalog", "metadata", "query", "metrics"]>;
    query: z.ZodOptional<z.ZodString>;
    domain: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodLiteral<"all">]>>;
    offset: z.ZodOptional<z.ZodNumber>;
    select: z.ZodOptional<z.ZodString>;
    where: z.ZodOptional<z.ZodString>;
    order: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    having: z.ZodOptional<z.ZodString>;
    datasetId: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "metadata" | "query" | "catalog" | "metrics";
    offset?: number | undefined;
    order?: string | undefined;
    q?: string | undefined;
    select?: string | undefined;
    group?: string | undefined;
    query?: string | undefined;
    datasetId?: string | undefined;
    domain?: string | undefined;
    where?: string | undefined;
    limit?: number | "all" | undefined;
    having?: string | undefined;
}, {
    type: "metadata" | "query" | "catalog" | "metrics";
    offset?: number | undefined;
    order?: string | undefined;
    q?: string | undefined;
    select?: string | undefined;
    group?: string | undefined;
    query?: string | undefined;
    datasetId?: string | undefined;
    domain?: string | undefined;
    where?: string | undefined;
    limit?: number | "all" | undefined;
    having?: string | undefined;
}>;
export type SocrataToolParams = z.infer<typeof socrataToolZodSchema>;
export type SearchToolParams = z.infer<typeof searchToolZodSchema>;
export type DocumentRetrievalParams = z.infer<typeof documentRetrievalZodSchema>;
export declare const UNIFIED_SOCRATA_TOOL: Tool;
export declare const SEARCH_TOOL: Tool;
export declare const DOCUMENT_RETRIEVAL_TOOL: Tool;
export declare function handleSocrataTool(params: SocrataToolParams): Promise<unknown>;
export declare const handleCatalogTool: typeof handleCatalog;
export declare const handleCategoriesTool: typeof handleCategories;
export declare const handleTagsTool: typeof handleTags;
export declare const handleDatasetMetadataTool: typeof handleDatasetMetadata;
export declare const handleColumnInfoTool: typeof handleColumnInfo;
export declare const handleDataAccessTool: typeof handleDataAccess;
export declare const handleSiteMetricsTool: typeof handleSiteMetrics;
export declare function handleSearchTool(params: SearchToolParams): Promise<SearchIdsResponse>;
export declare function handleDocumentRetrievalTool(params: DocumentRetrievalParams): Promise<DocumentRetrievalResponse>;
export declare const SOCRATA_TOOLS: any[];
export {};
