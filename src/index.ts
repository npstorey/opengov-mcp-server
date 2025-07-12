#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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

async function createLowLevelServerInstance(): Promise<Server> {
  console.log('[Server Factory] Creating low-level Server instance.');
  
  const baseServer = new Server(
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
  baseServer.setRequestHandler(ListToolsRequestSchema, async (request) => {
    console.log('[Server - ListTools] Received ListTools request:', JSON.stringify(request, null, 2));
    
    const tools = [
      {
        name: UNIFIED_SOCRATA_TOOL.name,
        description: UNIFIED_SOCRATA_TOOL.description,
        parameters: UNIFIED_SOCRATA_TOOL.parameters,
        inputSchema: UNIFIED_SOCRATA_TOOL.parameters,
      },
    ];
    
    console.log('[Server - ListTools] Returning tools:', JSON.stringify(tools, null, 2));
    
    return { tools };
  });

  // Handle CallTool
  baseServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.log('[Server - CallTool] Received CallTool request:', JSON.stringify(request, null, 2));
    
    if (!request.params || typeof request.params !== 'object') {
      console.error('[Server - CallTool] Error: request.params is missing or not an object');
      throw new Error('Invalid params: missing params object');
    }

    const toolName = request.params.name;
    const toolArgsFromRpc = request.params.arguments;

    if (toolName === UNIFIED_SOCRATA_TOOL.name) {
      try {
        console.log(`[Server - CallTool] Calling tool: ${toolName} with args:`, JSON.stringify(toolArgsFromRpc, null, 2));
        
        const parsedSocrataParams = socrataToolZodSchema.parse(toolArgsFromRpc);
        console.log(`[Server - CallTool] Parsed Socrata params:`, JSON.stringify(parsedSocrataParams, null, 2));
        
        if (!UNIFIED_SOCRATA_TOOL.handler) {
          throw new Error(`Handler not defined for tool: ${toolName}`);
        }
        
        const toolResult = await UNIFIED_SOCRATA_TOOL.handler(parsedSocrataParams);
        console.log(`[Server - CallTool] Tool ${toolName} executed. Result:`, JSON.stringify(toolResult, null, 2));
        
        let responseText: string;
        if (toolResult === null || toolResult === undefined) {
          responseText = String(toolResult);
        } else if (typeof toolResult === 'string') {
          responseText = toolResult;
        } else if (typeof toolResult === 'number' || typeof toolResult === 'boolean') {
          responseText = toolResult.toString();
        } else {
          try {
            responseText = JSON.stringify(toolResult, null, 2);
          } catch (stringifyError) {
            console.error('[Server - CallTool] Error stringifying toolResult:', stringifyError);
            responseText = `Error: Could not convert tool result to a displayable string.`;
          }
        }
        
        console.log(`[Server - CallTool] Sending result as text content.`);
        return {
          content: [{ type: 'text', text: responseText }],
          isError: false
        };
      } catch (error) {
        console.error(`[Server - CallTool] Error executing tool ${toolName}:`, error);
        if (error instanceof z.ZodError) {
          console.error('[Server - CallTool] ZodError issues:', JSON.stringify(error.issues, null, 2));
        }
        throw error;
      }
    } else {
      console.warn(`[Server - CallTool] Unknown tool called: ${toolName}`);
      throw new Error(`Method not found: ${toolName}`);
    }
  });

  console.log('[Server Factory] Low-level Server instance created and request handlers registered.');
  return baseServer;
}

