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
  const MCP_PATH = '/mcp';
  let sessionId: string;

  beforeEach(async () => {
    app = express();

    // Set up the MCP server routes similar to index.ts using Streamable HTTP
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

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => `s-${Math.random().toString(16).slice(2)}`,
      onsessioninitialized: (id: string) => {
        sessionId = id;
      },
    });

    await mcpServer.connect(transport);

    app.all(MCP_PATH, (req, res) => {
      transport.handleRequest(req, res).catch(() => {
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
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

  it.skip('should successfully complete the full MCP protocol sequence', async () => {
    // Step 1: Send initialize request
    const initializeResponse = await request(app)
      .post(MCP_PATH)
      .set('Accept', 'application/json, text/event-stream')
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-01-01',
          capabilities: {
            tools: {}
          }
        },
        id: 1
      });

    expect(initializeResponse.status).toBe(200);
    expect(initializeResponse.body.result).toBeDefined();
    sessionId = initializeResponse.headers['mcp-session-id'];

    // Step 2: Establish SSE connection
    eventSource = new EventSource(`${BASE_URL}${MCP_PATH}`, {
      headers: { 'Mcp-Session-Id': sessionId }
    } as any);

    // Wait for connection to be established
    await new Promise<void>((resolve) => {
      eventSource.onopen = () => resolve();
    });

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
      .post(MCP_PATH)
      .set('Accept', 'application/json, text/event-stream')
      .set('Mcp-Session-Id', sessionId)
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
      .post(MCP_PATH)
      .set('Accept', 'application/json, text/event-stream')
      .set('Mcp-Session-Id', sessionId)
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