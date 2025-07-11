#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { OpenAICompatibleTransport } from './openai-compatible-transport.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import {
  UNIFIED_SOCRATA_TOOL,
  SEARCH_TOOL,
  DOCUMENT_RETRIEVAL_TOOL,
  socrataToolZodSchema,
  searchToolZodSchema,
  documentRetrievalZodSchema,
  handleSearchTool,
  handleDocumentRetrievalTool
} from './tools/socrata-tools.js';
import { z } from 'zod';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from './utils/mcp-errors.js';

// Workaround: Define ListPromptsRequestSchema locally since it's not properly exported from SDK
const ListPromptsRequestSchema = z.object({
  method: z.literal("prompts/list"),
  params: z.optional(z.object({
    cursor: z.optional(z.string())
  }))
});

dotenv.config();

async function createServer(): Promise<Server> {
  console.log('[Server] Creating Server instance...');
  
  const server = new Server(
    { name: 'opengov-mcp-server', version: '0.1.1' },
    {
      capabilities: {
        tools: {},
        prompts: {},
        roots: { listChanged: true },
        sampling: {}
      },
      authMethods: []
    }
  );

  // Wrap setRequestHandler to log all registrations and calls
  const originalSetRequestHandler = server.setRequestHandler.bind(server);
  server.setRequestHandler = function(schema: any, handler: any) {
    console.log('[Server] Registering handler for schema:', schema);
    return originalSetRequestHandler(schema, async (request: any, ...args: any[]) => {
      console.log('[Server] Handler called with request:', JSON.stringify(request, null, 2));
      try {
        const result = await handler(request, ...args);
        console.log('[Server] Handler returned:', JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error('[Server] Handler error:', error);
        throw error;
      }
    });
  };

  // Handle Initialize - OpenAI sends this first
  try {
    const InitializeRequestSchema = z.object({
      method: z.literal('initialize'),
      params: z.object({
        protocolVersion: z.string(),
        capabilities: z.any().optional(),
        clientInfo: z.any().optional()
      })
    });
    
    server.setRequestHandler(InitializeRequestSchema, async (request) => {
      console.log('[Server - Initialize] Request received:', JSON.stringify(request, null, 2));
      const protocolVersion = request.params.protocolVersion || '2025-01-01';
      return {
        protocolVersion: protocolVersion,
        capabilities: {
          tools: {
            supported: true
          },
          types: ['search', 'document_retrieval']
        },
        serverInfo: {
          name: 'opengov-mcp-server',
          version: '0.1.1'
        }
      };
    });
  } catch (e) {
    console.log('[Server] Could not register initialize handler:', e);
  }

  // Handle ListTools
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    console.log('[Server - ListTools] Request received');
    
    return {
      tools: [
        {
          name: 'search',
          description: SEARCH_TOOL.description,
          parameters: SEARCH_TOOL.parameters,
          inputSchema: SEARCH_TOOL.parameters,
        },
        {
          name: 'document_retrieval',
          description: DOCUMENT_RETRIEVAL_TOOL.description,
          parameters: DOCUMENT_RETRIEVAL_TOOL.parameters,
          inputSchema: DOCUMENT_RETRIEVAL_TOOL.parameters,
        },
      ],
    };
  });

  // Handle ListPrompts
  server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
    console.log('[Server - ListPrompts] Request received');
    
    return {
      prompts: []  // Return empty array for now
    };
  });

  // Handle CallTool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.log('[Server] CallTool request:', JSON.stringify(request, null, 2));
    
    if (!request.params || typeof request.params !== 'object') {
      throw new Error('Invalid params: missing params object');
    }

    const toolName = request.params.name;
    const toolArgs = request.params.arguments;

    // Handle new search tool
    if (toolName === 'search') {
      try {
        console.log(`[Server] Calling search tool with args:`, JSON.stringify(toolArgs, null, 2));
        
        const parsed = searchToolZodSchema.parse(toolArgs);
        console.log(`[Server] Parsed search params:`, JSON.stringify(parsed, null, 2));
        
        const result = await handleSearchTool(parsed);
        console.log('[Tool] Search result:', JSON.stringify(result, null, 2));
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false
        };
      } catch (error) {
        console.error('[Tool] Search error:', error);
        if (error instanceof z.ZodError) {
          console.error('[Server] ZodError issues:', JSON.stringify(error.issues, null, 2));
        }
        throw error;
      }
    }
    
    // Handle document retrieval tool
    if (toolName === 'document_retrieval') {
      try {
        console.log(`[Server] Calling document_retrieval tool with args:`, JSON.stringify(toolArgs, null, 2));
        
        const parsed = documentRetrievalZodSchema.parse(toolArgs);
        console.log(`[Server] Parsed document retrieval params:`, JSON.stringify(parsed, null, 2));
        
        const result = await handleDocumentRetrievalTool(parsed);
        console.log('[Tool] Document retrieval result:', JSON.stringify(result, null, 2));
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false
        };
      } catch (error) {
        console.error('[Tool] Document retrieval error:', error);
        if (error instanceof z.ZodError) {
          console.error('[Server] ZodError issues:', JSON.stringify(error.issues, null, 2));
        }
        throw error;
      }
    }
    
    // Handle original get_data tool for backward compatibility
    if (toolName === UNIFIED_SOCRATA_TOOL.name) {
      try {
        console.log(`[Server] Calling tool: ${toolName} with args:`, JSON.stringify(toolArgs, null, 2));
        
        const parsed = socrataToolZodSchema.parse(toolArgs);
        console.log(`[Server] Parsed Socrata params:`, JSON.stringify(parsed, null, 2));
        
        const handler = UNIFIED_SOCRATA_TOOL.handler;
        if (typeof handler !== 'function') {
          throw new Error('Tool handler is not a function');
        }
        
        const result = await handler(parsed);
        console.log('[Tool] Result:', JSON.stringify(result, null, 2));
        
        let responseText: string;
        if (result === null || result === undefined) {
          responseText = String(result);
        } else if (typeof result === 'string') {
          responseText = result;
        } else if (typeof result === 'number' || typeof result === 'boolean') {
          responseText = result.toString();
        } else {
          responseText = JSON.stringify(result, null, 2);
        }
        
        return {
          content: [{ type: 'text', text: responseText }],
          isError: false
        };
      } catch (error) {
        console.error('[Tool] Error:', error);
        if (error instanceof z.ZodError) {
          console.error('[Server] ZodError issues:', JSON.stringify(error.issues, null, 2));
        }
        throw error;
      }
    } else {
      throw new Error(`Method not found: ${toolName}`);
    }
  });

  console.log('[Server] Server instance created and request handlers registered.');
  return server;
}

