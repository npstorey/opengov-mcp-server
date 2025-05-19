#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import express from 'express';
import type { Request, Response } from 'express'; // Import Express types for better type safety

import {
  handleSocrataTool,
  UNIFIED_SOCRATA_TOOL,
} from './tools/socrata-tools.js';
import { getPortalInfo } from './utils/portal-info.js';

const unifiedSocrataSchema = z.object({
  type: z.enum([
    'catalog',
    'categories',
    'tags',
    'dataset-metadata',
    'column-info',
    'data-access',
    'site-metrics',
  ]).describe(
    'The type of operation to perform:\n- catalog: List datasets with optional search\n- categories: List all dataset categories\n- tags: List all dataset tags\n- dataset-metadata: Get detailed metadata for a specific dataset\n- column-info: Get column details for a specific dataset\n- data-access: Access records from a dataset (with query support)\n- site-metrics: Get portal-wide statistics'
  ),
  domain: z
    .string()
    .describe('Optional domain (hostname only, without protocol). Used with all operation types.')
    .optional(),
  query: z
    .string()
    .describe(
      'Search or query string with different uses depending on operation type:\n- For type=catalog: Search query to filter datasets\n- For type=data-access: SoQL query string for complex data filtering'
    )
    .optional(),
  datasetId: z
    .string()
    .describe(
      'Dataset identifier required for the following operations:\n- For type=dataset-metadata: Get dataset details\n- For type=column-info: Get column information\n- For type=data-access: Specify which dataset to query (e.g., 6zsd-86xi)'
    )
    .optional(),
  soqlQuery: z
    .string()
    .describe(
      'For type=data-access only. Optional SoQL query string for filtering data.\nThis is an alias for the query parameter and takes precedence if both are provided.'
    )
    .optional(),
  select: z
    .string()
    .describe('For type=data-access only. Specifies which columns to return in the result set.')
    .optional(),
  where: z
    .string()
    .describe('For type=data-access only. Filters the rows to be returned (e.g., "magnitude > 3.0").')
    .optional(),
  order: z
    .string()
    .describe('For type=data-access only. Orders the results based on specified columns (e.g., "date DESC").')
    .optional(),
  group: z
    .string()
    .describe('For type=data-access only. Groups results for aggregate functions.')
    .optional(),
  having: z
    .string()
    .describe('For type=data-access only. Filters for grouped results, similar to where but for grouped data.')
    .optional(),
  q: z
    .string()
    .describe('For type=data-access only. Full text search parameter for free-text searching across the dataset.')
    .optional(),
  limit: z
    .number()
    .describe('Maximum number of results to return:\n- For type=catalog: Limits dataset results\n- For type=data-access: Limits data records returned')
    .default(10)
    .optional(),
  offset: z
    .number()
    .describe('Number of results to skip for pagination:\n- For type=catalog: Skips dataset results\n- For type=data-access: Skips data records for pagination')
    .default(0)
    .optional(),
}).strict();

async function createMcpServerInstance(): Promise<McpServer> {
  const portalInfo = await getPortalInfo();
  const description = `[${portalInfo.title}] ${UNIFIED_SOCRATA_TOOL.description}`;

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

  const schemaWithDescription = unifiedSocrataSchema.describe(description);
  server.tool(UNIFIED_SOCRATA_TOOL.name, schemaWithDescription, async (args) => {
    const result = await handleSocrataTool(args);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  console.log('[MCP Server] Tool registered with description:', description);

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
    console.log('[MCP Server] Tool registered with description:', description);

  /* ---------- Client messages (POST) ---------- */
  app.post(messagesPath, async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) {
      res.status(400).send('Missing sessionId');
      return;
    }

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

    try {
      await transport.handlePostMessage(req, res, req.body);
    } catch (err) {
      console.error(`[POST ${messagesPath}] handlePostMessage error`, err);
      if (!res.headersSent) res.status(500).send('Error processing message');
    }
  });

  /* ---------- Health check ---------- */
  app.get('/', (_req: Request, res: Response) =>
    res
      .status(200)
      .send(
        'OpenGov MCP Server is running. SSE: GET /mcp/sse, Messages: POST /mcp/messages',
      ),
  );

  /* ---------- Start server ---------- */
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server listening on port ${port}`);
  });
}

/* -------------------------------------------------------------------------- */
/* Entrypoint                                                                 */
/* -------------------------------------------------------------------------- */
startApp().catch((err) => {
  console.error('[Fatal] Uncaught error during startup', err);
  process.exit(1);
});

