#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {
  UNIFIED_SOCRATA_TOOL,
  socrataToolZodSchema,
} from './tools/socrata-tools.js';

dotenv.config();

async function startApp() {
  try {
    const app = express();
    const port = Number(process.env.PORT) || 8000;
    
    console.log('[Environment] DATA_PORTAL_URL:', process.env.DATA_PORTAL_URL);
    
    // CORS configuration
    app.use(cors({
      origin: true,
      credentials: true,
      exposedHeaders: ['mcp-session-id']
    }));

    const mcpPath = '/mcp';

    // Health check
    app.get('/healthz', (_req, res) => {
      console.log('[Health] /healthz hit');
      res.sendStatus(200);
    });

    // Root endpoint
    app.get('/', (_req, res) => {
      res.send('OpenGov MCP Server running');
    });

    // Test endpoint
    app.get('/test-tools', async (_req, res) => {
      console.log('[Test] Returning tool schema...');
      res.json({
        tools: [{
          name: UNIFIED_SOCRATA_TOOL.name,
          description: UNIFIED_SOCRATA_TOOL.description,
          parameters: UNIFIED_SOCRATA_TOOL.parameters,
          inputSchema: UNIFIED_SOCRATA_TOOL.parameters,
        }]
      });
    });

    // Create MCP server
    console.log('[MCP] Creating server...');
    const mcpServer = new McpServer(
      {
        name: 'opengov-mcp-server',
        version: '0.1.1'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Register the unified tool
    console.log('[MCP] Registering tool:', UNIFIED_SOCRATA_TOOL.name);
    mcpServer.tool(
      UNIFIED_SOCRATA_TOOL.name,
      UNIFIED_SOCRATA_TOOL.description,
      UNIFIED_SOCRATA_TOOL.parameters,
      async (args: any) => {
        console.log('[Tool] Called with args:', JSON.stringify(args, null, 2));
        try {
          const parsed = socrataToolZodSchema.parse(args);
          const handler = UNIFIED_SOCRATA_TOOL.handler;
          if (typeof handler !== 'function') {
            throw new Error('Tool handler is not a function');
          }
          const result = await handler(parsed);
          console.log('[Tool] Result:', JSON.stringify(result, null, 2));
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        } catch (error) {
          console.error('[Tool] Error:', error);
          return {
            content: [{ 
              type: 'text', 
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
            isError: true
          };
        }
      }
    );

    // Create transport
    console.log('[MCP] Creating transport...');
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => {
        const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        console.log('[Transport] Generated session ID:', sessionId);
        return sessionId;
      }
    });

    // Log transport events
    transport.onmessage = (message: any) => {
      console.log('[Transport] Message:', JSON.stringify(message, null, 2));
    };

    transport.onerror = (error: any) => {
      console.error('[Transport] Error:', error);
    };

    transport.onclose = () => {
      console.log('[Transport] Connection closed');
    };

    // Connect server to transport
    console.log('[MCP] Connecting server to transport...');
    await mcpServer.connect(transport);
    console.log('[MCP] Server connected');

    // MCP endpoint
    app.all(mcpPath, async (req, res) => {
      console.log(`[Express] ${req.method} ${req.url}`);
      console.log('[Express] Headers:', {
        'content-type': req.headers['content-type'],
        'accept': req.headers.accept,
        'mcp-session-id': req.headers['mcp-session-id'],
        'x-session-id': req.headers['x-session-id']
      });

      try {
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error('[Express] Error handling request:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });

    // Start server
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`   Health: http://localhost:${port}/healthz`);
      console.log(`   MCP: http://localhost:${port}/mcp`);
      console.log(`   Test: http://localhost:${port}/test-tools`);
    });

  } catch (error) {
    console.error('[Fatal] Error during startup:', error);
    process.exit(1);
  }
}

startApp().catch(console.error);
