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
  UNIFIED_SOCRATA_TOOL, // Assuming this is the single tool object
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

async function startApp() {
  try {
    const mcpServer = await createMcpServerInstance();

    const app = express();
    app.use(express.json());

    const port = Number(process.env.PORT) || 8000;
    const ssePath = '/mcp/sse';
    const messagesPath = '/mcp/messages';
    let activeTransport: SSEServerTransport | null = null;

    app.get(ssePath, async (req: Request, res: Response) => {
      console.log(`[MCP Server] GET ${ssePath}: New SSE connection request from ${req.ip}`);
      // Simplified: assume one active transport for now. For multiple clients, this needs more robust handling.
      if (activeTransport) {
        console.log('[MCP Server] An existing SSE transport was active. It will be overridden.');
        // Consider if activeTransport.close() is needed/available if overwriting
      }
      
      activeTransport = new SSEServerTransport(messagesPath, res);
      console.log('[MCP Server] activeTransport created. Is SSEServerTransport instance:', activeTransport instanceof SSEServerTransport);
      
      // Add error handler for activeTransport
      try {
        (activeTransport as any).onerror = (error: Error) => {
          console.error('[MCP Transport Error]', error);
        };
      } catch (err) {
        console.log('[MCP Server] Could not set activeTransport.onerror handler:', err);
      }

      try {
        await mcpServer.connect(activeTransport);
        console.log(`[MCP Server] SSE transport connected and mcpServer.connect() called for GET ${ssePath}.`);
      } catch (connectError) {
        console.error(`[MCP Server] Error connecting MCP server to SSE transport: `, connectError);
        if (!res.headersSent) {
          res.status(500).send("Failed to establish MCP connection");
        }
        return;
      }
      
      req.on('close', () => {
        console.log(`[MCP Server] GET ${ssePath}: SSE connection closed by client (${req.ip}). Clearing activeTransport.`);
        // if (activeTransport && typeof activeTransport.close === 'function') {
        //   activeTransport.close(); // If a close method exists on the transport
        // }
        activeTransport = null; 
      });
    });

    app.post(messagesPath, (req: Request, res: Response) => {
      console.log(`[MCP Server] POST ${messagesPath}: Received message.`);
      console.log('[MCP Server] Request Body for POST:', JSON.stringify(req.body, null, 2)); 

      if (activeTransport) {
        try {
          console.log('[MCP Server] Calling activeTransport.handlePostMessage...');
          activeTransport.handlePostMessage(req, res); // This is often synchronous for SSE message routing
          console.log('[MCP Server] Returned from activeTransport.handlePostMessage.');
        } catch (e) {
          console.error('[MCP Server] Error synchronously thrown by activeTransport.handlePostMessage:', e);
          if (!res.headersSent) {
            res.status(500).send('Error processing message');
          }
        }
      } else {
        console.error(`[MCP Server] POST ${messagesPath}: No active SSE transport to handle message`);
        if (!res.headersSent) {
          res.status(500).send('No active SSE transport');
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

startApp().catch((err) => {
  console.error('Uncaught initialization error for Express app:', err);
  process.exit(1);
});

