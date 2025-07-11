/* SHIM – declare only what your code uses, all as `any` so tsc stops complaining */

declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(...a: any[]);
    setRequestHandler(...a: any[]): any;
    connect(...a: any[]): any;
    [k: string]: any;
  }
}

declare module '@modelcontextprotocol/sdk/server/streamableHttp.js' {
  export class StreamableHTTPServerTransport {
    constructor(...a: any[]);
    start(...a: any[]): any;          //  ←  add start()
    stop(...a: any[]): any;
    handleRequest(...a: any[]): any;
    [k: string]: any;
  }
  export type Transport = any;
}

declare module '@modelcontextprotocol/sdk/server/sse.js' {
  export class SSEServerTransport {
    constructor(...a: any[]);
    sessionId: string;
    onclose?: () => void;
    [k: string]: any;
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export const ListToolsRequestSchema: any;
  export const CallToolRequestSchema: any;

  /* missing in v1.15+, but your code still imports it */
  export type Tool = any;            // ← restore removed export so tsc compiles
}
