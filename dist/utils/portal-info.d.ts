/**
 * Portal information that can be discovered from the data portal
 */
export interface PortalInfo {
    title: string;
    url: string;
}
/**
 * Fetches the data portal homepage and extracts the title
 * This helps provide context about which government entity's data portal we're using
 */
export declare function getPortalInfo(): Promise<PortalInfo>;
