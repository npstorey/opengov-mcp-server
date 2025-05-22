import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';
import { EventSource } from 'eventsource';
import type { Server as HttpServer } from 'node:http';

describe('MCP Protocol Sequence', () => {
  let app: Express;
  let server: HttpServer;
  let eventSource: EventSource;
  const PORT = 8001;
  const BASE_URL = `http://localhost:${PORT}`;
  const SSE_PATH = '/mcp/sse';
  const MESSAGES_PATH = '/mcp/messages';
  let sessionId: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Set up the MCP server routes similar to index.ts
    const transports: Record<string, StreamableHTTPServerTransport> = {};

    app.get(SSE_PATH, async (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const mcpServer = new McpServer(
        {
          name: 'test-mcp-server',
          version: '0.1.1',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      mcpServer.tool(
        'ping',
        'p',
        {},
        async () => ({ content: [{ type: 'text', text: 'pong_minimal' }] })
      );

      const transport = new StreamableHTTPServerTransport(MESSAGES_PATH, res);
      sessionId = transport.sessionId;
      transports[sessionId] = transport;

      try {
        await mcpServer.connect(transport);
      } catch (_error) {
        if (!res.headersSent) {
          res.status(500).send('Failed to establish MCP connection');
        }
        delete transports[sessionId];
        return;
      }

      req.on('close', () => {
        delete transports[sessionId];
      });
    });

    app.post(MESSAGES_PATH, (req, res) => {
      const reqSessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
      if (!reqSessionId) {
        res.status(400).send('Missing sessionId');
        return;
      }

      const transport = transports[reqSessionId];
      if (!transport) {
        res.status(404).send('Invalid sessionId');
        return;
      }

      try {
        transport.handlePostMessage(req, res, req.body);
      } catch (_e) {
        if (!res.headersSent) {
          res.status(500).send('Error processing message');
        }
      }
    });

    server = app.listen(PORT);
  });

  afterEach(() => {
    if (eventSource) {
      eventSource.close();
    }
    if (server) {
      server.close();
    }
  });

  it('should successfully complete the full MCP protocol sequence', async () => {
    // Step 1: Establish SSE connection
    eventSource = new EventSource(`${BASE_URL}${SSE_PATH}`);
    
    // Wait for connection to be established
    await new Promise<void>((resolve) => {
      eventSource.onopen = () => resolve();
    });

    // Step 2: Send initialize request
    const initializeResponse = await request(app)
      .post(`${MESSAGES_PATH}?sessionId=${sessionId}`)
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          capabilities: {
            tools: {}
          }
        },
        id: 1
      });

    expect(initializeResponse.status).toBe(200);
    expect(initializeResponse.body.result).toBeDefined();

    // Step 3: Wait for notifications/initialized
    await new Promise<void>((resolve) => {
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.method === 'notifications/initialized') {
          resolve();
        }
      };
    });

    // Step 4: Send tools/list request
    const listToolsResponse = await request(app)
      .post(`${MESSAGES_PATH}?sessionId=${sessionId}`)
      .send({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 2
      });

    expect(listToolsResponse.status).toBe(200);
    expect(listToolsResponse.body.result.tools).toContainEqual({
      name: 'ping',
      description: 'p'
    });

    // Step 5: Send tool/call request for ping
    const toolCallResponse = await request(app)
      .post(`${MESSAGES_PATH}?sessionId=${sessionId}`)
      .send({
        jsonrpc: '2.0',
        method: 'tool/call',
        params: {
          name: 'ping',
          parameters: {}
        },
        id: 3
      });

    expect(toolCallResponse.status).toBe(200);
    expect(toolCallResponse.body.result.content).toEqual([
      { type: 'text', text: 'pong_minimal' }
    ]);
  });
}); 