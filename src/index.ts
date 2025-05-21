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
import { z } from 'zod';

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
    { capabilities: { tools: {} } } as any
  );

  serverInstance.tool(
    UNIFIED_SOCRATA_TOOL.name,
    socrataToolZodSchema, // This is our P extends ZodTypeAny
    async (parsedToolParams: SocrataToolParams, sdkContext?: McpToolHandlerContext) => {
      // According to SDK examples, parsedToolParams should be z.infer<typeof socrataToolZodSchema>
      console.log(
        `[MCP SDK Handler - V5 - STRICT PARAMS] Received first argument (parsedToolParams):`,
        JSON.stringify(parsedToolParams, null, 2)
      );

      if (sdkContext) {
        console.log(
          `[MCP SDK Handler - V5 - STRICT PARAMS] Received second argument (sdkContext). Session ID: ${sdkContext.sessionId}. Context Keys:`,
          Object.keys(sdkContext)
        );
      } else {
        console.log('[MCP SDK Handler - V5 - STRICT PARAMS] Second argument (sdkContext) is undefined or null.');
      }

      try {
        // We now directly use parsedToolParams, assuming the SDK has done its job.
        // No more manual searching in callEnvelope.
        console.log(
          `[MCP SDK Handler - V5 - STRICT PARAMS] Attempting to use parsedToolParams for tool execution.`
        );

        if (UNIFIED_SOCRATA_TOOL.handler) {
          const result = await UNIFIED_SOCRATA_TOOL.handler(parsedToolParams);
          console.log(
            `[MCP SDK Handler - V5 - SUCCESS] Tool executed successfully. Result:`,
            JSON.stringify(result, null, 2)
          );
          return { content: [{ type: 'json', json: result }], isError: false };
        } else {
          throw new Error ('Tool handler not defined for UNIFIED_SOCRATA_TOOL');
        }
      } catch (error: unknown) {
        console.error(`[MCP SDK Handler - V5 - ERROR] Failed to execute tool ${UNIFIED_SOCRATA_TOOL.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        // If it's a ZodError, it means the SDK didn't pass the correctly parsed params as the first argument.
        if (error instanceof z.ZodError) {
          console.error('[MCP SDK Handler - V5 - ZodError Details] Issues:', JSON.stringify(error.issues, null, 2));
          // Log what was actually received as parsedToolParams if it caused a ZodError (which shouldn't happen if SDK worked as expected)
          console.error('[MCP SDK Handler - V5 - ZodError Value] Received as parsedToolParams:', JSON.stringify(parsedToolParams, null, 2));
        }
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

    // Middleware to log raw body for /mcp POST requests
    app.use(mcpPath, (req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'POST') {
        // express.json() might have already consumed the body if it was placed before this.
        // For raw body, ensure no body parser has run yet for this path or use a library like raw-body.
        // However, since StreamableHTTPServerTransport expects to handle the raw request and parse body, 
        // we might not have `req.body` here yet if express.json() is not used globally for /mcp.
        // Let's assume req.body might be populated by a body parser if one runs before transport.handleRequest
        // or let's try to capture chunks if no body parser has run.
        
        // If express.json() is NOT used before this for /mcp path, we can try to log chunks.
        // If it IS used, req.body should be populated.
        // Our setup currently does NOT use express.json() before the /mcp route handler.

        let rawData = '';
        req.on('data', (chunk) => {
          rawData += chunk;
        });
        req.on('end', () => {
          console.log(`[Express /mcp POST] Raw request body received: ${rawData}`);
          // IMPORTANT: Re-assigning req.body here might be problematic if the stream is already consumed.
          // This is for logging only. The transport will handle the stream again.
          // To avoid consuming the stream, this approach is tricky. 
          // A better way might be to use a middleware that buffers and re-streams, or use a specific body-parser for logging.

          // For simplicity in this debugging step, let's assume the transport can re-handle if we log and pass through.
          // This might break things but is for one-time inspection.
        });
      }
      next();
    });

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

    // Assign onmessage handler directly to the instance for inspection
    mainTransportInstance.onmessage = (message: any, extra?: { authInfo?: any; sessionId?: string }) => {
      console.log('[MCP Transport - onmessage V2] Received message:', JSON.stringify(message, null, 2));
      if (extra) {
        console.log('[MCP Transport - onmessage V2] Extra info:', JSON.stringify(extra, null, 2));
      }
      // This is for inspection only. The McpServer has its own listeners.
    };

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
      // The raw body logger middleware above should have logged POST bodies.
      console.log(`[Express /mcp ${req.method}] route hit. Headers:`, JSON.stringify(req.headers, null, 2));
      if (req.method === 'POST' && req.body) {
          console.log('[Express /mcp POST] Parsed req.body (if any body-parser ran):', JSON.stringify(req.body, null, 2));
      }

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
