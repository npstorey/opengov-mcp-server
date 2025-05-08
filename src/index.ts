#!/usr/bin/env node

import 'dotenv/config';
// Remove .js extensions for SDK imports
import { Server } from '@modelcontextprotocol/sdk/server';
import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types';

import {
  SOCRATA_TOOLS,
  handleSocrataTool,
} from './tools/socrata-tools.js'; // Keep .js for local modules
import { getPortalInfo, PortalInfo } from './utils/portal-info.js'; // Keep .js for local modules

// 1) Initialize the MCP server
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

// 2) Handle incoming tool‐calls (JSON-RPC)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    server.sendLoggingMessage({
      level: 'info',
      data: { message: `Handling tool: ${name}`, tool: name, args },
    });

    let result: unknown;
    if (name === 'get_data') {
      result = await handleSocrataTool(args || {});
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    server.sendLoggingMessage({
      level: 'info',
      data: { message: `Success: ${name}`, size: JSON.stringify(result).length },
    });

    return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    server.sendLoggingMessage({
      level: 'error',
      data: { message: `Error: ${errorMessage}`, tool: name, args },
    });
    return { content: [{ type: 'text', text: `Error: ${errorMessage}` }], isError: true };
  }
});

// 3) Enhance tool list with portal info
function enhanceToolsWithPortalInfo(tools: Tool[], portalInfo: PortalInfo): Tool[] {
  return tools.map((tool) => ({
    ...tool,
    description: `[${portalInfo.title}] ${tool.description}`,
  }));
}

// 4) Bootstrap and start HTTP transport
async function runServer() {
  try {
    // Fetch portal metadata
    const portalInfo = await getPortalInfo();
    const enhancedTools = enhanceToolsWithPortalInfo(SOCRATA_TOOLS, portalInfo);

    // Serve tool list
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: enhancedTools }));

    // Bind to Render’s port
    const port = Number(process.env.PORT) || 8000;
    const transport = new HttpServerTransport({
      host: '0.0.0.0',
      port,
      basePath: '/mcp',
    });

    await transport.connect(server);
    console.log(`🚀 MCP server listening on port ${port}`);
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

runServer().catch((err) => {
  console.error('Uncaught initialization error:', err);
  process.exit(1);
});
