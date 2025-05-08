#!/usr/bin/env node

// Removed: import 'dotenv/config';

import { Server } from '@modelcontextprotocol/sdk/server/index.js'; // Suffix needed
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'; // Suffix needed
import {
  // Explicitly import Tool type for use in function signatures
  type Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'; // Suffix needed

import {
  SOCRATA_TOOLS,
  handleSocrataTool,
} from './tools/socrata-tools.js';
import { getPortalInfo, PortalInfo } from './utils/portal-info.js';

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
  const args = request.params.arguments || {};
  const { name } = request.params;

  try {
    server.sendLoggingMessage({
      level: 'info',
      data: { message: `Handling tool call: ${name}`, tool: name, args },
    });

    let result: unknown;
    if (name === 'get_data') {
      result = await handleSocrataTool(args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    let resultSize = 0;
    try {
      resultSize = JSON.stringify(result).length;
    } catch (stringifyError) {
      server.sendLoggingMessage({
        level: 'error',
        data: { message: `Could not stringify result for tool: ${name}`, tool: name, args, error: stringifyError },
      });
      result = { stringifyError: 'Could not serialize result' };
      resultSize = JSON.stringify(result).length;
    }

    server.sendLoggingMessage({
      level: 'info',
      data: { message: `Tool call success: ${name}`, tool: name, resultSize },
    });

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
    const portalInfo = await getPortalInfo();
    const enhancedTools = enhanceToolsWithPortalInfo(SOCRATA_TOOLS, portalInfo);

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        content: [{ type: 'text', text: JSON.stringify({ tools: enhancedTools }) }],
        isError: false
      };
    });

    const port = Number(process.env.PORT) || 8000;
    const basePath = '/mcp';

    const transport = new StreamableHTTPServerTransport({
       host: '0.0.0.0',
       port,
       basePath: basePath,
    });

    // *** CORRECTED CONNECTION LOGIC ***
    // Connect the server TO the transport. This likely starts the transport implicitly.
    await server.connect(transport);

    // REMOVED: await transport.start(); // This line caused the "Transport already started" error
    // *** END CORRECTED LOGIC ***

    console.log(`🚀 MCP server listening on port ${port} at path ${basePath}`);

  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

runServer().catch((err) => {
  console.error('Uncaught initialization error:', err);
  process.exit(1);
});
