#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import type { Request, Response } from 'express'; // Import Express types for better type safety

async function createMcpServerInstance(): Promise<McpServer> {
  console.log(
    '[MCP Server Factory] Creating new McpServer instance (NO TOOLS REGISTERED TEST)'
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

  const serverWithErrorHandler = serverInstance as unknown as {
    onError?: (error: Error) => void;
  };
  if (typeof serverWithErrorHandler.onError === 'function') {
    serverWithErrorHandler.onError((error: Error) => {
      console.error('[MCP Server Global Error]', error);
    });
  }

  // NO mcpServer.tool(...) CALL HERE
  console.log(
    '[MCP Server Factory] McpServer instance created with no tools explicitly registered.'
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
        console.log(`[MCP Server] SSE connection closed for session ${sessionId}`);
        delete transports[sessionId];
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

      const transport = transports[sessionId];
      if (!transport) {
        res.status(404).send('Invalid sessionId');
        return;
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
