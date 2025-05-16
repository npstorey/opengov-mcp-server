#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  type Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

import {
  SOCRATA_TOOLS,
  handleSocrataTool,
} from './tools/socrata-tools.js';
import { getPortalInfo, PortalInfo } from './utils/portal-info.js';

const mcpServer = new Server(
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

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};
  const { name } = request.params;
  try {
    mcpServer.sendLoggingMessage({
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
      mcpServer.sendLoggingMessage({
        level: 'error',
        data: { message: `Could not stringify result for tool: ${name}`, tool: name, args, error: stringifyError },
      });
      result = { stringifyError: 'Could not serialize result' };
      resultSize = JSON.stringify(result).length;
    }
    mcpServer.sendLoggingMessage({
      level: 'info',
      data: { message: `Tool call success: ${name}`, tool: name, resultSize },
    });
    return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    mcpServer.sendLoggingMessage({
      level: 'error',
      data: { message: `Tool call error: ${errorMessage}`, tool: name, args, error: err },
    });
    return { content: [{ type: 'text', text: `Error: ${errorMessage}` }], isError: true };
  }
});

function enhanceToolsWithPortalInfo(tools: Tool[], portalInfo: PortalInfo): Tool[] {
  return tools.map((tool) => ({
    ...tool,
    description: `[${portalInfo.title}] ${tool.description}`,
  }));
}

async function startApp() {
  try {
    const portalInfo = await getPortalInfo();
    const enhancedTools = enhanceToolsWithPortalInfo(SOCRATA_TOOLS, portalInfo);

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: enhancedTools 
      };
    });

    const app = express();
    app.use(express.json());

    const port = Number(process.env.PORT) || 8000;
    const ssePath = '/mcp/sse';
    const messagesPath = '/mcp/messages';

    let activeTransport: SSEServerTransport | null = null;

    app.get(ssePath, async (req, res) => {
      console.log(`GET ${ssePath}: New SSE connection request`);
      if (activeTransport) {
        // activeTransport.close(); // Need to check if SSEServerTransport has a close method
      }
      
      activeTransport = new SSEServerTransport(messagesPath, res);
      await mcpServer.connect(activeTransport);
      
      console.log(`SSE transport connected for GET ${ssePath}`);
      req.on('close', () => {
        console.log(`GET ${ssePath}: SSE connection closed by client`);
        activeTransport = null;
      });
    });

    app.post(messagesPath, (req, res) => {
      console.log(`POST ${messagesPath}: Received message`);
      if (activeTransport) {
        activeTransport.handlePostMessage(req, res);
      } else {
        console.error(`POST ${messagesPath}: No active SSE transport to handle message`);
        res.status(500).send('No active SSE transport');
      }
    });
    
    app.get('/', (req, res) => {
      res.status(200).send('OpenGov MCP Server is running. MCP endpoint at /mcp/sse (GET for SSE) and /mcp/messages (POST for client messages).');
    });

    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 MCP server (using Express + SSE) listening on port ${port}. SSE at ${ssePath}, Messages at ${messagesPath}`);
      // Removed logging message for startup
      // mcpServer.sendLoggingMessage({
      //   level: 'info',
      //   data: {
      //     message: `OpenGov MCP Server (Express+SSE) started for data portal: ${portalInfo.title}`,
      //     portalInfo,
      //     timestamp: new Date().toISOString(),
      //   },
      // });
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
