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

// Enable debug logging for MCP SDK
if (process.env.NODE_ENV !== 'production') {
  process.env.DEBUG = 'mcp:*';
}

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
          tools: {},
          logging: {} // Add logging capability
        }
      }
    );

    // Add logging capability if available
    if ('sendLoggingMessage' in mcpServer) {
      console.log('[MCP] Server has logging capability');
    }

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

    console.log('[MCP] Tool registered successfully');

    // Verify tool registration
    if ('listTools' in mcpServer) {
      console.log('[MCP] Server has listTools method');
    }

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

    // Log session initialization
    if ('onsessioninitialized' in transport) {
      transport.onsessioninitialized = (sessionId: string) => {
        console.log('[Transport] Session initialized:', sessionId);
      };
    }

    // Connect server to transport
    console.log('[MCP] Connecting server to transport...');
    console.log('[MCP] Server methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(mcpServer)).filter(m => !m.startsWith('_')));
    
    await mcpServer.connect(transport);
    console.log('[MCP] Server connected');

    // Log server state
    console.log('[MCP] Server tools registered:', {
      hasTools: true,
      toolName: UNIFIED_SOCRATA_TOOL.name
    });

    // Wrap handleRequest to add detailed logging
    const originalHandleRequest = transport.handleRequest.bind(transport);
    transport.handleRequest = async (req: any, res: any) => {
      console.log('[Transport.handleRequest] Starting...');
      
      // Track response methods
      const originalJson = res.json;
      const originalWrite = res.write;
      const originalEnd = res.end;
      const originalSetHeader = res.setHeader;
      
      res.json = function(data: any) {
        console.log('[Transport Response] JSON:', JSON.stringify(data, null, 2));
        return originalJson.call(this, data);
      };
      
      res.write = function(data: any) {
        const preview = data.toString().substring(0, 200);
        console.log('[Transport Response] Write:', preview);
        return originalWrite.call(this, data);
      };
      
      res.end = function(data?: any) {
        console.log('[Transport Response] End');
        return originalEnd.call(this, data);
      };
      
      res.setHeader = function(name: string, value: any) {
        console.log(`[Transport Response] Header: ${name} = ${value}`);
        return originalSetHeader.call(this, name, value);
      };
      
      try {
        const result = await originalHandleRequest(req, res);
        console.log('[Transport.handleRequest] Completed successfully');
        return result;
      } catch (error) {
        console.error('[Transport.handleRequest] Error:', error);
        throw error;
      }
    };

    // Accept-header shim for OpenAI connector
    app.use(mcpPath, (req, _res, next) => {
      const h = req.headers.accept ?? '';
      if (!h.includes('text/event-stream')) {
        req.headers.accept = h ? `${h}, text/event-stream` : 'text/event-stream';
        console.log('[Express] Added text/event-stream to accept header');
      }
      next();
    });

    // MCP endpoint
    app.all(mcpPath, async (req, res) => {
      console.log(`[Express] ${req.method} ${req.url}`);
      console.log('[Express] Headers:', {
        'content-type': req.headers['content-type'],
        'accept': req.headers.accept,
        'mcp-session-id': req.headers['mcp-session-id'],
        'x-session-id': req.headers['x-session-id']
      });

      // Log when we start handling
      console.log('[Express] Passing request to transport...');
      
      // Log request body for POST
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          if (body) {
            console.log('[Express] Request body:', body);
          }
        });
      }

      try {
        await transport.handleRequest(req, res);
        console.log('[Express] Transport handled request successfully');
        
        // Check if response was sent
        if (res.headersSent) {
          console.log('[Express] Response was sent');
        } else {
          console.log('[Express] WARNING: Response may not have been sent');
        }
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
      
      // Check transport state after startup
      setTimeout(() => {
        console.log('[MCP] Checking transport state...');
        console.log('[MCP] Transport properties:', {
          hasHandleRequest: !!transport.handleRequest,
          hasOnMessage: !!transport.onmessage,
          hasOnError: !!transport.onerror,
          constructor: transport.constructor.name
        });
      }, 2000);
    });

  } catch (error) {
    console.error('[Fatal] Error during startup:', error);
    process.exit(1);
  }
}

startApp().catch(console.error);
