#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { UNIFIED_SOCRATA_TOOL, socrataToolZodSchema } from './tools/socrata-tools.js';

dotenv.config();

async function startApp() {
  const app = express();
  const port = Number(process.env.PORT) || 8000;

  // CORS configuration
  app.use(cors({
    origin: true,
    credentials: true,
    exposedHeaders: ['mcp-session-id', 'x-session-id']
  }));

  // Health check
  app.get('/healthz', (_, res) => {
    console.log('[Health] /healthz hit');
    res.sendStatus(200);
  });

  // Root endpoint
  app.get('/', (_, res) => {
    res.send('OpenGov MCP Server running');
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
  console.log('[MCP] Registering tool...');
  const toolName = UNIFIED_SOCRATA_TOOL.name || 'get_data';
  const toolDescription = UNIFIED_SOCRATA_TOOL.description || 'A unified tool to interact with Socrata open-data portals.';
  const toolParameters = UNIFIED_SOCRATA_TOOL.parameters || {};
  
  mcpServer.tool(
    toolName,
    toolDescription,
    toolParameters,
    async (args: any) => {
      console.log('[Tool] Called with args:', args);
      try {
        const parsed = socrataToolZodSchema.parse(args);
        const handler = UNIFIED_SOCRATA_TOOL.handler;
        if (typeof handler !== 'function') {
          throw new Error('Tool handler is not a function');
        }
        const result = await handler(parsed);
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

  // Manual MCP protocol handler
  const sessions = new Map<string, any>();

  app.post('/mcp', express.text({ type: '*/*' }), async (req, res) => {
    console.log('[MCP] POST request, headers:', {
      'content-type': req.headers['content-type'],
      'mcp-session-id': req.headers['mcp-session-id'],
      'x-session-id': req.headers['x-session-id']
    });
    
    try {
      const body = JSON.parse(req.body);
      console.log('[MCP] Request:', JSON.stringify(body, null, 2));

      // Get or create session ID
      let sessionId = req.headers['mcp-session-id'] as string || 
                     req.headers['x-session-id'] as string;
      
      // Handle different methods
      switch (body.method) {
        case 'initialize':
          // Create new session for initialize
          sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2);
          sessions.set(sessionId, { 
            initialized: true,
            protocolVersion: body.params.protocolVersion 
          });
          
          // Mirror back the protocol version they sent
          const initResponse = {
            jsonrpc: '2.0',
            id: body.id,
            result: {
              protocolVersion: body.params.protocolVersion, // Echo their version
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'opengov-mcp-server',
                version: '0.1.1'
              }
            }
          };
          
          // Set both headers that might be expected
          res.setHeader('mcp-session-id', sessionId);
          res.setHeader('x-session-id', sessionId);
          res.json(initResponse);
          console.log('[MCP] Sent initialize response with session:', sessionId);
          console.log('[MCP] Response:', JSON.stringify(initResponse, null, 2));
          break;

        case 'tools/list':
          console.log('[MCP] tools/list request for session:', sessionId);
          if (!sessionId || !sessions.has(sessionId)) {
            console.log('[MCP] Session not found:', sessionId);
            res.status(400).json({
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32000, message: 'Not initialized' }
            });
            return;
          }
          
          const toolsResponse = {
            jsonrpc: '2.0',
            id: body.id,
            result: {
              tools: [{
                name: toolName,
                description: toolDescription,
                inputSchema: toolParameters
              }]
            }
          };
          
          res.json(toolsResponse);
          console.log('[MCP] Sent tools list');
          break;

        case 'tools/call':
          console.log('[MCP] tools/call request for session:', sessionId);
          if (!sessionId || !sessions.has(sessionId)) {
            res.status(400).json({
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32000, message: 'Not initialized' }
            });
            return;
          }
          
          try {
            const parsed = socrataToolZodSchema.parse(body.params.arguments);
            const handler = UNIFIED_SOCRATA_TOOL.handler;
            if (typeof handler !== 'function') {
              throw new Error('Tool handler is not a function');
            }
            const result = await handler(parsed);
            res.json({
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
              }
            });
            console.log('[MCP] Tool executed successfully');
          } catch (error) {
            console.error('[MCP] Tool error:', error);
            res.json({
              jsonrpc: '2.0',
              id: body.id,
              error: { 
                code: -32602, 
                message: error instanceof Error ? error.message : 'Invalid params' 
              }
            });
          }
          break;

        default:
          console.log('[MCP] Unknown method:', body.method);
          res.json({
            jsonrpc: '2.0',
            id: body.id,
            error: { code: -32601, message: 'Method not found' }
          });
      }
    } catch (error) {
      console.error('[MCP] Error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: { 
          code: -32603, 
          message: error instanceof Error ? error.message : 'Internal error' 
        }
      });
    }
  });

  // SSE endpoint for streaming
  app.get('/mcp', (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string || 
                     req.headers['x-session-id'] as string;
    console.log('[MCP] GET request for SSE, session:', sessionId);
    console.log('[MCP] GET headers:', {
      'mcp-session-id': req.headers['mcp-session-id'],
      'x-session-id': req.headers['x-session-id'],
      'accept': req.headers.accept
    });
    
    if (!sessionId || !sessions.has(sessionId)) {
      console.log('[MCP] Invalid session for SSE');
      res.status(400).send('Invalid session');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    console.log('[MCP] SSE connection established for session:', sessionId);

    // Send initial connection event
    res.write(`event: connected\ndata: {"session": "${sessionId}"}\n\n`);

    // Send a keepalive
    const keepalive = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepalive);
      console.log('[MCP] SSE connection closed for session:', sessionId);
      sessions.delete(sessionId);
    });
  });

  // Start server
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`   Health: http://localhost:${port}/healthz`);
    console.log(`   MCP: http://localhost:${port}/mcp`);
  });
}

startApp().catch(console.error);
