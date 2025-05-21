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
    { capabilities: { tools: {} } } as any // Cast options if ServerOptions shim is not complete
  );

  // Register the tool with the McpServer.
  // The SDK will use `socrataToolZodSchema` to parse and validate incoming parameters.
  // The handler will receive the parsed parameters as its first argument.
  serverInstance.tool(
    UNIFIED_SOCRATA_TOOL.name,
    socrataToolZodSchema,
    async (callEnvelope: any, sdkProvidedContext: McpToolHandlerContext | undefined) => {
      console.log(
        `[MCP SDK Handler - INSPECTION V4] RAW first argument (callEnvelope) received. Type: ${typeof callEnvelope}`
      );

      let toolArgumentsToParse: any;

      if (callEnvelope && typeof callEnvelope === 'object') {
        console.log('[MCP SDK Handler - INSPECTION V4] Keys of callEnvelope:', Object.keys(callEnvelope));
        console.log('[MCP SDK Handler - INSPECTION V4] Stringified callEnvelope:', JSON.stringify(callEnvelope, null, 2));

        // Hypothesis: callEnvelope might be the JSON-RPC request params object, 
        // or it might contain the tool's arguments directly if the SDK already processed the RPC structure.
        // The actual tool arguments provided by the client are usually in a field named 'arguments' or 'params' 
        // within the main 'params' of the JSON-RPC tools/call request.

        if (callEnvelope.arguments && typeof callEnvelope.arguments === 'object') {
          // This would match if callEnvelope is like: { name: "tool_name", arguments: { 실제 파라미터 } }
          // (which could be the `params` part of a JSON-RPC call)
          console.log('[MCP SDK Handler - INSPECTION V4] Found "arguments" field in callEnvelope. Assuming these are the tool parameters.');
          toolArgumentsToParse = callEnvelope.arguments;
        } else if (callEnvelope.params && typeof callEnvelope.params === 'object') {
          // This would match if callEnvelope is like { params: { 실제 파라미터 } } or even the full JSON-RPC request.
          // If it's the full JSON-RPC, then callEnvelope.params.arguments would be the target.
          console.log('[MCP SDK Handler - INSPECTION V4] Found "params" field in callEnvelope. Inspecting...');
          console.log('[MCP SDK Handler - INSPECTION V4] callEnvelope.params keys:', Object.keys(callEnvelope.params));
          console.log('[MCP SDK Handler - INSPECTION V4] Stringified callEnvelope.params:', JSON.stringify(callEnvelope.params, null, 2));
          if (callEnvelope.params.arguments && typeof callEnvelope.params.arguments === 'object') {
            console.log('[MCP SDK Handler - INSPECTION V4] Found "arguments" field in callEnvelope.params. Assuming these are the tool parameters.');
            toolArgumentsToParse = callEnvelope.params.arguments;
          } else {
            console.log('[MCP SDK Handler - INSPECTION V4] No "arguments" in callEnvelope.params. Trying callEnvelope.params directly.');
            toolArgumentsToParse = callEnvelope.params; 
          }
        } else if (socrataToolZodSchema.safeParse(callEnvelope).success){
          // If callEnvelope itself matches the socrataToolZodSchema (as per SDK examples)
          console.log('[MCP SDK Handler - INSPECTION V4] callEnvelope directly matches socrataToolZodSchema.');
          toolArgumentsToParse = callEnvelope;
        } else {
          console.log('[MCP SDK Handler - INSPECTION V4] Tool arguments not found in callEnvelope.arguments or callEnvelope.params. Defaulting to callEnvelope itself for parsing attempt.');
          toolArgumentsToParse = callEnvelope; // Last resort, will likely fail if not the params
        }
      } else {
        console.log('[MCP SDK Handler - INSPECTION V4] callEnvelope is not an object or is null.');
        toolArgumentsToParse = callEnvelope; // Will fail parsing
      }
      
      // Log what we are about to parse
      console.log('[MCP SDK Handler - INSPECTION V4] Attempting to parse with socrataToolZodSchema:', JSON.stringify(toolArgumentsToParse, null, 2));

      // Log the sdkProvidedContext status
      if (sdkProvidedContext) {
        console.log(
          `[MCP SDK Handler - INSPECTION V4] SDK-provided second argument (sdkProvidedContext) is PRESENT. Session ID: ${sdkProvidedContext.sessionId}. Context Keys:`,
          Object.keys(sdkProvidedContext)
        );
      } else {
        console.log('[MCP SDK Handler - INSPECTION V4] SDK-provided second argument (sdkProvidedContext) is undefined or null.');
      }

      // Actual tool logic - RESTORED
      try {
        const parsedParams = socrataToolZodSchema.parse(toolArgumentsToParse);
        console.log(
          `[MCP SDK Handler - SUCCESS] Successfully parsed tool-specific parameters:`,
          JSON.stringify(parsedParams, null, 2)
        );

        // Access sessionId and sendNotification from the callEnvelope if needed
        const sessionId = callEnvelope && callEnvelope.sessionId ? callEnvelope.sessionId : 'unknown-session';
        const notify = callEnvelope && typeof callEnvelope.sendNotification === 'function' 
                         ? callEnvelope.sendNotification 
                         : (method: string, params?: any) => console.warn('[MCP SDK Handler] sendNotification not available on callEnvelope');
        
        // Example of using them (though handleSocrataTool doesn't currently accept them)
        // notify('toolProgress', { sessionId, progress: 0.5 }); 

        if (UNIFIED_SOCRATA_TOOL.handler) {
          const result = await UNIFIED_SOCRATA_TOOL.handler(parsedParams);
          return { content: [{ type: 'json', json: result }], isError: false };
        } else {
          throw new Error('Tool handler not defined for UNIFIED_SOCRATA_TOOL');
        }
      } catch (error: unknown) {
        console.error(`[MCP SDK Handler - ERROR] Failed to parse or execute tool ${UNIFIED_SOCRATA_TOOL.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Log the object that failed parsing if it was a ZodError
        if (error instanceof z.ZodError) {
          console.error('[MCP SDK Handler - ZodError Details] Issues:', JSON.stringify(error.issues, null, 2));
          console.error('[MCP SDK Handler - ZodError Value] Tried to parse:', JSON.stringify(toolArgumentsToParse, null, 2));
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
