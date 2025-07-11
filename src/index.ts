#!/usr/bin/env node

// Low-level MCP server & transports
import { Server } from '@modelcontextprotocol/sdk/dist/esm/server/index.js';
import {
  StreamableHTTPServerTransport,
  type Transport,
} from '@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/dist/esm/server/sse.js';

// Types
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/dist/esm/types.js';

// Local modules
import { currentTransport } from './mcp/transport/streamableHttp.js';
import {
  UNIFIED_SOCRATA_TOOL,
  socrataToolZodSchema,
  type SocrataToolParams,
} from './tools/socrata-tools.js';

// Node / third-party
import express, { type Request, type Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import { z } from 'zod';

dotenv.config();

/* ────────── factory for the low-level server ────────── */
async function createLowLevelServerInstance(): Promise<Server> {
  console.log('[Server Factory] Creating low-level Server instance.');

  const baseServer = new Server(
    { name: 'opengov-mcp-server', version: '0.1.1' },
    {
      capabilities: {
        tools: {},
        prompts: {},
        roots: { listChanged: true },
        sampling: {},
      },
      authMethods: [],
    },
  );

  /* ListTools handler */
  baseServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: UNIFIED_SOCRATA_TOOL.name,
          description: UNIFIED_SOCRATA_TOOL.description,
          parameters: UNIFIED_SOCRATA_TOOL.parameters,
        },
      ],
    };
  });

  /* CallTool handler */
  baseServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: toolArgs } = request.params ?? {};
    if (toolName !== UNIFIED_SOCRATA_TOOL.name) {
      throw new Error(`Method not found: ${toolName}`);
    }

    const parsed = socrataToolZodSchema.parse(toolArgs);
    const result = await UNIFIED_SOCRATA_TOOL.handler!(parsed);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: false,
    };
  });

  console.log('[Server Factory] Low-level Server ready.');
  return baseServer;
}

/* ────────── helpers ────────── */
function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/* ────────── main ────────── */
async function startApp() {
  let mainTransportInstance: Transport | undefined;
  let lowLevelServer: Server | undefined;
  const sseTransports: Record<string, SSEServerTransport> = {};

  try {
    const app = express();
    app.use(cors({ origin: true, credentials: true, exposedHeaders: ['mcp-session-id'] }));

    const mcpPath = '/mcp';
    const ssePath = '/mcp-sse';
    const port = Number(process.env.PORT) || 8000;

    /* health check */
    app.get('/healthz', (_, res) => res.sendStatus(200));

    /* main transport */
    console.log('[MCP Setup] Creating main transport instance…');
    mainTransportInstance = currentTransport as StreamableHTTPServerTransport;

    /* low-level server */
    console.log('[MCP Setup] Creating low-level Server…');
    lowLevelServer = await createLowLevelServerInstance();
    await lowLevelServer.connect(mainTransportInstance as any);
    console.log('[MCP Setup] Server connected ✅');

    /* Accept-header shim */
    app.use(mcpPath, (req, _res, next) => {
      const h = req.headers.accept ?? '';
      if (!h.includes('text/event-stream')) {
        req.headers.accept = h ? `${h}, text/event-stream` : 'text/event-stream';
      }
      next();
    });

    /* /mcp handler */
    app.all(mcpPath, (req: Request, res: Response) => {
      if (!mainTransportInstance) return res.status(503).end();
      (mainTransportInstance as any)
        .handleRequest(req as IncomingMessage, res as ServerResponse)
        .catch((e: Error) => {
          console.error('[transport]', e);
          if (!res.headersSent) res.status(500).end();
        });
    });

    /* legacy SSE endpoint */
    app.all(ssePath, (req: Request, res: Response) => {
      if (req.method === 'GET') {
        const transport = new SSEServerTransport(ssePath, res as ServerResponse);
        sseTransports[transport.sessionId] = transport;
        transport.onclose = () => delete sseTransports[transport.sessionId];
        (lowLevelServer as any).connect(transport as any).catch(console.error);
      } else if (req.method === 'POST') {
        const t = sseTransports[req.query.sessionId as string];
        if (!t) return res.status(400).send('No transport for sessionId');
        (t as any).handlePostMessage(req as any, res as ServerResponse, req.body).catch(console.error);
      } else {
        res.status(405).end();
      }
    });

    /* root route */
    app.get('/', (_, res) => res.send('OpenGov MCP Server running.'));

    /* start HTTP server */
    const httpServer = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 listening on ${port} — MCP at ${mcpPath}`);
    });

    /* graceful shutdown */
    const shutdown = () => {
      console.log('Shutting down…');
      httpServer.close(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[Fatal] startup error:', err);
    process.exit(1);
  }
}

startApp().catch((err) => {
  console.error('[Fatal] uncaught:', err);
  process.exit(1);
});
