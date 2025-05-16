#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  type Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import type { Request, Response } from 'express'; // Import Express types for better type safety

import {
  SOCRATA_TOOLS,
  handleSocrataTool,
  UNIFIED_SOCRATA_TOOL, // Assuming this is the single tool object
} from './tools/socrata-tools.js';
import { getPortalInfo, PortalInfo } from './utils/portal-info.js';

const mcpServer = new Server(
  {
    name: 'opengov-mcp-server',
    version: '0.1.1',
  },
  {
    capabilities: {
      tools: {}, // Server will automatically declare tools capability if setRequestHandler(ListToolsRequestSchema,...) is used
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
    if (name === UNIFIED_SOCRATA_TOOL.name) { // Use the name from your tool definition
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
    // Note: portalInfo and enhancedTools are now fetched inside the ListTools handler
    // to ensure fresh data if DATA_PORTAL_URL changes or for first load on Render.

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('[MCP Server] ListToolsRequestSchema handler: Fired');
      try {
        const portalInfo = await getPortalInfo();
        console.log('[MCP Server] ListToolsRequestSchema handler: Got portalInfo.title:', portalInfo.title);
        
        // Assuming SOCRATA_TOOLS is an array containing UNIFIED_SOCRATA_TOOL
        const enhancedTools = enhanceToolsWithPortalInfo(SOCRATA_TOOLS, portalInfo);
        console.log('[MCP Server] ListToolsRequestSchema handler: Enhanced tools created, count:', enhancedTools.length);

        return {
          tools: enhancedTools
        };
      } catch (error) {
        console.error('[MCP Server] ListToolsRequestSchema handler: ERROR occurred:', error);
        const fallbackTool: Tool = {
          name: "error_fallback_tool",
          description: "A fallback tool due to an error generating the full list.",
          inputSchema: { type: "object", properties: { q: { type: "string" } } }
        };
        return {
          tools: [fallbackTool]
        };
      }
    });

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
