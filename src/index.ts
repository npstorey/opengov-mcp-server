#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import 'dotenv/config';

// Import Socrata unified tool
import { 
  SOCRATA_TOOLS, 
  handleSocrataTool
} from './tools/socrata-tools.js';
import { getPortalInfo, PortalInfo } from './utils/portal-info.js';

// Initialize the server
const server = new Server(
  {
    name: 'opengov-mcp',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {},
      logging: {}
    }
  }
);

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    server.sendLoggingMessage({
      level: 'info',
      data: {
        message: `Handling tool call: ${name}`,
        tool: name,
        arguments: args,
        timestamp: new Date().toISOString(),
      },
    });

    let result: unknown;

    if (name === 'get_data') {
      // Handle the unified data retrieval tool
      result = await handleSocrataTool(args || {});
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Log success
    server.sendLoggingMessage({
      level: 'info',
      data: {
        message: `Successfully executed tool: ${name}`,
        tool: name,
        resultSize: JSON.stringify(result).length,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      isError: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    server.sendLoggingMessage({
      level: 'error',
      data: {
        message: `Error handling tool ${name}: ${errorMessage}`,
        tool: name,
        arguments: args,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      },
    });
    
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Enhanced tool with portal context
function enhanceToolsWithPortalInfo(tools: Tool[], portalInfo: PortalInfo): Tool[] {
  return tools.map(tool => {
    // Create a copy of the tool
    const enhancedTool: Tool = { ...tool };
    
    // Add portal info to the description
    enhancedTool.description = `[${portalInfo.title}] ${tool.description}`;
    
    return enhancedTool;
  });
}

// Start the server
async function runServer() {
  try {
    // Get information about the data portal
    const portalInfo = await getPortalInfo();
    // Don't use console.log as it interferes with the JSON-RPC protocol
    // Instead, we'll log through the MCP logging capability after connecting
    
    // Update tools list with portal info
    const enhancedTools = enhanceToolsWithPortalInfo(SOCRATA_TOOLS, portalInfo);
    
    // Update the tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: enhancedTools,
    }));
    
    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    server.sendLoggingMessage({
      level: 'info',
      data: {
        message: `OpenGov MCP Server started for data portal: ${portalInfo.title}`,
        portalInfo,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error during server initialization:', error);
    process.exit(1);
  }
}

runServer().catch((error) => {
  // Need to use console.error for startup failures as logging API isn't available yet
  console.error('Fatal error running server:', error);
  process.exit(1);
});