import { z } from 'zod';
/** Parameters for the get_data tool */
export declare const GetDataArgs: z.ZodEffects<z.ZodObject<{
    domain: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["catalog", "dataset"]>>;
    query: z.ZodOptional<z.ZodString>;
    resourceId: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "dataset" | "catalog";
    domain: string;
    offset?: number | undefined;
    query?: string | undefined;
    limit?: number | undefined;
    resourceId?: string | undefined;
}, {
    domain: string;
    type?: "dataset" | "catalog" | undefined;
    offset?: number | undefined;
    query?: string | undefined;
    limit?: number | undefined;
    resourceId?: string | undefined;
}>, {
    type: "dataset" | "catalog";
    domain: string;
    offset?: number | undefined;
    query?: string | undefined;
    limit?: number | undefined;
    resourceId?: string | undefined;
}, {
    domain: string;
    type?: "dataset" | "catalog" | undefined;
    offset?: number | undefined;
    query?: string | undefined;
    limit?: number | undefined;
    resourceId?: string | undefined;
}>;
export type GetDataArgs = z.infer<typeof GetDataArgs>;
/**
 * Build a Socrata request URL based on arguments.
 * Catalog queries keep paging params as plain `limit`/`offset` while
 * dataset calls use `$limit`/`$offset`. When a SOQL `$query` is supplied,
 * paging parameters are expected inside the query string and are therefore
 * omitted from the URL.
 */
export declare function buildSocrataUrl(args: GetDataArgs): string;
/**
 * Execute the get_data request against the Socrata API.
 */
export declare function executeGetData(args: GetDataArgs): Promise<unknown>;
