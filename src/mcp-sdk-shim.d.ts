/* Quick‑and‑dirty shim so tsc stops complaining about deep MCP paths. */
/* Values are typed as any – you still get runtime behaviour, but skip errors. */

declare module '@modelcontextprotocol/sdk/dist/esm/server/index.js' {
  export class Server {}
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js' {
  export class StreamableHTTPServerTransport {}
  export type Transport = any;
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/sse.js' {
  export class SSEServerTransport {}
}

declare module '@modelcontextprotocol/sdk/dist/esm/types.js' {
  export const ListToolsRequestSchema: any;
  export const CallToolRequestSchema: any;
}
