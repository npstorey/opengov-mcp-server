#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import type { Request, Response } from 'express'; // Import Express types for better type safety
import { z } from 'zod';

async function createMcpServerInstance(): Promise<McpServer> {
  console.log(
    '[MCP Server Factory] Creating new McpServer instance and registering simple_ping tool.'
  );

  const serverInstance = new McpServer(
    {
      name: 'opengov-mcp-server',
      version: '0.1.1',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register the simple_ping tool
  serverInstance.tool(
    'simple_ping',
    'A very simple ping tool to check if the server is responding to tool calls.',
    z.object({}).strict(),
    async (params: Record<string, never>, context: any) => {
      console.log(
        '[MCP Server - SimplePingTool] simple_ping tool called with params:',
        params
      );
      return {
        content: [{ type: 'text', text: 'pong' }],
        isError: false,
      };
    }
  );

  console.log('[MCP Server Factory] simple_ping tool successfully registered.');

  const serverWithErrorHandler = serverInstance as unknown as {
    onError?: (cb: (error: Error) => void) => void;
  };
  if (typeof serverWithErrorHandler.onError === 'function') {
    serverWithErrorHandler.onError((error: Error) => {
      console.error('[MCP Server Global Error]', error);
    });
  }

  console.log(
    '[MCP Server Factory] McpServer instance created, registering simple_ping tool.'
  );
  return serverInstance;
}

const transports: Record<string, SSEServerTransport> = {};

async function startApp() {
  try {
    const app = express();
    app.use(express.json());

    const port = Number(process.env.PORT) || 8000;
    const ssePath = '/mcp/sse';
    const messagesPath = '/mcp/messages';

    app.get(ssePath, async (req: Request, res: Response) => {
      console.log(`[MCP Server] GET ${ssePath}: SSE connection request from ${req.ip}`);

      const mcpServer = await createMcpServerInstance();
      const transport = new SSEServerTransport(messagesPath, res);
      const sessionId = transport.sessionId;

      transports[sessionId] = transport;

      try {
        await mcpServer.connect(transport);
        console.log(`[MCP Server] Connected transport session ${sessionId}`);
      } catch (connectError) {
        console.error('[MCP Server] Error connecting transport:', connectError);
        if (!res.headersSent) {
          res.status(500).send('Failed to establish MCP connection');
        }
        delete transports[sessionId];
        return;
      }

      req.on('close', () => {
        console.log(
          `[MCP Server - SSE Close] SSE connection closing for session ${sessionId}...`
        );
        console.log(
          `[MCP Server - SSE Close] Deleting transport for sessionId: ${sessionId}`
        );
        delete transports[sessionId];
        console.log(
          `[MCP Server - SSE Close] Transport for session ${sessionId} successfully deleted.`
        );
        console.log(
          `[MCP Server - SSE Close] Active transport keys after deletion: ${Object.keys(transports)}`
        );
        console.log(`[MCP Server] SSE connection closed for session ${sessionId}`);
      });
    });

    app.post(messagesPath, (req: Request, res: Response) => {
      console.log(`[MCP Server] POST ${messagesPath}: Received message.`);
      console.log('[MCP Server] Request Body for POST:', JSON.stringify(req.body, null, 2));

      const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
      if (!sessionId) {
        res.status(400).send('Missing sessionId');
        return;
      }

      console.log(
        `[MCP Server - POST Detail] Processing message for sessionId: ${sessionId}`
      );
      console.log(
        `[MCP Server - POST Detail] Currently active transport keys: ${Object.keys(transports)}`
      );

      const transport = transports[sessionId];
      if (!transport) {
        console.warn(
          `[MCP Server - POST Detail] Transport NOT FOUND for sessionId: ${sessionId}. Sending 404.`
        );
        res.status(404).send('Invalid sessionId');
        return;
      }

      console.log(`[MCP Server - POST Detail] Transport FOUND for sessionId: ${sessionId}`);

      const sseExpressRes = (transport as any).res as Response | undefined;
      if (sseExpressRes) {
        console.log(
          `[MCP Server - POST Detail] SSE res.writable: ${sseExpressRes.writable}`
        );
        console.log(`[MCP Server - POST Detail] SSE res.closed: ${sseExpressRes.closed}`);
        console.log(
          `[MCP Server - POST Detail] SSE res.headersSent: ${sseExpressRes.headersSent}`
        );
        console.log('[MCP Server - POST Detail] Transport and sseResponseObject seem valid for processing.');
      } else {
        console.warn(
          `[MCP Server - POST Detail] Could not access underlying SSE Express Response object on transport for session ${sessionId} to check its state.`
        );
      }

      res.on('finish', () => {
        console.log(
          `[MCP Server] Response for POST ${messagesPath} session ${sessionId} finished with status ${res.statusCode}`
        );
      });

      try {
        console.log(`[MCP Server] Calling activeTransport.handlePostMessage for session ${sessionId}`);
        transport.handlePostMessage(req, res, req.body);
        console.log(`[MCP Server] Returned from activeTransport.handlePostMessage for session ${sessionId}`);
      } catch (e) {
        console.error('[MCP Server] Error from transport.handlePostMessage:', e);
        if (!res.headersSent) {
          res.status(500).send('Error processing message');
        }
      }
    });
    
    app.get('/', (req: Request, res: Response) => {
      res.status(200).send('OpenGov MCP Server is running. MCP endpoint at /mcp/sse (GET for SSE) and /mcp/messages (POST for client messages).');
    });

    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 MCP server (using Express + SSE) listening on port ${port}. SSE at ${ssePath}, Messages at ${messagesPath}`);
    });

  } catch (err) {
    console.error('Fatal error starting Express app:', err);
    process.exit(1);
  }
}

/* -------------------------------------------------------------------------- */
/* Entrypoint                                                                 */
/* -------------------------------------------------------------------------- */
startApp().catch((err) => {
  console.error('[Fatal] Uncaught error during startup', err);
  process.exit(1);
});