async function startApp() {
  let mainTransportInstance: StreamableHTTPServerTransport | undefined = undefined;
  let lowLevelServer: Server | undefined = undefined;
  const sseTransports: Record<string, SSEServerTransport> = {};

  try {
    const app = express();
    
    // CORS comes first
    app.use(cors({
      origin: true,
      credentials: true,
      exposedHeaders: ['mcp-session-id']
    }));

    const mcpPath = '/mcp';
    app.options(mcpPath, cors({ origin: true, credentials: true }));

    const ssePath = '/mcp-sse';
    app.options(ssePath, cors({ origin: true, credentials: true }));

    const port = Number(process.env.PORT) || 8000;

    // Health check
    app.get('/healthz', (_req, res) => {
      console.log('[MCP Health] /healthz endpoint hit');
      res.sendStatus(200);
    });
    
    // Create transport instance
    console.log('[MCP Setup] Creating main transport instance...');
    mainTransportInstance = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => Math.random().toString(36).slice(2),
      // Add logging for debugging
      onMessage: (message: any) => {
        console.log('[Transport onMessage]', JSON.stringify(message, null, 2));
      },
      onError: (error: any) => {
        console.error('[Transport onError]', error);
      }
    });
    
    // Log when sessions are initialized
    if ('onsessioninitialized' in mainTransportInstance) {
      mainTransportInstance.onsessioninitialized = (sessionId: string) => {
        console.log('[MCP Transport] Session initialized:', sessionId);
      };
    }
    
    // Override or wrap handleRequest to add logging
    const originalHandleRequest = mainTransportInstance.handleRequest.bind(mainTransportInstance);
    mainTransportInstance.handleRequest = async (req: any, res: any) => {
      console.log(`[Transport handleRequest] ${req.method} ${req.url}`);
      console.log('[Transport handleRequest] Headers:', req.headers);
      if (req.body) {
        console.log('[Transport handleRequest] Body:', req.body);
      }
      try {
        const result = await originalHandleRequest(req, res);
        console.log('[Transport handleRequest] Request handled successfully');
        return result;
      } catch (error) {
        console.error('[Transport handleRequest] Error:', error);
        throw error;
      }
    };
    
    if ('onsessioninitialized' in mainTransportInstance) {
      mainTransportInstance.onsessioninitialized = (sessionId: string) => {
        console.log('[MCP Transport] Session initialized:', sessionId);
      };
    }
    
    // Create server instance
    console.log('[MCP Setup] Creating single Server instance (low-level)...');
    lowLevelServer = await createLowLevelServerInstance();
    
    // Connect server to transport
    console.log('[MCP Setup] Connecting single Server (low-level) to main transport...');
    await lowLevelServer.connect(mainTransportInstance);
    console.log('[MCP Setup] Server connected ✅');
    
    mainTransportInstance.onerror = (error: any) => {
      console.error('[MCP Transport - onerror] Transport-level error:', error);
    };
    
    mainTransportInstance.onclose = () => {
      console.log('[MCP Transport - onclose] Main transport connection closed/terminated by transport itself.');
    };
    
    // Accept-header shim for OpenAI connector
    app.use(mcpPath, (req, _res, next) => {
      const h = req.headers.accept ?? '';
      if (!h.includes('text/event-stream')) {
        req.headers.accept = h ? `${h}, text/event-stream` : 'text/event-stream';
      }
      next();
    });
    
    // Parse body as text for MCP endpoint
    app.use(mcpPath, express.text({ type: '*/*' }));
    
    // Main MCP route - let the transport handle everything
    app.all(mcpPath, (req, res) => {
      console.log(`[Express /mcp ENTRY] Method: ${req.method}, URL: ${req.originalUrl}, Origin: ${req.headers.origin}`);
      
      if (!mainTransportInstance) {
        console.error('[Express Route /mcp] Main transport not initialized!');
        if (!res.headersSent) res.status(503).send('MCP Service Unavailable');
        return;
      }
      
      mainTransportInstance.handleRequest(req, res).catch((err: any) => {
        console.error('[transport]', err);
        if (!res.headersSent) res.status(500).end();
      });
    });
    
    // Legacy SSE transport endpoint
    app.all(ssePath, (req, res) => {
      console.log(`[Express /mcp-sse ENTRY] Method: ${req.method}, URL: ${req.originalUrl}, Origin: ${req.headers.origin}`);
      
      if (req.method === 'GET') {
        const transport = new SSEServerTransport(ssePath, res);
        sseTransports[transport.sessionId] = transport;
        
        transport.onclose = () => {
          delete sseTransports[transport.sessionId];
        };
        
        console.log('[SSE] session', transport.sessionId);
        
        if (lowLevelServer) {
          lowLevelServer.connect(transport).catch((err: any) => {
            console.error('[transport]', err);
            if (!res.headersSent) res.status(500).end();
          });
        }
      } else if (req.method === 'POST') {
        const sessionId = req.query.sessionId as string;
        const transport = sseTransports[sessionId];
        
        if (!transport) {
          if (!res.headersSent) res.status(400).send('No transport found for sessionId');
          return;
        }
        
        transport.handlePostMessage(req, res, req.body).catch((err: any) => {
          console.error('[transport]', err);
          if (!res.headersSent) res.status(500).end();
        });
      } else {
        if (!res.headersSent) res.status(405).end();
      }
    });
    
    app.get('/', (req, res) => {
      res.status(200).send('OpenGov MCP Server is running. MCP endpoint at /mcp.');
    });
    
    const httpServer = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 MCP server listening on port ${port}. MCP endpoint at ${mcpPath}, Health at /healthz`);
    });
    
    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} signal received: closing resources.`);
      
      if (lowLevelServer) {
        console.log('Closing low-level Server...');
        // Server might not have a close method, transport handles it
      }
      
      if (mainTransportInstance) {
        console.log('Closing main transport...');
        await mainTransportInstance.close().catch((e: any) => console.error('Error closing main transport:', e));
      }
      
      httpServer.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('Fatal error during application startup:', err);
    
    if (mainTransportInstance) {
      await mainTransportInstance.close().catch((e: any) => console.error('Error closing main transport during fatal startup error:', e));
    }
    
    process.exit(1);
  }
}

startApp().catch(async (err) => {
  console.error('[Fatal] Uncaught error during startup process wrapper:', err);
  process.exit(1);
});