async function startApp() {
  let transport: OpenAICompatibleTransport | undefined;
  let server: Server | undefined;
  
  try {
    const app = express();
    const port = Number(process.env.PORT) || 8000;
    
    console.log('[Environment] DATA_PORTAL_URL:', process.env.DATA_PORTAL_URL);
    
    // IMPORTANT: NO express.json() before /mcp route!
    
    // CORS configuration
    app.use(cors({
      origin: true,
      credentials: true,
      exposedHeaders: ['mcp-session-id']
    }));

    const mcpPath = '/mcp';
    
    // Accept-header shim for OpenAI connector - CRITICAL!
    app.use(mcpPath, (req, _res, next) => {
      const h = req.headers.accept ?? '';
      if (!h.includes('text/event-stream')) {
        req.headers.accept = h ? `${h}, text/event-stream` : 'text/event-stream';
      }
      next();
    });

    // Body parser for /mcp route - parse all content types as text to avoid stream consumption issues
    app.use(mcpPath, express.text({ type: '*/*' }));

    // Health check
    app.get('/healthz', (_req, res) => {
      console.log('[Health] /healthz hit');
      res.sendStatus(200);
    });

    // Root endpoint
    app.get('/', (_req, res) => {
      res.send('OpenGov MCP Server running');
    });
    
    // Debug endpoint to test server
    app.get('/debug', async (_req, res) => {
      console.log('[Debug] Testing server state...');
      res.json({
        server: 'running',
        transport: !!transport,
        serverConnected: !!server,
        environment: {
          DATA_PORTAL_URL: process.env.DATA_PORTAL_URL
        }
      });
    });

    // Create transport
    console.log('[MCP] Creating transport...');
    transport = new OpenAICompatibleTransport({
      sessionIdGenerator: () => {
        const sessionId = crypto.randomBytes(16).toString('hex');
        console.log('[Transport] sessionIdGenerator called! Generated:', sessionId);
        return sessionId;
      },
      // Pass callbacks in constructor options
      onsessioninitialized: (sessionId: string) => {
        console.log('[Transport] onsessioninitialized fired! Session:', sessionId);
      },
      onsessionclosed: (sessionId: string) => {
        console.log('[Transport] onsessionclosed fired! Session:', sessionId);
      }
    });
    
    console.log('[MCP] Transport created, checking properties...');
    console.log('[MCP] Transport prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(transport)));
    console.log('[MCP] Transport instance properties:', Object.getOwnPropertyNames(transport));
    
    transport.onmessage = (message: any, extra?: any) => {
      console.log('[Transport] onmessage fired!', JSON.stringify(message, null, 2));
      if (extra) {
        console.log('[Transport] onmessage extra:', JSON.stringify(extra, null, 2));
      }
    };

    transport.onerror = (error: any) => {
      console.error('[Transport] onerror fired! Error:', error);
    };

    transport.onclose = () => {
      console.log('[Transport] onclose fired!');
    };
    
    // Wrap handleRequest to see what's happening
    const originalHandleRequest = transport.handleRequest.bind(transport);
    transport.handleRequest = async (req: any, res: any) => {
      console.log('[Transport.handleRequest] Called');
      console.log('[Transport.handleRequest] Method:', req.method);
      console.log('[Transport.handleRequest] URL:', req.url);
      console.log('[Transport.handleRequest] Transport internal state:', {
        hasServer: !!(transport as any)._server,
        hasSession: !!(transport as any)._session,
        serverInfo: (transport as any)._server ? {
          name: (transport as any)._server.name,
          connected: true
        } : null
      });
      
      try {
        const result = await originalHandleRequest(req, res);
        console.log('[Transport.handleRequest] Completed, result:', result);
        return result;
      } catch (error) {
        console.error('[Transport.handleRequest] Error:', error);
        throw error;
      }
    };
    
    // Note: Transport will be started automatically when server.connect() is called
    console.log('[MCP] Transport ready for connection');

    // Create server
    server = await createServer();
    
    // Connect server to transport
    console.log('[MCP] Connecting server to transport...');
    
    // Check transport state before connection
    console.log('[MCP] Transport state before connection:', {
      hasServer: !!(transport as any)._server,
      hasHandleRequest: !!transport.handleRequest,
      transportType: transport.constructor.name
    });
    
    // Add extra logging to ensure connection works
    const originalConnect = server.connect.bind(server);
    server.connect = async (transport: any) => {
      console.log('[Server.connect] Connecting...');
      const result = await originalConnect(transport);
      console.log('[Server.connect] Connected!');
      return result;
    };
    
    await server.connect(transport);
    console.log('[MCP] Server connected');
    
    // Check transport state after connection
    console.log('[MCP] Transport state after connection:', {
      hasServer: !!(transport as any)._server,
      serverName: (transport as any)._server?.name,
      isConnected: !!(transport as any)._session
    });
    
    // Verify the connection
    console.log('[MCP] Transport has session handlers:', {
      onmessage: !!transport.onmessage,
      onerror: !!transport.onerror,
      onclose: !!transport.onclose
    });

    // MCP endpoint
    app.all(mcpPath, async (req, res) => {
      console.log(`[Express] ${req.method} ${req.url}`);
      console.log('[Express] Headers:', {
        'accept': req.headers.accept,
        'content-type': req.headers['content-type'],
        'mcp-session-id': req.headers['mcp-session-id'],
        'x-session-id': req.headers['x-session-id']
      });
      
      // Track current request body for response interceptors
      let currentRequestBody: any = null;
      
      // For POST requests, log parsed body (now available via Express body parser)
      if (req.method === 'POST' && req.body) {
        console.log('[Express] Request body:', req.body);
        currentRequestBody = req.body;
        
        // Check if this is an initialize request without a session ID
        try {
          const parsed = JSON.parse(req.body);
          if (parsed.method === 'initialize' && !req.headers['mcp-session-id']) {
            console.log('[Express] Initialize request without session ID detected - this is expected for first request');
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      if (!transport) {
        console.error('[Express] Transport not initialized!');
        res.status(503).send('Service Unavailable');
        return;
      }
      
      // Log response events
      const originalEnd = res.end;
      const originalWrite = res.write;
      const originalSetHeader = res.setHeader;
      const originalJson = res.json;
      
      // Track if we're writing an initialize response
      let isInitializeResponse = false;
      
      res.setHeader = function(name: string, value: any) {
        console.log(`[Express] Response.setHeader: ${name} = ${value}`);
        return originalSetHeader.call(this, name, value);
      };
      
      res.json = function(data: any) {
        console.log('[Express] Response.json:', JSON.stringify(data, null, 2));
        
        // If this is an initialize response, ensure we're sending the session ID
        if (data && data.result && !data.error) {
          const sessionId = res.getHeader('mcp-session-id');
          if (sessionId) {
            console.log('[Express] Initialize response includes session ID in header:', sessionId);
          }
        }
        
        return originalJson.call(this, data);
      };
      
      res.write = function(chunk: any, encoding?: any, callback?: any) {
        console.log('[Express] Response.write called, data length:', chunk ? chunk.length : 0);
        if (chunk && chunk.length < 500) {
          console.log('[Express] Response.write data:', chunk.toString());
        }
        
        // Detect initialize response
        if (chunk && currentRequestBody) {
          const chunkStr = chunk.toString();
          try {
            const parsed = JSON.parse(currentRequestBody);
            if (parsed.method === 'initialize' && chunkStr.includes('"result":') && chunkStr.includes('"protocolVersion":')) {
              isInitializeResponse = true;
              console.log('[Express] Detected initialize response');
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        if (typeof encoding === 'function') {
          callback = encoding;
          encoding = undefined;
        }
        return originalWrite.call(this, chunk, encoding, callback);
      };
      
      res.end = function(chunk?: any, encoding?: any, callback?: any) {
        console.log('[Express] Response.end called');
        if (chunk) {
          const preview = typeof chunk === 'string' ? chunk.substring(0, 500) : 
                          Buffer.isBuffer(chunk) ? chunk.toString().substring(0, 500) : 
                          'non-string data';
          console.log('[Express] Response.end data:', preview);
        }
        
        // Emit roots update if this was an initialize response
        if (isInitializeResponse && res.getHeader('Content-Type') === 'text/event-stream') {
          const rootsEvent = '\n\nevent: message\ndata: {"roots":{"listChanged":true}}\n\n';
          originalWrite.call(this, rootsEvent, 'utf8');
          console.log('[Express] Emitted roots.listChanged SSE event after initialize');
        }
        
        if (typeof chunk === 'function') {
          callback = chunk;
          chunk = undefined;
          encoding = undefined;
        } else if (typeof encoding === 'function') {
          callback = encoding;
          encoding = undefined;
        }
        return originalEnd.call(this, chunk, encoding, callback);
      };
      
      try {
        console.log('[Express] Calling transport.handleRequest...');
        await transport.handleRequest(req, res);
        console.log('[Express] transport.handleRequest returned');
        console.log('[Express] Response headersSent:', res.headersSent);
        console.log('[Express] Response finished:', res.finished);
      } catch (error) {
        console.error('[Express] Error handling request:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });

    // Start server
    const httpServer = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`   Health: http://localhost:${port}/healthz`);
      console.log(`   MCP: http://localhost:${port}/mcp`);
      console.log(`   Debug: http://localhost:${port}/debug`);
      console.log('[Startup] Transport ready:', !!transport);
      console.log('[Startup] Server ready:', !!server);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} signal received: closing resources.`);
      
      if (server) {
        console.log('Closing server...');
        if ('close' in server && typeof server.close === 'function') {
          await server.close().catch((e: any) => console.error('Error closing server:', e));
        }
      }
      
      if (transport) {
        console.log('Closing transport...');
        await transport.close().catch((e: any) => console.error('Error closing transport:', e));
      }
      
      httpServer.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('[Fatal] Error during startup:', error);
    
    if (transport) {
      await transport.close().catch((e: any) => console.error('Error closing transport during fatal error:', e));
    }
    
    if (server) {
      // Server might not have a close method, but we can try
      if ('close' in server && typeof server.close === 'function') {
        await server.close().catch((e: any) => console.error('Error closing server during fatal error:', e));
      }
    }
    
    process.exit(1);
  }
}

startApp().catch(console.error);
