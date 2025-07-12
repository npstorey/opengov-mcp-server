#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
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

  // Handle ListTools
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    console.log('[Server] ListTools request received');
    
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

    // Create transport
    console.log('[MCP] Creating transport...');
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => {
        const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        console.log('[Transport] Generated session ID:', sessionId);
        return sessionId;
      }
    });

    // Log transport events if available
    if ('onsessioninitialized' in transport) {
      transport.onsessioninitialized = (sessionId: string) => {
        console.log('[Transport] Session initialized:', sessionId);
      };
    }

    transport.onerror = (error: any) => {
      console.error('[Transport] Error:', error);
    };

    transport.onclose = () => {
      console.log('[Transport] Connection closed');
    };

    // Create server
    const server = await createServer();
    
    // Connect server to transport
    console.log('[MCP] Connecting server to transport...');
    await server.connect(transport);
    console.log('[MCP] Server connected');

    // MCP endpoint
    app.all(mcpPath, async (req, res) => {
      console.log(`[Express] ${req.method} ${req.url}`);
      console.log('[Express] Headers:', {
        'accept': req.headers.accept,
        'content-type': req.headers['content-type'],
        'mcp-session-id': req.headers['mcp-session-id']
      });
      
      if (!transport) {
        console.error('[Express] Transport not initialized!');
        res.status(503).send('Service Unavailable');
        return;
      }
      
      try {
        await transport.handleRequest(req, res);
        console.log('[Express] Request handled by transport');
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
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} signal received: closing resources.`);
      
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
    
    process.exit(1);
  }
}

startApp().catch(console.error);
