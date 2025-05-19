#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import express from 'express';
import type { Request, Response } from 'express'; // Import Express types for better type safety

import {
  handleSocrataTool,
  UNIFIED_SOCRATA_TOOL, // Assuming this is the single tool object
} from './tools/socrata-tools.js';

async function createMcpServerInstance(): Promise<McpServer> {

  const server = new McpServer(
    { name: 'opengov-mcp-server', version: '0.1.1' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  // Optional global error handler if available
  if (typeof (server as any).onError === 'function') {
    (server as any).onError((error: Error) => {
      console.error('[MCP Server Global Error]', error);
    });
  }

  // Simplified tool registration for debugging tool enablement
  const simpleSchema = z
    .object({
      query: z.string().describe('A simple query string').optional(),
    })
    .strict();

  (server as any).tool(
    UNIFIED_SOCRATA_TOOL.name,
    'A simple test tool for Socrata data.',
    simpleSchema as any,
    async (args: any) => {
      console.log(
        `[McpServer Tool 'get_data'] Called with simplified schema. Args:`,
        args
      );
      try {
        const result = await handleSocrataTool(args);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (toolErr) {
        console.error(
          `[McpServer Tool 'get_data' with simplified schema] Error:`,
          toolErr
        );
        return {
          content: [
            {
              type: 'text',
              text: `Error with simplified tool: ${
                toolErr instanceof Error ? toolErr.message : String(toolErr)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  console.log('[MCP Server] Simplified tool registered');

  return server;
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
      const sessionId = (transport as any).sessionId as string;

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

      try {
        console.log(`[MCP Server] Handling message for session ${sessionId}`);
        transport.handlePostMessage(req, res, req.body);
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
