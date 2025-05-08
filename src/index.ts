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
    // Update version if needed, matching package.json
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
  // Default args to an empty object if undefined or null
  const args = request.params.arguments || {};
  const { name } = request.params;

  try {
    server.sendLoggingMessage({
      level: 'info',
      data: { message: `Handling tool call: ${name}`, tool: name, args },
    });

    let result: unknown;
    if (name === 'get_data') {
      // Pass the potentially defaulted args object
      result = await handleSocrataTool(args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Determine result size safely
    let resultSize = 0;
    try {
      resultSize = JSON.stringify(result).length;
    } catch (stringifyError) {
      server.sendLoggingMessage({
        level: 'warn',
        data: { message: `Could not stringify result for tool: ${name}`, tool: name, args },
      });
      // Handle potentially circular structures or other stringify issues
      result = { stringifyError: 'Could not serialize result' };
      resultSize = JSON.stringify(result).length;
    }

    server.sendLoggingMessage({
      level: 'info',
      data: { message: `Tool call success: ${name}`, tool: name, resultSize },
    });

    // Return standard MCP response
    return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    server.sendLoggingMessage({
      level: 'error',
      data: { message: `Tool call error: ${errorMessage}`, tool: name, args, error: err },
    });
    // Return standard MCP error response
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

    // Serve tool list - CORRECTED HANDLER
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Construct the standard MCP response structure for ListTools
      // The client expects the list of tools to be JSON stringified within the 'content'
      return {
        content: [{ type: 'text', text: JSON.stringify({ tools: enhancedTools }) }],
        isError: false
      };
    }); // <-- End of corrected setRequestHandler for ListTools

    // Bind to Render’s port or default
    const port = Number(process.env.PORT) || 8000;

    // Use the transport class from the documentation
    const transport = new StreamableHTTPServerTransport({
       host: '0.0.0.0', // Listen on all interfaces for container environments
       port,
       basePath: '/mcp', // Set base path if needed, otherwise '/'
       // sessionIdGenerator: undefined, // Use if needed for stateless mode
    });

    // Connect the transport to the server logic
    await transport.connect(server);
    console.log(`🚀 MCP server listening on port ${port} at path ${transport.basePath || '/'}`);

  } catch (err) {
    // Log fatal startup errors
    console.error('Fatal error starting server:', err);
    process.exit(1); // Exit if server cannot start
  }
}

// Run the server and catch top-level errors during initialization
runServer().catch((err) => {
  console.error('Uncaught initialization error:', err);
  process.exit(1); // Exit if initialization fails
});
