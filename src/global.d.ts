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
  export class Server {
    constructor(meta: { name: string; version: string }, capabilities: { capabilities: any });
    setRequestHandler(
      schema: any, // Ideally, import specific RequestSchema types if available or define them
      handler: (request: { params: any }) => Promise<{ content: Array<{type: string, text: string}>; isError: boolean }>
    ): void;
    sendLoggingMessage(log: { level: 'info' | 'error'; data: any }): void;
    // You might need to declare 'connect' if you try StdioServerTransport again.
    // connect(transport: any): Promise<void>;
  }
  // Add any other exports from '.../server/index.js' that you might use.
}

declare module '@modelcontextprotocol/sdk/server/streamableHttp.js' {
  export class StreamableHTTPServerTransport {
    constructor(options: {
      host: string;
      port: number;
      basePath: string;
      sessionIdGenerator?: () => string; // if you were to use it
    });
    connect(server: any): Promise<void>; // 'any' should be 'Server' type from above ideally
  }
  // Add any other exports from '.../server/streamableHttp.js'.
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
  // Add any other types/exports from '.../types.js'.
}
