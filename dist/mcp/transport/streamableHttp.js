import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
const instance = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => Math.random().toString(36).slice(2)
});
/**
 * Current transport implementation based on StreamableHTTPServerTransport.
 * We only add a `stop` alias so callers can rely on a minimal Transport API
 * without overriding the original `start` method.
 */
export const currentTransport = Object.assign(instance, {
    stop: () => instance.close()
});
//# sourceMappingURL=streamableHttp.js.map