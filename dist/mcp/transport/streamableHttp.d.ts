import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
/** Generic transport interface used by the server. */
export interface Transport {
    start(): Promise<void>;
    stop(): Promise<void>;
}
/**
 * Current transport implementation based on StreamableHTTPServerTransport.
 * We only add a `stop` alias so callers can rely on a minimal Transport API
 * without overriding the original `start` method.
 */
export declare const currentTransport: Transport & StreamableHTTPServerTransport;
