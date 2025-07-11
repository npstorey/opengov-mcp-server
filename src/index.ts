#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { UNIFIED_SOCRATA_TOOL, socrataToolZodSchema } from './tools/socrata-tools.js';
import crypto from 'crypto';
import { z } from 'zod';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

dotenv.config();

async function createLowLevelServerInstance(): Promise<Server> {
  console.log('[Server Factory] Creating low-level Server instance.');
  const baseServer = new Server(
    { name: 'opengov-mcp-server', version: '0.1.1' }, // ServerInfo
    {
      capabilities: {
        tools: {},
        prompts: {}, // Explicitly declare prompts capability (even if empty)
        roots: { listChanged: true }, // Standard capability
        sampling: {} // Standard capability
      },
      authMethods: [] // Explicitly state no authentication methods are offered
    } // ServerOptions
  );

  // --- Handle ListTools --- 
  baseServer.setRequestHandler(ListToolsRequestSchema, async (request: any) => {
    console.log('[Server - ListTools] Received ListTools request:', JSON.stringify(request, null, 2));
    // The UNIFIED_SOCRATA_TOOL.parameters is already our JSON schema object
    return {
      tools: [
        {
          name: UNIFIED_SOCRATA_TOOL.name,
          description: UNIFIED_SOCRATA_TOOL.description,
          parameters: UNIFIED_SOCRATA_TOOL.parameters, // For SDK v1.11.5 spec
          inputSchema: UNIFIED_SOCRATA_TOOL.parameters, // For MCP Inspector v0.8.2 compatibility
        },
      ],
    };
  });

  // --- Handle CallTool --- 
  baseServer.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    console.log('[Server - CallTool] Received CallTool request:', JSON.stringify(request, null, 2));
    // The 'request' object here IS the full JSON-RPC request parsed according to CallToolRequestSchema.
    // CallToolRequestSchema should define fields like: 
    //   params: z.object({ name: z.string(), arguments: z.any() (or a more specific schema) })
    //   id: z.union([z.string(), z.number()])
    //   jsonrpc: z.literal('2.0')
    //   method: z.literal('tools/call')
    // We need to ensure our CallToolRequestSchema shim or the actual SDK type is correct.
    // For now, let's assume request.params.name and request.params.arguments exist.

    if (!request.params || typeof request.params !== 'object') {
      console.error('[Server - CallTool] Error: request.params is missing or not an object');
      return {
        jsonrpc: '2.0',
        id: request?.id,
        error: { code: -32602, message: 'Invalid params: missing params object' },
      };
    }

    const toolName = request.params?.name;
    const toolArgsFromRpc = request.params?.arguments;

    if (toolName === UNIFIED_SOCRATA_TOOL.name) {
      try {
        console.log(`[Server - CallTool] Calling tool: ${toolName} with args:`, JSON.stringify(toolArgsFromRpc, null, 2));
        const parsedSocrataParams = socrataToolZodSchema.parse(toolArgsFromRpc);
        console.log(`[Server - CallTool] Parsed Socrata params:`, JSON.stringify(parsedSocrataParams, null, 2));

        if (!UNIFIED_SOCRATA_TOOL.handler) {
          throw new Error(`Handler not defined for tool: ${toolName}`);
        }

        const toolResult = await UNIFIED_SOCRATA_TOOL.handler(parsedSocrataParams);
        console.log(`[Server - CallTool] Tool ${toolName} executed. Original Result (type ${typeof toolResult}):`, JSON.stringify(toolResult, null, 2));

        let responseText;
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
            responseText = `Error: Could not convert tool result to a displayable string. Original type: ${typeof toolResult}. Stringify error: ${stringifyError instanceof Error ? stringifyError.message : String(stringifyError)}`;
          }
        }

        console.log(`[Server - CallTool] Sending result as text content.`);
        return {
          content: [{ type: 'text', text: responseText }],
          isError: false
        };

      } catch (error) {
        console.error(`[Server - CallTool] Error executing tool ${toolName}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        let errorCode = -32000; // Generic server error
        if (error instanceof z.ZodError) {
          errorCode = -32602; // Invalid params
          console.error('[Server - CallTool] ZodError issues:', JSON.stringify(error.issues, null, 2));
        }

        // Construct the JSON-RPC error response (this is the 'error' object part)
        // The Server class will wrap this into the full JSON-RPC error structure.
        // However, setRequestHandler expects to return the *result* part or throw to indicate an error.
        // Let's throw an error that the Server class can then format into a proper JSON-RPC error.
        // Re-throwing the original error might be best if it contains useful info.
        // Or, craft a specific error structure if Server expects that.

        // For now, re-throw. The SDK examples for low-level server show throwing errors.
        throw error; // The Server class should catch this and formulate a JSON-RPC error.
      }
    } else {
      console.warn(`[Server - CallTool] Unknown tool called: ${toolName}`);
      // Throw an error for unknown tool, Server should format it.
      throw new Error(`Method not found: ${toolName}`);
    }
  });

  console.log('[Server Factory] Low-level Server instance created and request handlers (ListTools, CallTool) registered.');
  return baseServer;
}

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

async function startApp() {
  let mainTransportInstance: any = undefined;
  let lowLevelServer: any = undefined;
  const sseTransports: any = {};

  try {
    const app = express();

    /* ── 1.  CORS comes first ─────────────────────────────── */
    app.use(cors({
      origin: true,
      credentials: true,
      exposedHeaders: ['mcp-session-id']
    }));

    const mcpPath = '/mcp';
    const ssePath = '/mcp-sse';
    const port = Number(process.env.PORT) || 8000;
    
    // Health check
    app.get('/healthz', (_req, res) => {
      console.log('[MCP Health] /healthz endpoint hit - v2');
      res.sendStatus(200);
    });

    // --- Create Transport FIRST --- 
    console.log('[MCP Setup] Creating main transport instance...');
    try {
      mainTransportInstance = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => {
          const sessionId = 'session-' + Math.random().toString(36).slice(2);
          console.log('[Transport] Generated session ID:', sessionId);
          return sessionId;
        },
        onsessioninitialized: (sessionId: string) => {
          console.log('[Transport] Session initialized:', sessionId);
        }
      } as any);
      
      console.log('[MCP Setup] Transport created successfully');
      console.log('[MCP Setup] Transport type:', typeof mainTransportInstance);
      console.log('[MCP Setup] Transport handleRequest exists:', typeof mainTransportInstance?.handleRequest);
    } catch (err) {
      console.error('[MCP Setup] Error creating transport:', err);
      throw err;
    }

    // Assign onmessage handler for debugging
    if (mainTransportInstance.onmessage) {
      mainTransportInstance.onmessage = (message: any, extra: any) => {
        console.log('[MCP Transport - onmessage] Received message:', JSON.stringify(message, null, 2));
        if (extra) {
          console.log('[MCP Transport - onmessage] Extra info:', JSON.stringify(extra, null, 2));
        }
      };
    }

    if (mainTransportInstance.onerror) {
      mainTransportInstance.onerror = (error: any) => {
        console.error('[MCP Transport - onerror] Transport-level error:', error);
      };
    }

    if (mainTransportInstance.onclose) {
      mainTransportInstance.onclose = () => {
        console.log('[MCP Transport - onclose] Transport connection closed');
      };
    }

    // --- Create Server Instance --- 
    console.log('[MCP Setup] Creating single Server instance (low-level)...');
    lowLevelServer = await createLowLevelServerInstance();

    // --- Connect Server to Transport --- 
    console.log('[MCP Setup] Connecting single Server (low-level) to main transport...');
    await lowLevelServer.connect(mainTransportInstance);
    console.log('[MCP Setup] Server connected ✅');

    // Accept-header shim
    app.use(mcpPath, (req, _res, next) => {
      const h = req.headers.accept ?? '';
      if (!h.includes('text/event-stream')) {
        req.headers.accept = h ? `${h}, text/event-stream` : 'text/event-stream';
      }
      next();
    });

    // Main MCP route with enhanced debugging
    app.all(mcpPath, async (req, res) => {
      console.log(`[Express /mcp ENTRY] Method: ${req.method}, URL: ${req.originalUrl}, Origin: ${req.headers.origin}`);
      console.log(`[Express /mcp ${req.method}] route hit. Headers:`, JSON.stringify(req.headers, null, 2));
      
      // Log body for POST requests
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          console.log('[Express /mcp POST] Raw body:', body);
        });
      }

      if (!mainTransportInstance) {
        console.error('[Express Route /mcp] Main transport not initialized!');
        if (!res.headersSent) res.status(503).send('MCP Service Unavailable');
        return;
      }

      try {
        console.log('[Express /mcp] About to call handleRequest...');
        console.log('[Express /mcp] Transport instance:', typeof mainTransportInstance);
        console.log('[Express /mcp] handleRequest method exists:', typeof mainTransportInstance.handleRequest);
        
        const result = await mainTransportInstance.handleRequest(req, res);
        
        console.log('[Express /mcp] handleRequest returned:', result);
        console.log('[Express /mcp] Response headers sent:', res.headersSent);
      } catch (err: any) {
        console.error('[Express /mcp] Error in handleRequest:', err);
        console.error('[Express /mcp] Error name:', err?.name);
        console.error('[Express /mcp] Error message:', err?.message);
        console.error('[Express /mcp] Error stack:', err?.stack);
        
        if (!res.headersSent) {
          res.status(500).json({ 
            error: err?.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
          });
        }
      }
    });

    // Legacy SSE endpoint
    app.all(ssePath, express.json(), (req, res) => {
      console.log(`[Express /mcp-sse ENTRY] Method: ${req.method}, URL: ${req.originalUrl}`);
      
      if (req.method === 'GET') {
        const transport = new SSEServerTransport(ssePath, res as any);
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
      
      if (lowLevelServer && typeof lowLevelServer.close === 'function') {
        console.log('Closing Server...');
        await lowLevelServer.close().catch((e: any) => console.error('Error closing server:', e));
      }

      if (mainTransportInstance && typeof mainTransportInstance.stop === 'function') {
        console.log('Closing main transport...');
        await mainTransportInstance.stop().catch((e: any) => console.error('Error closing transport:', e));
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
    
    if (mainTransportInstance && typeof mainTransportInstance.stop === 'function') {
      await mainTransportInstance.stop().catch((e: any) => console.error('Error closing transport during fatal startup error:', e));
    }
    process.exit(1);
  }
}

startApp().catch(async (err) => {
  console.error('[Fatal] Uncaught error during startup process wrapper:', err);
  process.exit(1);
});
