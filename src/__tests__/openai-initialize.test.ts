import { describe, test, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { OpenAICompatibleTransport } from '../openai-compatible-transport.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

describe('OpenAI Initialize Request', () => {
  let app: express.Application;
  let transport: OpenAICompatibleTransport;
  let server: Server;

  beforeEach(async () => {
    app = express();
    
    // Add CORS
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
      res.header('Access-Control-Expose-Headers', 'mcp-session-id');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });

    // Accept-header shim
    app.use('/mcp', (req, _res, next) => {
      const h = req.headers.accept ?? '';
      if (!h.includes('text/event-stream')) {
        req.headers.accept = h ? `${h}, text/event-stream` : 'text/event-stream';
      }
      next();
    });

    // Body parser for /mcp route
    app.use('/mcp', express.text({ type: '*/*' }));

    // Create transport and server
    transport = new OpenAICompatibleTransport({
      sessionIdGenerator: () => {
        return crypto.randomBytes(16).toString('hex');
      }
    });
    server = new Server(
      { name: 'test-server', version: '1.0.0' },
      {
        capabilities: {
          tools: {},
          prompts: {},
          roots: { listChanged: true },
          sampling: {}
        },
        authMethods: []
      }
    );

    // Add handlers
    const InitializeRequestSchema = z.object({
      method: z.literal('initialize'),
      params: z.object({
        protocolVersion: z.string(),
        capabilities: z.any().optional(),
        clientInfo: z.any().optional()
      })
    });
    
    server.setRequestHandler(InitializeRequestSchema, async (request) => {
      const protocolVersion = request.params.protocolVersion || '2025-01-01';
      return {
        protocolVersion: protocolVersion,
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'test-server',
          version: '1.0.0'
        }
      };
    });

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: [] };
    });

    // Connect server to transport
    await server.connect(transport);

    // MCP endpoint
    app.all('/mcp', async (req, res) => {
      try {
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error('Transport error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });
  });

  test('should handle initialize request without session ID', async () => {
    const initializeRequest = {
      jsonrpc: "2.0",
      method: "initialize",
      id: 1,
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { 
          name: "openai-mcp", 
          version: "1.0.0" 
        }
      }
    };

    const response = await request(app)
      .post('/mcp')
      .send(JSON.stringify(initializeRequest))
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream');

    // Should succeed
    expect(response.status).toBe(200);
    
    // Should have session ID in header
    expect(response.headers['mcp-session-id']).toBeDefined();
    expect(response.headers['mcp-session-id']).toMatch(/^[a-f0-9]{32}$/);
    
    // Should return proper initialize response
    expect(response.body).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "test-server",
          version: "1.0.0"
        }
      }
    });
  });

  test('should reject non-initialize requests without session ID', async () => {
    const listToolsRequest = {
      jsonrpc: "2.0",
      method: "tools/list",
      id: 2
    };

    const response = await request(app)
      .post('/mcp')
      .send(JSON.stringify(listToolsRequest))
      .set('Content-Type', 'application/json');

    // Should fail due to missing session ID
    expect(response.status).toBe(400);
  });

  test('should handle requests with existing session ID', async () => {
    // First, initialize to get a session ID
    const initializeRequest = {
      jsonrpc: "2.0",
      method: "initialize", 
      id: 1,
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test" }
      }
    };

    const initResponse = await request(app)
      .post('/mcp')
      .send(JSON.stringify(initializeRequest))
      .set('Content-Type', 'application/json');

    const sessionId = initResponse.headers['mcp-session-id'];
    expect(sessionId).toBeDefined();

    // Now make a request with the session ID
    const listToolsRequest = {
      jsonrpc: "2.0",
      method: "tools/list",
      id: 2
    };

    const response = await request(app)
      .post('/mcp')
      .send(JSON.stringify(listToolsRequest))
      .set('Content-Type', 'application/json')
      .set('mcp-session-id', sessionId);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      jsonrpc: "2.0",
      id: 2,
      result: {
        tools: []
      }
    });
  });

  test('should handle OpenAI initialize without readableEnded error', async () => {
    const initializeRequest = {
      jsonrpc: "2.0",
      method: "initialize",
      id: 1,
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "openai-mcp", version: "1.0.0" }
      }
    };

    const response = await request(app)
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(initializeRequest));

    // Should not get internal server error (readableEnded error would return 500)
    expect(response.status).toBe(200);
    
    // Should have session ID in header
    expect(response.headers['mcp-session-id']).toBeDefined();
    expect(response.headers['mcp-session-id']).toMatch(/^[a-f0-9]{32}$/);
    
    // Content-type should be SSE stream
    expect(response.headers['content-type']).toBe('text/event-stream');
    
    // No error in response (the readableEnded error is fixed)
    expect(response.text).not.toContain('Cannot set property readableEnded');
    expect(response.text).not.toContain('Internal server error');
  });

  test('should handle full OpenAI sequence: initialize → notifications/initialized → GET', async () => {
    // Step 1: Send initialize request
    const initializeRequest = {
      jsonrpc: "2.0",
      method: "initialize",
      id: 1,
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "openai-mcp", version: "1.0.0" }
      }
    };

    const initResponse = await request(app)
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(initializeRequest));

    expect(initResponse.status).toBe(200);
    const sessionId = initResponse.headers['mcp-session-id'];
    expect(sessionId).toBeDefined();
    expect(sessionId).toMatch(/^[a-f0-9]{32}$/);
    
    // Step 2: Send notifications/initialized
    const notificationsRequest = {
      method: "notifications/initialized",
      jsonrpc: "2.0"
    };

    const notifResponse = await request(app)
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .set('mcp-session-id', sessionId)
      .send(JSON.stringify(notificationsRequest));

    // Should not get stream error
    expect(notifResponse.status).toBe(200);
    expect(notifResponse.text).not.toContain('stream is not readable');
    expect(notifResponse.text).not.toContain('Parse error');
    
    // Step 3: Send GET request for SSE stream
    const getResponse = await request(app)
      .get('/mcp')
      .set('Accept', 'text/event-stream')
      .set('mcp-session-id', sessionId);

    expect(getResponse.status).toBe(200);
    expect(getResponse.headers['content-type']).toBe('text/event-stream');
  });
});