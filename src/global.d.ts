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
  type McpServerTransport = any; // Replace 'any' if a base type is known/exported

  export class Server {
    constructor(meta: { name: string; version: string }, capabilities: { capabilities: any });
    setRequestHandler(
      schema: any, // Ideally, import specific RequestSchema types if available or define them
      handler: (request: { params: any }) => Promise<{ content: Array<{type: string, text: string}>; isError: boolean }>
    ): void;
    sendLoggingMessage(log: { level: 'info' | 'error'; data: any }): void;
    // ADDED: connect method declaration based on likely usage pattern
    connect(transport: McpServerTransport): Promise<void>;
  }
  // Add any other exports from '.../server/index.js' that you might use.
}

declare module '@modelcontextprotocol/sdk/server/streamableHttp.js' {
  // We know connect doesn't exist here now, so we don't declare it.
  export class StreamableHTTPServerTransport {
    constructor(options: {
      host: string;
      port: number;
      basePath: string;
      sessionIdGenerator?: () => string; // if you were to use it
    });
    // Declare the 'start' method which exists on the prototype
    start(): Promise<void>;
    // Declare 'close' if needed
    // close(): Promise<void>;
    // Note: 'send' is also available but usually called internally by the Server
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
