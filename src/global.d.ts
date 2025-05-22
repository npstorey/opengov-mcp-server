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
  import { ZodTypeAny, z } from 'zod';
  type McpServerTransport = import('@modelcontextprotocol/sdk/server/streamableHttp.js').StreamableHTTPServerTransport;
  type JSONRPCMessage = any;
  type Server = import('@modelcontextprotocol/sdk/server/index.js').Server;

  export class McpServer {
    constructor(meta: { name: string; version: string }, options?: import('@modelcontextprotocol/sdk/server/index.js').ServerOptions);
    readonly server: Server;
    tool<P extends ZodTypeAny>(
      name: string,
      parameters: P,
      handler: (
        params: z.infer<P>,
        context?: McpToolHandlerContext
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

    // Add setRequestHandler based on SDK usage patterns
    // It takes a Zod schema for the request and a handler that receives the parsed request.
    // The handler returns the result part of the JSON-RPC response.
    setRequestHandler<Schema extends import('zod').ZodTypeAny>(
      schema: Schema,
      handler: (request: import('zod').z.infer<Schema>) => Promise<any> // Return type is the 'result' field of JSON-RPC response
    ): void;
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
  import { ZodTypeAny, z } from 'zod';
  import { type JsonSchema7Type } from 'zod-to-json-schema';

  // Base for all MCP requests, usually includes jsonrpc, id, method
  // For simplicity in shimming, we'll keep it somewhat generic but hint at structure.
  interface BaseMcpRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    // params might vary or be optional for some base requests like notifications
    params?: unknown; 
  }

  // Schema for ListTools parameters
  const ListToolsParamsSchema: z.ZodOptional<z.ZodObject<{ // params can be an empty object or not present
    // _meta?: z.ZodOptional<z.ZodObject<{ progressToken: z.ZodOptional<z.ZodAny> }>> // Example, adjust if known
  }>>;

  // Schema for the entire ListTools request
  export const ListToolsRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<'2.0'>,
    id: z.ZodUnion<[z.ZodString, z.ZodNumber]>,
    method: z.ZodLiteral<'tools/list'>,
    params: typeof ListToolsParamsSchema
  }>;

  // Schema for CallTool parameters (the content of jsonrpc.params)
  const CallToolParamsSchema: z.ZodObject<{
    name: z.ZodString,
    arguments: z.ZodAny, // The actual tool arguments, can be any JSON structure
    sessionId: z.ZodOptional<z.ZodString>,
    // _meta?: z.ZodOptional<z.ZodObject<{ progressToken: z.ZodOptional<z.ZodAny> }>> // Example, adjust if known
  }>;

  // Schema for the entire CallTool request
  export const CallToolRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<'2.0'>,
    id: z.ZodUnion<[z.ZodString, z.ZodNumber]>,
    method: z.ZodLiteral<'tools/call'>,
    params: typeof CallToolParamsSchema 
  }>;

  export interface Tool {
    name: string;
    description?: string;
    parameters: JsonSchema7Type; // This is the JSON Schema for UI and client understanding
    inputSchema?: JsonSchema7Type; // For MCP Inspector v0.8.2 compatibility
    handler?: (params: Record<string, unknown>) => Promise<unknown>; // Actual handler in socrata-tools.ts
  }
  
  export function isInitializeRequest(body: any): boolean;
  // Add any other types/exports from '.../types.js' if needed.
}

// Define McpToolHandlerContext globally so it can be used across files
// without explicit imports if TS is configured to pick up .d.ts files.
interface McpToolHandlerContext {
  sendNotification(method: string, params?: Record<string, unknown>): Promise<void>;
  sessionId: string;
}

