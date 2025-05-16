#!/usr/bin/env node

import express from 'express';
import type { Request, Response } from 'express';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  type Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  SOCRATA_TOOLS,
  UNIFIED_SOCRATA_TOOL,
  handleSocrataTool,
} from './tools/socrata-tools.js';
import { getPortalInfo, PortalInfo } from './utils/portal-info.js';

// Helper function to create and configure a server instance
// This is called for each request in stateless mode
async function getServerInstance(): Promise<Server> {
  const portalInfo = await getPortalInfo();
  
  const server = new Server(
    {
      name: 'opengov-mcp-server',
      version: '0.1.1',
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  // Enhance the tool with portal info
  const enhancedTool = {
    ...UNIFIED_SOCRATA_TOOL,
    description: `[${portalInfo.title}] ${UNIFIED_SOCRATA_TOOL.description}`,
  };

  // Register tool handlers
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments || {};
    const { name } = request.params;
    try {
      server.sendLoggingMessage({
        level: 'info',
        data: { message: `Handling tool call: ${name}`, tool: name, args },
      });

      const result = await handleSocrataTool(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      server.sendLoggingMessage({
        level: 'error',
        data: { message: `Tool call error: ${errorMessage}`, tool: name, args, error: err },
      });
      return { content: [{ type: 'text', text: `Error: ${errorMessage}` }], isError: true };
    }
  });

  // Register tools list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [enhancedTool] };
  });

  return server;
}

const app = express();
app.use(express.json());

// Single endpoint for all MCP communication
app.post('/mcp', async (req: Request, res: Response) => {
  console.log(`[${new Date().toISOString()}] POST /mcp request received`);
  try {
    // Create a new server and transport instance for each request for stateless operation
    const mcpServerInstance = await getServerInstance();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless
    });

    // Ensure proper cleanup on client disconnect
    res.on('close', () => {
      console.log(`[${new Date().toISOString()}] Request closed by client. Closing transport.`);
      transport.close().catch(err => console.error("Error closing transport:", err));
      mcpServerInstance.close().catch(err => console.error("Error closing MCP server instance:", err));
    });

    await mcpServerInstance.connect(transport);
    await transport.handleRequest(req, res, req.body);
    console.log(`[${new Date().toISOString()}] POST /mcp request processed`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error handling MCP request:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: (req.body && req.body.id !== undefined) ? req.body.id : null,
      });
    }
  }
});

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.status(200).send('OpenGov MCP Server (Stateless StreamableHTTP) is running. MCP endpoint at /mcp (POST).');
});

const port = Number(process.env.PORT) || 8000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 MCP Server (Stateless StreamableHTTP) listening on port ${port}, endpoint /mcp (POST)`);
});
