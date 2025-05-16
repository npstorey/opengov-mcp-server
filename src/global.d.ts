// File: /src/global.d.ts
// (Ensure this file exists with the following content)

// --- process.env typing ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    PORT?: string;
  }
}

// --- @modelcontextprotocol/sdk shims ---
// These declare the modules as seen by TypeScript during compilation.
// The paths must exactly match your import statements including the .js suffix.

declare module '@modelcontextprotocol/sdk/server/index.js' {
  // Define the transport type vaguely here for the method signature
  type McpServerTransport = any; // Generic transport type

  export class Server {
    constructor(meta: { name: string; version: string }, capabilities: { capabilities: any });
    setRequestHandler(
      schema: any,
      // Allow both a direct {tools: ...} or the wrapped content response for flexibility
      handler: (request: { params: any }) => Promise<{ tools: any[] } | { content: Array<{type: string, text: string}>; isError: boolean }>
    ): void;
    sendLoggingMessage(log: { level: 'info' | 'error'; data: any }): void;
    connect(transport: McpServerTransport): Promise<void>;
    close(): Promise<void>;
    tool?(name: string, paramSchema: any, handler: (params: any) => Promise<any>): any;
    resource?(name: string, template: any, handler: (uri: any, params: any) => Promise<any>): void;
    prompt?(name: string, paramSchema: any, handler: (params: any) => Promise<any>): void;
  }
  // Add any other exports from '.../server/index.js' that you might use.
}

declare module '@modelcontextprotocol/sdk/server/sse.js' {
  // Assuming req and res are Express types, but using 'any' for a generic shim
  type ExpressRequest = any; 
  type ExpressResponse = any;

  export class SSEServerTransport {
    constructor(postMessagesUrl: string, res: ExpressResponse);
    handlePostMessage(req: ExpressRequest, res: ExpressResponse): void;
    // Add other methods like 'close' if they are documented and needed
    // close?(): void; 
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export interface Tool {
    name: string;
    description: string;
    inputSchema: {
      type: 'object';
      properties: Record<string, any>; // Be more specific if possible
      required?: string[];
      additionalProperties?: boolean;
    };
  }
  export const CallToolRequestSchema: any; // Or a more specific type based on SDK
  export const ListToolsRequestSchema: any; // Or a more specific type
  export function isInitializeRequest(body: any): boolean;
  // Add any other types/exports from '.../types.js'.
}
