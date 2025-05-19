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

declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  type McpServerTransport = any;

  export class McpServer {
    constructor(meta: { name: string; version: string }, options?: { capabilities?: any });
    tool(
      name: string,
      paramSchema: any,
      handler: (
        params: any,
        context: { sendNotification(method: string, params?: any): Promise<void> }
      ) => Promise<{ content: any[]; isError?: boolean }>
    ): void;
    sendLoggingMessage(log: { level: 'info' | 'error'; data: any }): void;
    connect(transport: McpServerTransport): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/sse.js' {
  type ExpressRequest = import('express').Request;
  type ExpressResponse = import('express').Response;

  export class SSEServerTransport {
    constructor(postMessagesUrl: string, res: ExpressResponse);
    handlePostMessage(req: ExpressRequest, res: ExpressResponse): void;
    onerror?: (error: Error) => void;
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

