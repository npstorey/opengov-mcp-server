#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import type { Request, Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import dotenv from 'dotenv';
import cors from 'cors';
import { UNIFIED_SOCRATA_TOOL, handleSocrataTool } from './tools/socrata-tools.js';
import crypto from 'crypto';

dotenv.config();

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
    UNIFIED_SOCRATA_TOOL.description,
    UNIFIED_SOCRATA_TOOL.inputSchema as any,
    async (params: any, context: any) => {
      console.log(
        `[MCP Server - ${UNIFIED_SOCRATA_TOOL.name}] tool called with params:`,
        params
      );
      try {
        const result = await handleSocrataTool(params);
        return { content: [{ type: 'json', json: result }], isError: false };
      } catch (error: any) {
        console.error(`[MCP Server - ${UNIFIED_SOCRATA_TOOL.name}] Error:`, error);
        return {
          content: [{ type: 'text', text: `Error in ${UNIFIED_SOCRATA_TOOL.name}: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
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
    
    // --- Middleware Setup ---
    app.use(cors()); // Enable CORS for all origins and default settings
    app.use(express.json());

    const port = Number(process.env.PORT) || 8000;
    const mcpPath = '/mcp';

    // --- Create Single Transport Instance --- 
    console.log('[MCP Setup] Creating main StreamableHTTPServerTransport instance...');
    mainTransportInstance = new StreamableHTTPServerTransport({
      sessionIdGenerator: generateSessionId,
      onsessioninitialized: (sessionId: string) => {
        // This callback is primarily for the transport to signal session activity.
        // We no longer create McpServer instances here.
        // The single McpServer will handle all sessions through the connected transport.
        console.log(`[MCP Transport - onsessioninitialized] Session activity detected/initialized: ${sessionId}`);
      },
    });

    // --- Create Single McpServer Instance --- 
    console.log('[MCP Setup] Creating single McpServer instance...');
    singleMcpServer = await createMcpServerInstance();

    // --- Connect McpServer to Transport (ONCE) --- 
    console.log('[MCP Setup] Connecting single McpServer to main transport...');
    // This is where McpServer internally sets up its listeners on the transport (e.g., transport.onmessage)
    // to handle messages for all relevant sessions it's aware of.
    await singleMcpServer.connect(mainTransportInstance);
    console.log('[MCP Setup] Single McpServer connected to main transport.');
    
    // We do NOT set mainTransportInstance.onmessage here.
    // We rely on singleMcpServer.connect() to have configured the transport appropriately.

    // Set general transport error/close handlers if needed for logging or global cleanup
    mainTransportInstance.onerror = (error: Error) => {
        console.error('[MCP Transport - onerror] Transport-level error:', error);
    };
    mainTransportInstance.onclose = () => {
        console.log('[MCP Transport - onclose] Main transport connection closed/terminated by transport itself.');
    };

    // Start the transport (may be a no-op for streamableHttp, but good practice)
    // Removed explicit mainTransportInstance.start() call here as McpServer.connect() handles it.

    // --- Express Route --- 
    app.all(mcpPath, async (req: Request, res: Response) => {
      console.log(`[Express Route - ${req.method} ${mcpPath}] Forwarding request to main MCP transport.`);
      if (!mainTransportInstance) {
          console.error('[Express Route] Main transport not initialized! This should not happen.');
          if (!res.headersSent) res.status(503).send('MCP Service Unavailable');
          return;
      }
      try {
        await mainTransportInstance.handleRequest(
          req as IncomingMessage & { auth?: any }, 
          res as ServerResponse, 
          req.body
        );
      } catch (error) {
        console.error(`[Express Route - ${mcpPath}] Error during transport.handleRequest:`, error);
        if (!res.headersSent) {
          res.status(500).send('Internal Server Error while handling MCP request.');
        }
      }
    });

    app.get('/', (req: Request, res: Response) => {
      res.status(200).send('OpenGov MCP Server is running. MCP endpoint at /mcp.');
    });

    const httpServer = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 MCP server (Single McpServer + Single Transport) listening on port ${port}. MCP endpoint at ${mcpPath}`);
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
