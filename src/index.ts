#!/usr/bin/env node

import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

import {
  handleSocrataTool,
  UNIFIED_SOCRATA_TOOL,
} from './tools/socrata-tools.js';
import { getPortalInfo } from './utils/portal-info.js';

/* -------------------------------------------------------------------------- */
/* Zod schema (defined once)                                                  */
/* -------------------------------------------------------------------------- */
const baseUnifiedSocrataSchema = z
  .object({
    type: z.enum([
      'catalog',
      'categories',
      'tags',
      'dataset-metadata',
      'column-info',
      'data-access',
      'site-metrics',
    ]).describe(
      'The type of operation to perform:\n' +
        '- catalog: List datasets with optional search\n' +
        '- categories: List all dataset categories\n' +
        '- tags: List all dataset tags\n' +
        '- dataset-metadata: Get detailed metadata for a specific dataset\n' +
        '- column-info: Get column details for a specific dataset\n' +
        '- data-access: Access records from a dataset (with query support)\n' +
        '- site-metrics: Get portal-wide statistics',
    ),
    domain: z
      .string()
      .describe('Optional domain (hostname only, without protocol). Used with all operation types.')
      .optional(),
    query: z
      .string()
      .describe(
        'Search or query string with different uses depending on operation type:\n' +
          '- For type=catalog: Search query to filter datasets\n' +
          '- For type=data-access: SoQL query string for complex data filtering',
      )
      .optional(),
    datasetId: z
      .string()
      .describe(
        'Dataset identifier required for the following operations:\n' +
          '- For type=dataset-metadata: Get dataset details\n' +
          '- For type=column-info: Get column information\n' +
          '- For type=data-access: Specify which dataset to query (e.g., 6zsd-86xi)',
      )
      .optional(),
    soqlQuery: z
      .string()
      .describe(
        'For type=data-access only. Optional SoQL query string for filtering data.\n' +
          'This is an alias for the query parameter and takes precedence if both are provided.',
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
      .describe(
        'Maximum number of results to return:\n' +
          '- For type=catalog: Limits dataset results\n' +
          '- For type=data-access: Limits data records returned',
      )
      .default(10)
      .optional(),
    offset: z
      .number()
      .describe(
        'Number of results to skip for pagination:\n' +
          '- For type=catalog: Skips dataset results\n' +
          '- For type=data-access: Skips data records for pagination',
      )
      .default(0)
      .optional(),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* Factory – create a fully‑configured McpServer instance per connection      */
/* -------------------------------------------------------------------------- */
async function createMcpServerInstance(): Promise<McpServer> {
  const portalInfo = await getPortalInfo();
  const toolDescription = `[${portalInfo.title}] ${UNIFIED_SOCRATA_TOOL.description}`;

  const schemaWithDescription = baseUnifiedSocrataSchema.describe(toolDescription);

  const server = new McpServer(
    { name: 'opengov-mcp-server', version: '0.1.1' },
    { capabilities: { tools: {} } },
  );

  server.tool(
    UNIFIED_SOCRATA_TOOL.name,
    schemaWithDescription,
    async (args) => {
      const result = await handleSocrataTool(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    },
  );

  return server;
}

/* -------------------------------------------------------------------------- */
/* Express + SSE bootstrap                                                    */
/* -------------------------------------------------------------------------- */
async function startApp(): Promise<void> {
  const app = express();
  app.use(express.json());

  const port = Number(process.env.PORT) || 8000;
  const ssePath = '/mcp/sse';
  const messagesPath = '/mcp/messages';

  /** Active SSE transports keyed by sessionId */
  const transports: Record<string, SSEServerTransport> = {};

  /* ---------- SSE handshake (GET) ---------- */
  app.get(ssePath, async (req: Request, res: Response) => {
    console.log(`[GET ${ssePath}] New SSE connection from ${req.ip}`);

    const mcpServer = await createMcpServerInstance();
    const transport = new SSEServerTransport(messagesPath, res);

    const sessionId = transport.sessionId;
    if (!sessionId) {
      console.error(`[GET ${ssePath}] Failed to obtain sessionId`);
      if (!res.headersSent) res.status(500).send('Failed to establish session');
      return;
    }

    transports[sessionId] = transport;

    transport.onerror = (err: Error) =>
      console.error(`[SSE Error][${sessionId}]`, err);

    try {
      await mcpServer.connect(transport);
      console.log(`[GET ${ssePath}] Connected (session ${sessionId})`);
    } catch (err) {
      console.error(`[GET ${ssePath}] connect() failed`, err);
      delete transports[sessionId];
      if (!res.headersSent) res.status(500).send('Failed to establish MCP');
    }

    req.on('close', () => {
      console.log(`[GET ${ssePath}] Client closed (session ${sessionId})`);
      delete transports[sessionId];
    });
  });

  /* ---------- Client messages (POST) ---------- */
  app.post(messagesPath, async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string | undefined;
    if (!sessionId) {
      res.status(400).send('Missing sessionId');
      return;
    }

    const transport = transports[sessionId];
    if (!transport) {
      res.status(404).send('Session not found or expired');
      return;
    }

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
