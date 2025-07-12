#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import {
  UNIFIED_SOCRATA_TOOL,
  socrataToolZodSchema,
} from './tools/socrata-tools.js';
import { z } from 'zod';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

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
      params: z.any()
    });
    
    server.setRequestHandler(InitializeRequestSchema, async (request) => {
      console.log('[Server - Initialize] Request received');
      return {
        protocolVersion: '2025-01-01',
        capabilities: {
          tools: {}
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
          name: UNIFIED_SOCRATA_TOOL.name,
          description: UNIFIED_SOCRATA_TOOL.description,
          parameters: UNIFIED_SOCRATA_TOOL.parameters,
          inputSchema: UNIFIED_SOCRATA_TOOL.parameters,
        },
      ],
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
  let transport: StreamableHTTPServerTransport | undefined;
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
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => {
        const sessionId = crypto.randomBytes(16).toString('hex');
        console.log('[Transport] sessionIdGenerator called! Generated:', sessionId);
        return sessionId;
      }
    });

    // Log transport events if available
    if ('onsessioninitialized' in transport) {
      transport.onsessioninitialized = (sessionId: string) => {
        console.log('[Transport] onsessioninitialized fired! Session:', sessionId);
      };
    }
    
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
      
      try {
        const result = await originalHandleRequest(req, res);
        console.log('[Transport.handleRequest] Completed, result:', result);
        return result;
      } catch (error) {
        console.error('[Transport.handleRequest] Error:', error);
        throw error;
      }
    };

    // Create server
    server = await createServer();
    
    // Connect server to transport
    console.log('[MCP] Connecting server to transport...');
    
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
    
    // Verify the connection
    console.log('[MCP] Transport has session handlers:', {
      onmessage: !!transport.onmessage,
      onerror: !!transport.onerror,
      onclose: !!transport.onclose,
      onsessioninitialized: !!transport.onsessioninitialized
    });

    // MCP endpoint
    app.all(mcpPath, async (req, res) => {
      console.log(`[Express] ${req.method} ${req.url}`);
      console.log('[Express] Headers:', {
        'accept': req.headers.accept,
        'content-type': req.headers['content-type'],
        'mcp-session-id': req.headers['mcp-session-id']
      });
      
      // For POST requests, check if body is readable
      if (req.method === 'POST') {
        console.log('[Express] Request readable:', req.readable);
        console.log('[Express] Request readableEnded:', req.readableEnded);
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
      
      res.setHeader = function(name: string, value: any) {
        console.log(`[Express] Response.setHeader: ${name} = ${value}`);
        return originalSetHeader.call(this, name, value);
      };
      
      res.write = function(chunk: any) {
        console.log('[Express] Response.write called, data length:', chunk ? chunk.length : 0);
        if (chunk && chunk.length < 500) {
          console.log('[Express] Response.write data:', chunk.toString());
        }
        return originalWrite.call(this, chunk);
      };
      
      res.end = function(...args: any[]) {
        console.log('[Express] Response.end called with args:', args.length);
        if (args[0]) {
          console.log('[Express] Response.end data:', args[0].toString().substring(0, 500));
        }
        return originalEnd.apply(this, args);
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
