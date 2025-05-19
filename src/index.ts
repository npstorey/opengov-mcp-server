#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { z } from 'zod';
import express from 'express';
import type { Request, Response } from 'express';

import {
  handleSocrataTool,
  UNIFIED_SOCRATA_TOOL,
} from './tools/socrata-tools.js';

import { getPortalInfo } from './utils/portal-info.js';

async function createMcpServerInstance(): Promise<McpServer> {
  console.log('[MCP Server Factory] Creating new McpServer instance...');
  const portalInfo = await getPortalInfo();
  const toolDescription = `[${portalInfo.title}] ${UNIFIED_SOCRATA_TOOL.description}`;

  const unifiedSocrataSchema = z
    .object({
      type: z
        .enum([
          'catalog',
          'categories',
          'tags',
          'dataset-metadata',
          'column-info',
          'data-access',
          'site-metrics',
        ])
        .describe(
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
    })
    .strict()
    .describe(toolDescription);

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

  if (typeof (serverInstance as any).onError === 'function') {
    (serverInstance as any).onError((error: Error) => {
      console.error('[MCP Server Global Error]', error);
    });
  } else {
    console.log('[MCP Server] mcpServer.onError method not found, skipping global error handler setup.');
  }

  serverInstance.tool(
    UNIFIED_SOCRATA_TOOL.name,
    unifiedSocrataSchema,
    async (args: any) => {
      console.log(`[McpServer Tool] Calling tool: ${UNIFIED_SOCRATA_TOOL.name} with args:`, args);
      const result = await handleSocrataTool(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  return serverInstance;
}

// Main application setup and start function
async function startApp() {

  try {
    const mcpServer = await createMcpServerInstance();

  const port = Number(process.env.PORT) || 8000;
  const ssePath = '/mcp/sse';
  const messagesPath = '/mcp/messages';

  // Store transports by session ID, and associate McpServer instances if needed,
  // though for SSE with McpServer created per connection, we might not need to store mcpServer globally.
  const transports: Record<string, SSEServerTransport> = {};
  // If McpServer needs to be tied to the session for handlePostMessage, we'll need to store it too.
  // For now, the SDK example for SSE with McpServer creates it in the GET and assumes handlePostMessage can work with any transport.
  // The simpleSseServer example recreated McpServer in GET, and transport.handlePostMessage was enough.

  app.get(ssePath, async (req: Request, res: Response) => {
    console.log(`[Express App] GET ${ssePath}: New SSE connection request from ${req.ip}`);

    const mcpServerForThisConnection = await createMcpServerInstance(); // Create a fresh server for this connection
    const transport = new SSEServerTransport(messagesPath, res); // Pass messagesPath for client to POST to
    
    // It's important to get sessionId from the transport AFTER it's created
    const sessionId = transport.sessionId; 
    if (!sessionId) {
        console.error("[Express App] SSEServerTransport did not generate a sessionId.");
        if (!res.headersSent) res.status(500).send("Failed to establish session.");
        return;
    }
    transports[sessionId] = transport;
    console.log(`[Express App] SSEServerTransport instance created with sessionId: ${sessionId}`);


    if (typeof (transport as any).onerror === 'function') {
        (transport as any).onerror = (error: Error) => {
          console.error(`[MCP Transport Error - Session ${sessionId}]`, error);
        };
    } else {
        console.log('[Express App] transport.onerror cannot be assigned or already exists.');
    }

    try {
      await mcpServerForThisConnection.connect(transport);
      console.log(`[Express App] McpServer connected to SSE transport for session ${sessionId}. headersSent: ${res.headersSent}`);
    } catch (connectError) {
      console.error(`[Express App] Error connecting McpServer to SSE transport for session ${sessionId}: `, connectError);
      delete transports[sessionId];
      if (!res.headersSent) {
        res.status(500).send("Failed to establish MCP connection");
      }
      return;
    }
    
    req.on('close', () => {
      console.log(`[Express App] GET ${ssePath}: SSE connection closed by client (${req.ip}) for session ${sessionId}. Clearing transport.`);
      // mcpServerForThisConnection.close(); // Close the specific McpServer instance for this connection
      delete transports[sessionId]; 
    });
  });

  app.post(messagesPath, async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string | undefined; // As per simpleSseServer example
    console.log(`[Express App] POST ${messagesPath} for sessionId: ${sessionId}`);
    console.log('[Express App] Request Body for POST:', JSON.stringify(req.body, null, 2)); 

    if (!sessionId) {
      console.error(`[Express App] POST ${messagesPath}: Missing sessionId query parameter.`);
      if (!res.headersSent) res.status(400).send('Missing sessionId query parameter');
      return;
    }

    const transportInstance = transports[sessionId];
    if (transportInstance) {
      res.on('finish', () => {
        console.log(`[Express App] Response finished for POST ${messagesPath} (session ${sessionId}) with status ${res.statusCode}`);
      });
      try {
        console.log(`[Express App] Calling transport.handlePostMessage for session ${sessionId}...`);
        // handlePostMessage likely uses the McpServer instance it was connected with during the GET /mcp/sse
        await transportInstance.handlePostMessage(req, res, req.body); 
        console.log(`[Express App] Returned from transport.handlePostMessage for session ${sessionId}. headersSent: ${res.headersSent}`);
      } catch (e) {
        console.error(`[Express App] Error during handlePostMessage for session ${sessionId}:`, e);
        if (!res.headersSent) {
          res.status(500).send('Error processing message');
        }
      }
    } else {
      console.error(`[Express App] POST ${messagesPath}: No active SSE transport found for session ID: ${sessionId}`);
      if (!res.headersSent) {
        res.status(404).send('Session not found or expired');
      }
    }
  });
  
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).send('OpenGov MCP Server is running. MCP endpoint at /mcp/sse (GET for SSE) and /mcp/messages (POST for client messages).');
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 MCP server (Express + SSE) listening on port ${port}. SSE at ${ssePath}, Messages at ${messagesPath}`);
  });
}

startApp().catch((err) => { // Call startApp to actually run the server
  console.error('Uncaught initialization error for Express app:', err);
  process.exit(1);

});
