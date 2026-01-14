import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DatasetMetadata, CategoryInfo, TagInfo, ColumnInfo } from '../utils/api.js';
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
export declare const searchToolZodSchema: z.ZodObject<{
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
}, {
    query: string;
}>;
export declare const fetchToolZodSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const socrataToolZodSchema: z.ZodObject<{
    type: z.ZodEnum<["catalog", "metadata", "query"]>;
    query: z.ZodOptional<z.ZodString>;
    domain: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodLiteral<"all">]>>;
    offset: z.ZodOptional<z.ZodNumber>;
    select: z.ZodOptional<z.ZodString>;
    where: z.ZodOptional<z.ZodString>;
    order: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    having: z.ZodOptional<z.ZodString>;
    dataset_id: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "metadata" | "query" | "catalog";
    offset?: number | undefined;
    order?: string | undefined;
    q?: string | undefined;
    select?: string | undefined;
    group?: string | undefined;
    query?: string | undefined;
    domain?: string | undefined;
    where?: string | undefined;
    limit?: number | "all" | undefined;
    having?: string | undefined;
    dataset_id?: string | undefined;
}, {
    type: "metadata" | "query" | "catalog";
    offset?: number | undefined;
    order?: string | undefined;
    q?: string | undefined;
    select?: string | undefined;
    group?: string | undefined;
    query?: string | undefined;
    domain?: string | undefined;
    where?: string | undefined;
    limit?: number | "all" | undefined;
    having?: string | undefined;
    dataset_id?: string | undefined;
}>;
export type SocrataToolParams = z.infer<typeof socrataToolZodSchema>;
export type SearchToolParams = z.infer<typeof searchToolZodSchema>;
export type FetchToolParams = z.infer<typeof fetchToolZodSchema>;
export declare const UNIFIED_SOCRATA_TOOL: Tool;
export declare const SEARCH_TOOL: Tool;
export declare const FETCH_TOOL: Tool;
export declare function handleSocrataTool(rawParams: SocrataToolParams | any): Promise<unknown>;
export declare const handleCatalogTool: typeof handleCatalog;
export declare const handleCategoriesTool: typeof handleCategories;
export declare const handleTagsTool: typeof handleTags;
export declare const handleDatasetMetadataTool: typeof handleDatasetMetadata;
export declare const handleColumnInfoTool: typeof handleColumnInfo;
export declare const handleDataAccessTool: typeof handleDataAccess;
export declare function handleSearchTool(rawParams: SearchToolParams | any): Promise<{
    content: {
        type: 'text';
        text: string;
    }[];
}>;
export declare function handleFetchTool(rawParams: FetchToolParams | any): Promise<{
    content: {
        type: 'text';
        text: string;
    }[];
}>;
export declare const SOCRATA_TOOLS: any[];
export {};
