import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

/** Generic transport interface used by the server. */
export interface Transport {
  start(): Promise<void>;
  stop(): Promise<void>;
}

const instance = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => Math.random().toString(36).slice(2)
});

/**
 * Current transport implementation based on StreamableHTTPServerTransport.
 * We only add a `stop` alias so callers can rely on a minimal Transport API
 * without overriding the original `start` method.
 */
export const currentTransport: Transport & StreamableHTTPServerTransport = Object.assign(instance, {
  stop: () => instance.close()
});
