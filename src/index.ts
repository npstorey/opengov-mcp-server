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

  // Session management with SSE connections
  interface Session {
    initialized: boolean;
    protocolVersion: string;
    sseResponse?: express.Response;
  }
  
  const sessions = new Map<string, Session>();

  // Helper function to send SSE message
  function sendSSE(res: express.Response, data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    res.write(message);
  }

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
          
          const session = sessions.get(sessionId)!;
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
          
          console.log('[MCP] Sending tools list response:', JSON.stringify(toolsResponse, null, 2));
          
          // If SSE connection exists, send through SSE
          if (session.sseResponse) {
            console.log('[MCP] Sending response through SSE');
            sendSSE(session.sseResponse, toolsResponse);
            // Send empty 204 response to the POST request
            res.status(204).end();
          } else {
            // Otherwise send as regular response
            console.log('[MCP] Sending response through HTTP');
            res.json(toolsResponse);
          }
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
          
          const callSession = sessions.get(sessionId)!;
          
          try {
            const parsed = socrataToolZodSchema.parse(body.params.arguments);
            const handler = UNIFIED_SOCRATA_TOOL.handler;
            if (typeof handler !== 'function') {
              throw new Error('Tool handler is not a function');
            }
            const result = await handler(parsed);
            
            const callResponse = {
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
              }
            };
            
            // If SSE connection exists, send through SSE
            if (callSession.sseResponse) {
              console.log('[MCP] Sending tool response through SSE');
              sendSSE(callSession.sseResponse, callResponse);
              res.status(204).end();
            } else {
              res.json(callResponse);
            }
            console.log('[MCP] Tool executed successfully');
          } catch (error) {
            console.error('[MCP] Tool error:', error);
            const errorResponse = {
              jsonrpc: '2.0',
              id: body.id,
              error: { 
                code: -32602, 
                message: error instanceof Error ? error.message : 'Invalid params' 
              }
            };
            
            if (callSession.sseResponse) {
              sendSSE(callSession.sseResponse, errorResponse);
              res.status(204).end();
            } else {
              res.json(errorResponse);
            }
          }
          break;

        default:
          // Check if it's a notification (no id field)
          if (!body.id && body.method?.startsWith('notifications/')) {
            console.log('[MCP] Notification received:', body.method);
            // Notifications don't get responses
            res.status(204).end();
          } else {
            console.log('[MCP] Unknown method:', body.method);
            const errorResponse = {
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32601, message: 'Method not found' }
            };
            
            const unknownSession = sessionId ? sessions.get(sessionId) : null;
            if (unknownSession?.sseResponse) {
              sendSSE(unknownSession.sseResponse, errorResponse);
              res.status(204).end();
            } else {
              res.json(errorResponse);
            }
          }
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

    const session = sessions.get(sessionId)!;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    // Store the SSE response in the session
    session.sseResponse = res;

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
      // Remove SSE response from session but keep the session
      if (sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        delete session.sseResponse;
      }
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
