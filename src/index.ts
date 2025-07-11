#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express from 'express';
import dotenv from 'dotenv';
import {
  UNIFIED_SOCRATA_TOOL,
  socrataToolZodSchema,
} from './tools/socrata-tools.js';

dotenv.config();

async function main() {
  const app = express();
  const port = Number(process.env.PORT) || 8000;
  
  // Basic endpoints
  app.get('/healthz', (_, res) => res.sendStatus(200));
  app.get('/', (_, res) => res.send('MCP Server Running'));
  
  // Create MCP server
  const server = new McpServer(
    { name: 'opengov-mcp-server', version: '0.1.1' },
    { capabilities: { tools: {} } }
  );
  
  // Register tool
  server.tool(
    UNIFIED_SOCRATA_TOOL.name,
    UNIFIED_SOCRATA_TOOL.description,
    UNIFIED_SOCRATA_TOOL.parameters,
    async (params) => {
      const parsed = socrataToolZodSchema.parse(params);
      const result = await UNIFIED_SOCRATA_TOOL.handler!(parsed);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );
  
  // Simple HTTP transport handler
  const sessions = new Map<string, any>();
  
  app.post('/mcp', express.text({ type: '*/*' }), async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string || 
                       'session-' + Date.now();
      
      console.log(`[MCP] Request: ${req.method} Session: ${sessionId}`);
      console.log(`[MCP] Body:`, req.body);
      
      // Parse JSON-RPC request
      const request = JSON.parse(req.body);
      
      // Handle initialize specially
      if (request.method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '0.1.0',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'opengov-mcp-server',
              version: '0.1.1'
            }
          }
        };
        
        res.setHeader('mcp-session-id', sessionId);
        res.json(response);
        sessions.set(sessionId, { initialized: true });
        return;
      }
      
      // For other requests, check session
      if (!sessions.has(sessionId)) {
        res.status(400).json({
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32000, message: 'Server not initialized' }
        });
        return;
      }
      
      // Delegate to MCP server
      // This is a simplified approach - in production you'd properly integrate
      // with the MCP server's request handling
      
      if (request.method === 'tools/list') {
        res.json({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [{
              name: UNIFIED_SOCRATA_TOOL.name,
              description: UNIFIED_SOCRATA_TOOL.description,
              inputSchema: UNIFIED_SOCRATA_TOOL.parameters
            }]
          }
        });
      } else if (request.method === 'tools/call') {
        try {
          const parsed = socrataToolZodSchema.parse(request.params.arguments);
          const result = await UNIFIED_SOCRATA_TOOL.handler!(parsed);
          res.json({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            }
          });
        } catch (error) {
          res.json({
            jsonrpc: '2.0',
            id: request.id,
            error: { 
              code: -32602, 
              message: error instanceof Error ? error.message : 'Invalid params' 
            }
          });
        }
      } else {
        res.json({
          jsonrpc: '2.0',
          id: request.id,
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
  
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

main().catch(console.error);
