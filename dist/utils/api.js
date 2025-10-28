import axios from 'axios'; // Import AxiosError for type checking
// Get configured data portal URL from environment
const DATA_PORTAL_URL = process.env.DATA_PORTAL_URL ?? '';
const DEFAULT_BASE_URL = DATA_PORTAL_URL;
const SOCRATA_APP_TOKEN = process.env.SOCRATA_APP_TOKEN ?? '';
const DATASET_PATH_REGEX = /\/resource\/(\w{4}-\w{4})\.json$/i;
const DATASET_ID_REGEX = /(\w{4}-\w{4})/i;
const PAGE_SIZE_LIMIT = 50000;
function buildSoda3Url(datasetId, baseUrl = DEFAULT_BASE_URL) {
    if (!baseUrl) {
        throw new Error('DATA_PORTAL_URL is not configured');
    }
    const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${trimmedBase}/api/v3/views/${datasetId}/query.json`;
}
function buildTokenHeader() {
    return SOCRATA_APP_TOKEN ? { 'X-App-Token': SOCRATA_APP_TOKEN } : {};
}
function isDatasetPath(path) {
    return DATASET_PATH_REGEX.test(path);
}
function extractDatasetId(path) {
    const match = path.match(DATASET_ID_REGEX);
    if (!match) {
        throw new Error(`Unable to determine dataset identifier from path: ${path}`);
    }
    return match[1].toLowerCase();
}
function buildSoda3Payload(params) {
    const payload = {};
    const sql = buildSoda3QueryString(params);
    if (sql) {
        payload.query = sql;
    }
    if (params.$limit !== undefined || params.$offset !== undefined) {
        payload.page = {
            pageSize: clampPageSize(params.$limit),
            pageNumber: calculatePageNumber(params.$offset, params.$limit)
        };
    }
    if (typeof params.format === 'string' && params.format.trim().length > 0) {
        payload.format = params.format.trim();
    }
    return payload;
}
function buildSoda3QueryString(params) {
    if (typeof params.$query === 'string' && params.$query.trim().length > 0) {
        return params.$query.trim();
    }
    const selectClause = typeof params.$select === 'string' && params.$select.trim().length > 0 ? params.$select.trim() : '*';
    let sql = `SELECT ${selectClause}`;
    if (typeof params.$where === 'string' && params.$where.trim().length > 0) {
        sql += ` WHERE ${params.$where.trim()}`;
    }
    if (typeof params.$group === 'string' && params.$group.trim().length > 0) {
        sql += ` GROUP BY ${params.$group.trim()}`;
    }
    if (typeof params.$having === 'string' && params.$having.trim().length > 0) {
        sql += ` HAVING ${params.$having.trim()}`;
    }
    if (typeof params.$order === 'string' && params.$order.trim().length > 0) {
        sql += ` ORDER BY ${params.$order.trim()}`;
    }
    if (isFiniteNumber(params.$limit)) {
        sql += ` LIMIT ${params.$limit}`;
    }
    if (isFiniteNumber(params.$offset)) {
        sql += ` OFFSET ${params.$offset}`;
    }
    return sql;
}
function clampPageSize(limit) {
    if (!isFiniteNumber(limit)) {
        return PAGE_SIZE_LIMIT;
    }
    return Math.min(Math.max(Math.trunc(limit), 1), PAGE_SIZE_LIMIT);
}
function calculatePageNumber(offset, limit) {
    if (!isFiniteNumber(offset) || !isFiniteNumber(limit) || limit === 0) {
        return 1;
    }
    return Math.floor(Math.trunc(offset) / Math.trunc(limit)) + 1;
}
function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
/**
 * Helper function to make API requests to Socrata SODA3 endpoints
 */
export async function fetchFromSocrataApi(path, params = {}, baseUrl = DEFAULT_BASE_URL) {
    try {
        const tokenHeader = buildTokenHeader();
        if (isDatasetPath(path)) {
            const datasetId = extractDatasetId(path);
            const url = buildSoda3Url(datasetId, baseUrl);
            const payload = buildSoda3Payload(params);
            const response = await axios.post(url, payload, {
                headers: {
                    ...tokenHeader,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        if (!baseUrl) {
            throw new Error('DATA_PORTAL_URL is not configured');
        }
        const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${trimmedBase}${path}`;
        const response = await axios.get(url, {
            params,
            headers: tokenHeader
        });
        return response.data;
    }
    catch (e) { // Explicitly type caught error as unknown
        if (axios.isAxiosError(e)) {
            // e is now narrowed to AxiosError
            const axiosError = e; // Further assertion for clarity if needed, or just use e
            if (axiosError.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                throw new Error(`API request failed: ${axiosError.response.status} - ${axiosError.response.statusText}\nData: ${JSON.stringify(axiosError.response.data)}`);
            }
            else if (axiosError.request) {
                // The request was made but no response was received
                throw new Error(`API request failed: No response received. Message: ${axiosError.message}`);
            }
            else {
                // Something happened in setting up the request that triggered an Error
                throw new Error(`API request setup failed: ${axiosError.message}`);
            }
        }
        // Handle non-Axios errors or rethrow
        if (e instanceof Error) {
            throw new Error(`An unexpected error occurred: ${e.message}`);
        }
        // Fallback for truly unknown errors
        throw new Error(`An unexpected and unknown error occurred: ${String(e)}`);
    }
}
//# sourceMappingURL=api.js.map