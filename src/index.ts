#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import dotenv from 'dotenv';
import cors from 'cors';
import {
  UNIFIED_SOCRATA_TOOL,
  socrataToolZodSchema,
  type SocrataToolParams,
} from './tools/socrata-tools.js';
import crypto from 'crypto';

dotenv.config();

// McpToolHandlerContext is now globally defined in src/global.d.ts
// SocrataToolParams is imported from socrata-tools.js

// Simplified: creates and configures an McpServer instance, does NOT connect it.
async function createMcpServerInstance(): Promise<McpServer> {
  console.log(
    '[MCP Server Factory] Creating McpServer instance, registering UNIFIED_SOCRATA_TOOL.'
  );
  const serverInstance = new McpServer(
    { name: 'opengov-mcp-server', version: '0.1.1' },
    { capabilities: { tools: {} } } as any // Cast options if ServerOptions shim is not complete
  );

  // Register the tool with the McpServer.
  // The SDK will use `socrataToolZodSchema` to parse and validate incoming parameters.
  // The handler will receive the parsed parameters as its first argument.
  serverInstance.tool(
    UNIFIED_SOCRATA_TOOL.name,
    socrataToolZodSchema, // Provide the Zod schema itself to the SDK
    async (rawRequestPayload: SocrataToolParams, context: McpToolHandlerContext) => { // Uses global McpToolHandlerContext
      console.log(
        `[MCP SDK Handler] RAW first argument (rawRequestPayload) received from SDK:`,
        JSON.stringify(rawRequestPayload, null, 2)
      );
      console.log(`[MCP SDK Handler] Context session ID: ${context.sessionId}`);

      let toolArguments: Record<string, unknown> | undefined = undefined;

      // Attempt to locate the actual tool arguments
      // Based on common patterns, they might be in rawRequestPayload.arguments or rawRequestPayload.params
      // Or rawRequestPayload itself might be the arguments if the client sends them flat.
      if (rawRequestPayload && typeof rawRequestPayload === 'object') {
        if ('arguments' in rawRequestPayload && typeof rawRequestPayload.arguments === 'object' && rawRequestPayload.arguments !== null) {
          console.log('[MCP SDK Handler] Found "arguments" field in rawRequestPayload. Assuming these are the tool arguments.');
          toolArguments = rawRequestPayload.arguments as Record<string, unknown>;
        } else if ('params' in rawRequestPayload && typeof rawRequestPayload.params === 'object' && rawRequestPayload.params !== null) {
          // This was the previous Zod error case: the schema expected 'type' and 'query' at top level
          // If rawRequestPayload.params contains 'type' and 'query', this could be it.
          console.log('[MCP SDK Handler] Found "params" field in rawRequestPayload. Inspecting as potential tool arguments.');
          toolArguments = rawRequestPayload.params as Record<string, unknown>;
        } else if ('type' in rawRequestPayload && 'query' in rawRequestPayload) {
          // If 'type' and 'query' are directly in rawRequestPayload, then it might be the arguments directly
          console.log('[MCP SDK Handler] Found "type" and "query" directly in rawRequestPayload. Assuming rawRequestPayload ARE the tool arguments.');
          toolArguments = rawRequestPayload as unknown as Record<string, unknown>; // Cast needed due to SocrataToolParams type
        } else {
          console.log('[MCP SDK Handler] Tool arguments not found in .arguments, .params, or directly in rawRequestPayload. Logging keys for inspection:');
          console.log(Object.keys(rawRequestPayload));
          // Default to trying rawRequestPayload, which will likely fail Zod parsing but show the error.
          toolArguments = rawRequestPayload as unknown as Record<string, unknown>;
        }
      } else {
         console.log('[MCP SDK Handler] rawRequestPayload is not an object or is null. Cannot extract arguments.');
         // This will definitely fail parsing and error out, which is informative.
         toolArguments = rawRequestPayload as unknown as Record<string, unknown>;
      }

      if (toolArguments === undefined) {
        console.error('[MCP SDK Handler] Critical: toolArguments resolved to undefined. This should not happen.');
        // Return an error, as we can't proceed.
        return { 
          content: [{ type: 'text', text: 'Error: Could not determine tool arguments from request.' }], 
          isError: true 
        };
      }
      
      console.log('[MCP SDK Handler] Attempting to parse:', JSON.stringify(toolArguments, null, 2));

      try {
        // Now, parse the located toolArguments using the Zod schema
        const parsedToolSpecificParams = socrataToolZodSchema.parse(toolArguments);
        console.log(
          `[MCP SDK Handler] Successfully parsed tool-specific parameters:`,
          JSON.stringify(parsedToolSpecificParams, null, 2)
        );

        if (UNIFIED_SOCRATA_TOOL.handler) {
          const result = await UNIFIED_SOCRATA_TOOL.handler(parsedToolSpecificParams); // Pass the truly parsed params
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
