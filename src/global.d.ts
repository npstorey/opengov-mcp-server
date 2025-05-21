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
  type McpServerTransport = import('@modelcontextprotocol/sdk/server/streamableHttp.js').StreamableHTTPServerTransport;
  type JSONRPCMessage = any;
  type Server = import('@modelcontextprotocol/sdk/server/index.js').Server;

  export class McpServer {
    constructor(meta: { name: string; version: string }, options?: import('@modelcontextprotocol/sdk/server/index.js').ServerOptions);
    readonly server: Server;
    tool(
      name: string,
      description: string,
      inputSchema: import('zod').ZodTypeAny,
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

declare module '@modelcontextprotocol/sdk/server/index.js' {
  type JSONRPCMessage = any;
  type ServerRequest = any;
  type ServerNotification = any;
  type AuthInfo = any;
  type Transport = import('@modelcontextprotocol/sdk/server/streamableHttp.js').StreamableHTTPServerTransport;
  type RequestHandlerExtra<RequestT extends ServerRequest, NotificationT extends ServerNotification> = {
    transport: Transport;
    authInfo?: AuthInfo;
  };

  export interface ServerOptions {
  }
  export class Server<RequestT extends ServerRequest = ServerRequest, NotificationT extends ServerNotification = ServerNotification, ResultT = any> {
    constructor(serverInfo: any, options?: ServerOptions);
    connect(transport: Transport): Promise<void>;
    send(message: JSONRPCMessage, options?: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/sse.js' {
  type ExpressRequest = import('express').Request;
  type ExpressResponse = import('express').Response;

  export class SSEServerTransport {
    constructor(postMessagesUrl: string, res: ExpressResponse);
    sessionId: string;
    handlePostMessage(req: ExpressRequest, res: ExpressResponse, body?: any): void;
    // Add other methods like 'close' if they are documented and needed
    // close?(): void;
  }
}

declare module '@modelcontextprotocol/sdk/server/streamableHttp.js' {
  // Use raw Node types as seen in the .d.ts
  type IncomingMessage = import('node:http').IncomingMessage;
  type ServerResponse = import('node:http').ServerResponse;
  type JSONRPCMessage = any; // Add a basic type for JSONRPCMessage
  type RequestId = string | number | null; // Basic type for RequestId
  type AuthInfo = Record<string, unknown> | undefined; // Changed from any

  // Based on StreamableHTTPServerTransport.d.ts
  export interface StreamableHTTPServerTransportOptions {
    sessionIdGenerator: (() => string) | undefined;
    onsessioninitialized?: (sessionId: string) => void;
    enableJsonResponse?: boolean;
    eventStore?: any; // Replace 'any' with a more specific 'EventStore' interface if defined elsewhere
    // Add other options if they become relevant from the .d.ts
  }

  export class StreamableHTTPServerTransport {
    constructor(options: StreamableHTTPServerTransportOptions);

    sessionId?: string | undefined; // sessionId is a property on the instance
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage, extra?: { authInfo?: AuthInfo; sessionId?: string }) => void; // Added sessionId to extra

    start(): Promise<void>; // Though a no-op, it's in the interface
    handleRequest(
      req: IncomingMessage & { auth?: AuthInfo },
      res: ServerResponse,
      parsedBody?: unknown
    ): Promise<void>;
    close(): Promise<void>;
    send(message: JSONRPCMessage, options?: { relatedRequestId?: RequestId; sessionId?: string }): Promise<void>; // Added sessionId to send options
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  import { ZodTypeAny } from 'zod';

  export interface Tool {
    name: string;
    description: string;
    inputSchema?: ZodTypeAny;
    parameters?: ZodTypeAny;
  }
  export const CallToolRequestSchema: any; // Or a more specific type based on SDK
  export const ListToolsRequestSchema: any; // Or a more specific type
  export function isInitializeRequest(body: any): boolean;
  // Add any other types/exports from '.../types.js'.
}

