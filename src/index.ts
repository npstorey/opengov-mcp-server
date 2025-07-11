#!/usr/bin/env node

/* ─── SDK imports (from ESM bundle, WITH .js suffix) ──────────────── */
import { Server } from '@modelcontextprotocol/sdk/dist/esm/server/index.js';
import {
  StreamableHTTPServerTransport,
  type Transport,
} from '@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/dist/esm/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/dist/esm/types.js';

/* ─── Local + 3rd-party imports ─────────────────────────────────────── */
import { currentTransport } from './mcp/transport/streamableHttp.js';
import {
  UNIFIED_SOCRATA_TOOL,
  socrataToolZodSchema,
  type SocrataToolParams,
} from './tools/socrata-tools.js';
import express, { type Request, type Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { z } from 'zod';

dotenv.config();

/* ─── Helper to build the low-level MCP server ──────────────────────── */
async function createLowLevelServerInstance(): Promise<Server> {
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

  /* listTools */
  baseServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: UNIFIED_SOCRATA_TOOL.name,
        description: UNIFIED_SOCRATA_TOOL.description,
        parameters: UNIFIED_SOCRATA_TOOL.parameters,
      },
    ],
  }));

  /* callTool */
  baseServer.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params ?? {};
    if (name !== UNIFIED_SOCRATA_TOOL.name)
      throw new Error(`Method not found: ${name}`);

    const parsed = socrataToolZodSchema.parse(args);
    const result = await UNIFIED_SOCRATA_TOOL.handler!(parsed);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: false,
    };
  });

  return baseServer;
}

/* ─── Server bootstrap ─────────────────────────────────────────────── */
async function startApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true, exposedHeaders: ['mcp-session-id'] }));

  const mcpPath = '/mcp';
  const ssePath = '/mcp-sse';
  const port = Number(process.env.PORT) || 8000;

  /* health */
  app.get('/healthz', (_, res) => res.sendStatus(200));

  /* main transport & server */
  const mainTransportInstance = currentTransport as StreamableHTTPServerTransport;
  const server = await createLowLevelServerInstance();
  await server.connect(mainTransportInstance as any);
  console.log('[MCP] server connected ✅');

  /* accept-header shim */
  app.use(mcpPath, (req, _res, next) => {
    const h = req.headers.accept ?? '';
    if (!h.includes('text/event-stream')) {
      req.headers.accept = h ? `${h}, text/event-stream` : 'text/event-stream';
    }
    next();
  });

  /* /mcp route */
  app.all(mcpPath, (req: Request, res: Response) => {
    (mainTransportInstance as any)
      .handleRequest(req as IncomingMessage, res as ServerResponse)
      .catch((e: Error) => {
        console.error('[transport]', e);
        if (!res.headersSent) res.status(500).end();
      });
  });

  /* legacy SSE */
  const sseTransports: Record<string, SSEServerTransport> = {};
  app.all(ssePath, (req: Request, res: Response) => {
    if (req.method === 'GET') {
      const t = new SSEServerTransport(ssePath, res as ServerResponse);
      sseTransports[t.sessionId] = t;
      t.onclose = () => delete sseTransports[t.sessionId];
      server.connect(t as any).catch(console.error);
    } else if (req.method === 'POST') {
      const t = sseTransports[req.query.sessionId as string];
      if (!t) return res.status(400).send('No transport for sessionId');
      (t as any)
        .handlePostMessage(req as any, res as ServerResponse, req.body)
        .catch(console.error);
    } else {
      res.status(405).end();
    }
  });

  /* root */
  app.get('/', (_, res) => res.send('OpenGov MCP Server running.'));

  /* start HTTP */
  const httpServer = app.listen(port, '0.0.0.0', () =>
    console.log(`🚀 listening on ${port} (MCP @ ${mcpPath})`),
  );

  /* graceful shutdown */
  const shutdown = () => {
    console.log('Shutting down…');
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startApp().catch((e) => {
  console.error('[Fatal]', e);
  process.exit(1);
});
