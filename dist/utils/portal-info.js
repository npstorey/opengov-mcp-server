import axios from 'axios';
/**
 * Fetches the data portal homepage and extracts the title
 * This helps provide context about which government entity's data portal we're using
 */
export async function getPortalInfo() {
    const portalUrl = process.env.DATA_PORTAL_URL;
    if (!portalUrl) {
        throw new Error('DATA_PORTAL_URL must be set');
    }
    const info = {
        title: `Data Portal`, // Default fallback title
        url: portalUrl
    };
    try {
        // Get HTML title from homepage
        const response = await axios.get(portalUrl);
        const titleMatch = response.data.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            // Clean up the title - remove duplications that might occur
            const title = titleMatch[1].trim();
            // Remove duplicate segments (common in some portals)
            const segments = title.split('|').map((s) => s.trim());
            const uniqueSegments = [...new Set(segments)];
            // Join unique segments back together
            info.title = uniqueSegments.join(' | ');
        }
    }
    catch (error) {
        console.warn('Failed to fetch portal title:', error);
    }
    return info;
}
//# sourceMappingURL=portal-info.js.map