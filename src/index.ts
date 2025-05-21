#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import dotenv from 'dotenv';
import cors from 'cors';
import { UNIFIED_SOCRATA_TOOL, zParametersForValidation, handleSocrataTool } from './tools/socrata-tools.js';
import crypto from 'crypto';
import { z } from 'zod';

dotenv.config();

// Define context type based on global.d.ts for clarity
type McpToolHandlerContext = { sendNotification(method: string, params?: Record<string, unknown>): Promise<void> };
// Infer params type from the Zod schema
type SocrataToolParams = z.infer<typeof zParametersForValidation>;

// Simplified: creates and configures an McpServer instance, does NOT connect it.
async function createMcpServerInstance(): Promise<McpServer> {
  console.log(
    '[MCP Server Factory] Creating McpServer instance, registering UNIFIED_SOCRATA_TOOL.'
  );
  const serverInstance = new McpServer(
    { name: 'opengov-mcp-server', version: '0.1.1' },
    { capabilities: { tools: {} } } as any // Cast options if ServerOptions shim is not complete
  );

  serverInstance.tool(
    UNIFIED_SOCRATA_TOOL.name,
    UNIFIED_SOCRATA_TOOL.parameters as unknown as z.ZodTypeAny,
    async (sdkProvidedParams: any, sdkProvidedContext: any) => {
      console.log(
        `[MCP SDK Handler] First arg (sdkProvidedParams):`,
        JSON.stringify(sdkProvidedParams, null, 2)
      );
      console.log(
        `[MCP SDK Handler] Second arg (sdkProvidedContext):`,
        JSON.stringify(sdkProvidedContext, null, 2)
      );

      // Attempt to find the actual tool arguments from the client
      // Common places: directly in sdkProvidedParams, or sdkProvidedParams.arguments, or sdkProvidedParams.params
      let toolArguments: Record<string, unknown> | undefined = undefined;
      if (sdkProvidedParams && typeof sdkProvidedParams === 'object') {
        if ('arguments' in sdkProvidedParams && typeof sdkProvidedParams.arguments === 'object') {
          toolArguments = sdkProvidedParams.arguments as Record<string, unknown>;
          console.log('[MCP SDK Handler] Found client arguments in sdkProvidedParams.arguments');
        } else if (sdkProvidedParams.type && sdkProvidedParams.query) {
          // Fallback: Maybe the SDK *is* passing them at the top level of the first arg
          // and our previous logging of the complex object hid it.
          toolArguments = sdkProvidedParams as Record<string, unknown>; 
          console.log('[MCP SDK Handler] Assuming sdkProvidedParams ARE the tool arguments (type/query found).');
        } else {
          console.log('[MCP SDK Handler] Client arguments NOT found in expected places within the first SDK param.');
          // Default to passing the first sdk param, which is what handleSocrataTool currently expects/fails on
          toolArguments = sdkProvidedParams as Record<string, unknown>; 
        }
      } else {
        console.log('[MCP SDK Handler] First arg from SDK is not an object, passing as is.');
        toolArguments = sdkProvidedParams as Record<string, unknown>; 
      }

      try {
        if (UNIFIED_SOCRATA_TOOL.handler) {
          const result = await UNIFIED_SOCRATA_TOOL.handler(toolArguments || {});
          return { content: [{ type: 'json', json: result }], isError: false };
        } else {
          throw new Error ('Tool handler not defined for UNIFIED_SOCRATA_TOOL');
        }
      } catch (error: unknown) {
        console.error(`[MCP Server - ${UNIFIED_SOCRATA_TOOL.name}] Error:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error in ${UNIFIED_SOCRATA_TOOL.name}: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
  console.log('[DEBUG] Tool sent to client:', JSON.stringify(UNIFIED_SOCRATA_TOOL, null, 2));
  console.log('[MCP Server Factory] UNIFIED_SOCRATA_TOOL registered on instance.');
  
  // Error handling can be set on the internal server instance if needed, or McpServer itself if it exposes it.
  // const internalServer = serverInstance.server as unknown as { onError?: (cb: (error: Error) => void) => void; };
  // if (typeof internalServer.onError === 'function') {
  //   internalServer.onError((error: Error) => {
  //     console.error('[MCP Internal Server Global Error]', error);
  //   });
  // }
  return serverInstance;
}

function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

async function startApp() {
  let mainTransportInstance: StreamableHTTPServerTransport | undefined = undefined;
  let singleMcpServer: McpServer | undefined = undefined;

  try {
    const app = express();
    // app.use(express.json()); // Removed as per instructions, no other JSON routes need it before /mcp
    
    /* ── 1.  CORS comes first ─────────────────────────────── */
    app.use(cors({ 
      origin: true, 
      credentials: true, 
      exposedHeaders: ['mcp-session-id'] 
    }));
    app.options('/mcp', cors({ origin: true, credentials: true }));

    const port = Number(process.env.PORT) || 8000;
    const mcpPath = '/mcp';

    // Health check (remains)
    app.get('/healthz', (_req: Request, res: Response) => {
      console.log('[MCP Health] /healthz endpoint hit - v2');
      res.sendStatus(200);
    });

    // --- Create Single Transport Instance (remains the same) --- 
    console.log('[MCP Setup] Creating main StreamableHTTPServerTransport instance...');
    mainTransportInstance = new StreamableHTTPServerTransport({
      sessionIdGenerator: generateSessionId,
      onsessioninitialized: (sessionId: string) => {
        console.log('[MCP Transport] Session initialized:', sessionId);
      },
    });

    // --- Create Single McpServer Instance (remains the same) --- 
    console.log('[MCP Setup] Creating single McpServer instance...');
    singleMcpServer = await createMcpServerInstance();

    // --- Connect McpServer to Transport (ONCE - remains the same) --- 
    console.log('[MCP Setup] Connecting single McpServer to main transport...');
    await singleMcpServer.connect(mainTransportInstance);
    console.log('[MCP Setup] Single McpServer connected to main transport.');
    
    mainTransportInstance.onerror = (error: Error) => {
        console.error('[MCP Transport - onerror] Transport-level error:', error);
    };
    mainTransportInstance.onclose = () => {
        console.log('[MCP Transport - onclose] Main transport connection closed/terminated by transport itself.');
    };

    /* ── 2.  NO express.json() before /mcp!  ───────────────── */
    app.all(mcpPath, (req: Request, res: Response) => {
      if (!mainTransportInstance) { // Keep this safety check
          console.error('[Express Route /mcp] Main transport not initialized! This should not happen.');
          if (!res.headersSent) res.status(503).send('MCP Service Unavailable');
          return;
      }
      mainTransportInstance.handleRequest(
        req as IncomingMessage & { auth?: Record<string, unknown> | undefined }, 
        res as ServerResponse
      ).catch(err => {
        console.error('[transport]', err);
        if (!res.headersSent) res.status(500).end();
      });
    });

    /* ── 3.  Body-parser for everything ELSE ───────────────── */
    // app.use(express.json()); // Not needed as no other routes require it

    app.get('/', (req: Request, res: Response) => {
      res.status(200).send('OpenGov MCP Server is running. MCP endpoint at /mcp.');
    });

    const httpServer = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 MCP server (Single McpServer + Single Transport) listening on port ${port}. MCP endpoint at ${mcpPath}, Health at /healthz`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} signal received: closing resources.`);
      if (singleMcpServer) {
        console.log('Closing McpServer...');
        await singleMcpServer.close().catch(e => console.error('Error closing McpServer:', e));
      }
      if (mainTransportInstance) {
        console.log('Closing main transport...');
        await mainTransportInstance.close().catch(e => console.error('Error closing main transport:', e));
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
    if (singleMcpServer) {
      await singleMcpServer.close().catch(e => console.error('Error closing McpServer during fatal startup error:', e));
    }
    if (mainTransportInstance) {
      await mainTransportInstance.close().catch(e => console.error('Error closing main transport during fatal startup error:', e));
    }
    process.exit(1);
  }
}

startApp().catch(async (err) => { 
  console.error('[Fatal] Uncaught error during startup process wrapper:', err);
  process.exit(1);
});
