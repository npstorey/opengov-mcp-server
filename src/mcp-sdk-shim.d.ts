/* Extremely permissive declarations so tsc stops complaining.
   You still get runtime behaviour; add real typings later if you wish. */

declare module '@modelcontextprotocol/sdk/dist/esm/server/index.js' {
  export class Server {
    /* accept any constructor */
    constructor(...args: any[]);
    /* allow any property lookup */
    [key: string]: any;
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js' {
  export class StreamableHTTPServerTransport {
    constructor(...args: any[]);
    [key: string]: any;
  }
  export type Transport = any;
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/sse.js' {
  export class SSEServerTransport {
    constructor(...args: any[]);
    [key: string]: any;
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/types.js' {
  export const ListToolsRequestSchema: any;
  export const CallToolRequestSchema: any;
}
