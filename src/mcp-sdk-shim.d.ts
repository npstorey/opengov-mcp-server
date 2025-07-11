/* SHIM – declare only what your code uses, all as `any` so tsc stops complaining */

declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(...a: any[]);
    setRequestHandler(...a: any[]): any;
    connect(...a: any[]): any;
    close(...a: any[]): any;
    [k: string]: any;
  }
}

declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export class McpServer {
    constructor(...a: any[]);
    tool(...a: any[]): any;
    connect(...a: any[]): any;
    close(...a: any[]): any;
    [k: string]: any;
  }
}

declare module '@modelcontextprotocol/sdk' {
  export function createSimpleHTTPServerTransport(): any;
}

declare module '@modelcontextprotocol/sdk/server/streamableHttp.js' {
  export class StreamableHTTPServerTransport {
    constructor(...a: any[]);
    start(...a: any[]): any;
    stop(...a: any[]): any;
    close(...a: any[]): any;
    handleRequest(...a: any[]): any;
    onsessioninitialized?: (sessionId: string) => void;
    onmessage?: (message: any, extra?: any) => void;
    onerror?: (error: any) => void;
    onclose?: () => void;
    [k: string]: any;
  }
  export type Transport = any;
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor(...a: any[]);
    start(...a: any[]): any;
    [k: string]: any;
  }
}

declare module '@modelcontextprotocol/sdk/server/sse.js' {
  export class SSEServerTransport {
    constructor(...a: any[]);
    sessionId: string;
    onclose?: () => void;
    handlePostMessage(...a: any[]): any;
    [k: string]: any;
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export const ListToolsRequestSchema: any;
  export const CallToolRequestSchema: any;
  export type Tool = any;
}
