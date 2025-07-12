import axios from 'axios'; // Import AxiosError for type checking
// Get configured data portal URL from environment
const DATA_PORTAL_URL = process.env.DATA_PORTAL_URL;
const DEFAULT_BASE_URL = DATA_PORTAL_URL;
/**
 * Helper function to make API requests to Socrata endpoints
 */
export async function fetchFromSocrataApi(path, params = {}, baseUrl = DEFAULT_BASE_URL) {
    const url = `${baseUrl}${path}`;
    try {
        const response = await axios.get(url, { params });
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