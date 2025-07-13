#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { OpenAICompatibleTransport } from './openai-compatible-transport.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';
import {
  UNIFIED_SOCRATA_TOOL,
  SEARCH_TOOL,
  DOCUMENT_RETRIEVAL_TOOL,
  socrataToolZodSchema,
  searchToolZodSchema,
  documentRetrievalZodSchema,
  handleSearchTool,
  handleDocumentRetrievalTool
} from './tools/socrata-tools.js';
import { z } from 'zod';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from './utils/mcp-errors.js';

// Workaround: Define schemas locally since they're not properly exported from SDK
const ListPromptsRequestSchema = z.object({
  method: z.literal("prompts/list"),
  params: z.optional(z.object({
    cursor: z.optional(z.string())
  }))
});

const ListResourcesRequestSchema = z.object({
  method: z.literal("resources/list"),
  params: z.optional(z.object({
    cursor: z.optional(z.string())
  }))
});

const ReadResourceRequestSchema = z.object({
  method: z.literal("resources/read"),
  params: z.object({
    uri: z.string()
  })
});

dotenv.config();

async function createServer(transport?: OpenAICompatibleTransport): Promise<Server> {
  console.log('[Server] Creating Server instance...');
  
  const server = new Server(
    { name: 'opengov-mcp-server', version: '0.1.5' },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: { subscribe: false, listChanged: true },
        roots: { listChanged: true },
        sampling: {},
        experimental: {
          elicit: true
        }
      },
      authMethods: []
    }
  );
  
  // Store transport reference on server for initialize handler
  if (transport) {
    (server as any)._customTransport = transport;
  }

  // Wrap setRequestHandler to log all registrations and calls
  const originalSetRequestHandler = server.setRequestHandler.bind(server);
  server.setRequestHandler = function(schema: any, handler: any) {
    console.log('[Server] Registering handler for schema:', schema);
    return originalSetRequestHandler(schema, async (request: any, ...args: any[]) => {
      console.log('[Server] Handler called with request:', JSON.stringify(request, null, 2));
      try {
        const result = await handler(request, ...args);
        console.log('[Server] Handler returned:', JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error('[Server] Handler error:', error);
        throw error;
      }
    });
  };

  // Handle Initialize - OpenAI sends this first
  try {
    const InitializeRequestSchema = z.object({
      method: z.literal('initialize'),
      params: z.object({
        protocolVersion: z.string(),
        capabilities: z.any().optional(),
        clientInfo: z.any().optional()
      })
    });
    
    server.setRequestHandler(InitializeRequestSchema, async (request) => {
      console.log('[Server - Initialize] Request received:', JSON.stringify(request, null, 2));
      const protocolVersion = request.params.protocolVersion || '2025-01-01';
      
      // Try to get session ID from the custom transport
      let sessionId: string | undefined;
      
      if ((server as any)._customTransport) {
        // The transport should have the sessionId available after initialization
        const transport = (server as any)._customTransport;
        console.log('[Server - Initialize] Checking transport for session ID');
        
        // The SDK's StreamableHTTPServerTransport will have sessionId property after initialization
        if ((transport as any).sessionId) {
          sessionId = (transport as any).sessionId;
          console.log('[Server - Initialize] Found sessionId on transport:', sessionId);
        } else {
          // Log available properties for debugging
          console.log('[Server - Initialize] Transport properties:', Object.getOwnPropertyNames(transport));
          console.log('[Server - Initialize] Transport prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(transport)));
          
          // Check parent class properties
          const parentProto = Object.getPrototypeOf(Object.getPrototypeOf(transport));
          if (parentProto) {
            console.log('[Server - Initialize] Parent prototype properties:', Object.getOwnPropertyNames(parentProto));
          }
        }
      }
      
      const response: any = {
        protocolVersion: protocolVersion,
        capabilities: {
          tools: {
            supported: true
          },
          prompts: {
            supported: true
          },
          resources: {
            supported: true,
            listChanged: true
          },
          logging: {},
          experimental: {
            elicit: {
              supported: true
            }
          }
        },
        serverInfo: {
          name: 'opengov-mcp-server',
          version: '0.1.5'
        }
      };
      
      // Add sessionId to response if we have it
      if (sessionId) {
        console.log('[Server - Initialize] Adding sessionId to response body:', sessionId);
        response.sessionId = sessionId;
      } else {
        console.log('[Server - Initialize] No sessionId available to add to response body');
      }
      
      return response;
    });
  } catch (e) {
    console.log('[Server] Could not register initialize handler:', e);
  }

  // Handle ListTools
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    console.log('[Server - ListTools] Request received');
    
    // MCP SPEC COMPLIANCE: Using 'inputSchema' as per latest MCP specification
    const tools = [
      {
        name: 'search',
        description: 'Search NYC Open Data portal and return matching dataset IDs',
        inputSchema: {  // Latest MCP spec uses 'inputSchema'
          type: 'object',
          additionalProperties: false,
          properties: {
            query: {
              type: 'string',
              description: 'Search query for full-text search'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'document_retrieval',
        description: 'Retrieve dataset information from NYC Open Data portal',
        inputSchema: {  // Latest MCP spec uses 'inputSchema'
          type: 'object',
          additionalProperties: false,
          properties: {
            ids: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of document IDs to retrieve'
            }
          },
          required: ['ids']
        }
      },
      {
        name: 'get_data',
        description: 'Query and analyze data from NYC Open Data portal datasets',
        inputSchema: {  // Latest MCP spec uses 'inputSchema'
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['catalog', 'metadata', 'query', 'metrics'],
              description: 'Operation to perform'
            },
            query: {
              type: 'string',
              description: 'General search phrase OR a full SoQL query string. If this is a full SoQL query (e.g., starts with SELECT), other SoQL parameters like select, where, q might be overridden or ignored by the handler in favor of the full SoQL query. If it\'s a search phrase, it will likely be used for a full-text search ($q parameter to Socrata).'
            },
            domain: {
              type: 'string',
              description: 'The Socrata domain (e.g., data.cityofnewyork.us)'
            },
            limit: {
              type: 'string',
              description: 'Number of results to return (e.g., "10", "100"), or "all" to fetch all available data'
            },
            offset: {
              type: 'integer',
              description: 'Offset for pagination'
            },
            select: {
              type: 'string',
              description: 'SoQL SELECT clause'
            },
            where: {
              type: 'string',
              description: 'SoQL WHERE clause'
            },
            order: {
              type: 'string',
              description: 'SoQL ORDER BY clause'
            },
            group: {
              type: 'string',
              description: 'SoQL GROUP BY clause'
            },
            having: {
              type: 'string',
              description: 'SoQL HAVING clause'
            },
            dataset_id: {
              type: 'string',
              description: 'Dataset ID (for metadata, column-info, data-access)'
            },
            q: {
              type: 'string',
              description: 'Full-text search query within the dataset (used in data access)'
            }
          },
          required: ['type']
        }
      }
    ];
    
    console.log('[Server - ListTools] Returning NYC data tools for Claude compatibility');
    console.log(`[Server - ListTools] Tool count: ${tools.length}`);
    
    return { tools };
  });

  // Handle ListPrompts
  server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
    console.log('[Server - ListPrompts] Request received');
    
    const prompts = [
      {
        name: 'analyze_nyc_data',
        title: 'Analyze NYC Open Data',
        description: 'Search and analyze datasets from NYC Open Data portal',
        arguments: [
          {
            name: 'topic',
            description: 'The topic or dataset to analyze (e.g., "crime statistics", "restaurant inspections", "311 complaints")',
            required: true
          },
          {
            name: 'time_period',
            description: 'Time period for the analysis (e.g., "last month", "2023", "past 5 years")',
            required: false
          }
        ]
      },
      {
        name: 'find_dataset',
        title: 'Find NYC Dataset',
        description: 'Help find specific datasets in the NYC Open Data portal',
        arguments: [
          {
            name: 'description',
            description: 'Description of the data you are looking for',
            required: true
          }
        ]
      },
      {
        name: 'compare_neighborhoods',
        title: 'Compare NYC Neighborhoods',
        description: 'Compare data across different NYC neighborhoods or boroughs',
        arguments: [
          {
            name: 'metric',
            description: 'What metric to compare (e.g., "crime rates", "air quality", "noise complaints")',
            required: true
          },
          {
            name: 'neighborhoods',
            description: 'Which neighborhoods or boroughs to compare (comma-separated)',
            required: true
          }
        ]
      }
    ];
    
    console.log(`[Server - ListPrompts] Returning ${prompts.length} prompts`);
    
    return {
      prompts
    };
  });

  // Handle ListResources
  server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
    console.log('[Server - ListResources] Request received');
    
    const resources = [
      {
        uri: 'data://nyc/info/portal-overview',
        name: 'NYC Open Data Portal Overview',
        title: 'NYC Open Data Portal Information',
        description: 'Basic information about NYC Open Data portal and available datasets',
        mimeType: 'text/plain'
      },
      {
        uri: 'data://nyc/info/popular-datasets',
        name: 'Popular NYC Datasets',
        title: 'Most Popular NYC Open Data Datasets',
        description: 'List of the most frequently accessed datasets on NYC Open Data',
        mimeType: 'application/json'
      },
      {
        uri: 'data://nyc/info/api-guide',
        name: 'Socrata API Guide',
        title: 'Quick Guide to Socrata API',
        description: 'Quick reference for using Socrata API with NYC Open Data',
        mimeType: 'text/markdown'
      }
    ];
    
    console.log(`[Server - ListResources] Returning ${resources.length} resources`);
    
    return {
      resources,
      nextCursor: undefined
    };
  });

  // Handle ReadResource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    console.log('[Server - ReadResource] Request received for URI:', request.params.uri);
    
    const resourceContents: Record<string, any> = {
      'data://nyc/info/portal-overview': {
        uri: 'data://nyc/info/portal-overview',
        name: 'NYC Open Data Portal Overview',
        mimeType: 'text/plain',
        text: `NYC Open Data Portal Overview

The NYC Open Data portal (data.cityofnewyork.us) provides access to thousands of datasets from New York City agencies.

Key Information:
- Over 3,000+ datasets available
- Updated regularly by city agencies
- Free to access and use
- Powered by Socrata platform
- Supports various data formats (CSV, JSON, GeoJSON, etc.)

Common Dataset Categories:
- Public Safety (crime data, fire incidents, etc.)
- Transportation (traffic, parking, transit)
- Health (restaurant inspections, health statistics)
- Housing & Development (building permits, violations)
- Environment (air quality, tree census)
- Education (school performance, enrollment)
- Finance (budget, spending)

Access Methods:
- Web interface for browsing and filtering
- Socrata API for programmatic access
- Direct download in multiple formats
- Real-time data feeds for some datasets`
      },
      'data://nyc/info/popular-datasets': {
        uri: 'data://nyc/info/popular-datasets',
        name: 'Popular NYC Datasets',
        mimeType: 'application/json',
        text: JSON.stringify({
          popular_datasets: [
            {
              name: "311 Service Requests",
              id: "erm2-nwe9",
              description: "All 311 Service Requests from 2010 to present",
              category: "Public Services"
            },
            {
              name: "NYC Restaurant Inspection Results",
              id: "43nn-pn8j",
              description: "Restaurant inspection results including letter grades",
              category: "Health"
            },
            {
              name: "Motor Vehicle Collisions - Crashes",
              id: "h9gi-nx95",
              description: "Motor vehicle collision data from NYPD",
              category: "Public Safety"
            },
            {
              name: "DOB Job Application Filings",
              id: "ic3t-wcy2",
              description: "Building permit applications filed with DOB",
              category: "Housing & Development"
            },
            {
              name: "NYPD Complaint Data Current (Year To Date)",
              id: "5uac-w243",
              description: "NYPD complaint data for current year",
              category: "Public Safety"
            }
          ]
        }, null, 2)
      },
      'data://nyc/info/api-guide': {
        uri: 'data://nyc/info/api-guide',
        name: 'Socrata API Guide',
        mimeType: 'text/markdown',
        text: `# Socrata API Quick Guide

## Basic API Structure
\`\`\`
https://data.cityofnewyork.us/resource/{dataset-id}.{format}
\`\`\`

## Common Parameters
- **$limit**: Number of results to return (default: 1000, max: 50000)
- **$offset**: Number of results to skip for pagination
- **$where**: SoQL WHERE clause for filtering
- **$select**: Choose specific columns to return
- **$order**: Sort results by field(s)
- **$q**: Full-text search query

## Example Queries

### Get first 10 records
\`\`\`
/resource/dataset-id.json?$limit=10
\`\`\`

### Filter with WHERE clause
\`\`\`
/resource/dataset-id.json?$where=borough='MANHATTAN' AND year=2023
\`\`\`

### Full-text search
\`\`\`
/resource/dataset-id.json?$q=restaurant
\`\`\`

### Select specific fields
\`\`\`
/resource/dataset-id.json?$select=name,address,grade&$limit=100
\`\`\`

## SoQL Functions
- **upper()**, **lower()**: Change case
- **starts_with()**, **contains()**: String matching
- **within_box()**, **within_circle()**: Geospatial queries
- **date_trunc_y()**, **date_trunc_m()**: Date truncation

## Rate Limits
- No API key required for basic access
- With API key: Higher rate limits available
- Consider using pagination for large datasets`
      }
    };
    
    const content = resourceContents[request.params.uri];
    if (!content) {
      throw new Error(`Resource not found: ${request.params.uri}`);
    }
    
    console.log('[Server - ReadResource] Returning content for:', request.params.uri);
    
    return {
      contents: [content]
    };
  });

  // Handle CallTool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.log('[Server] CallTool request:', JSON.stringify(request, null, 2));
    
    if (!request.params || typeof request.params !== 'object') {
      throw new Error('Invalid params: missing params object');
    }

    const toolName = request.params.name;
    const toolArgs = request.params.arguments;

    // Handle search tool (restored for Claude compatibility)
    if (toolName === 'search') {
      try {
        console.log(`[Server] Calling search tool with args:`, JSON.stringify(toolArgs, null, 2));
        
        const parsed = searchToolZodSchema.parse(toolArgs);
        console.log(`[Server] Parsed search params:`, JSON.stringify(parsed, null, 2));
        
        const result = await handleSearchTool(parsed);
        console.log('[Tool] Search result:', JSON.stringify(result, null, 2));
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false
        };
      } catch (error) {
        console.error('[Tool] Search error:', error);
        if (error instanceof z.ZodError) {
          console.error('[Server] ZodError issues:', JSON.stringify(error.issues, null, 2));
        }
        throw error;
      }
    }
    
    // Handle document retrieval tool
    if (toolName === 'document_retrieval') {
      try {
        console.log(`[Server] Calling document_retrieval tool with args:`, JSON.stringify(toolArgs, null, 2));
        
        const parsed = documentRetrievalZodSchema.parse(toolArgs);
        console.log(`[Server] Parsed document retrieval params:`, JSON.stringify(parsed, null, 2));
        
        const result = await handleDocumentRetrievalTool(parsed);
        console.log('[Tool] Document retrieval result:', JSON.stringify(result, null, 2));
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false
        };
      } catch (error) {
        console.error('[Tool] Document retrieval error:', error);
        if (error instanceof z.ZodError) {
          console.error('[Server] ZodError issues:', JSON.stringify(error.issues, null, 2));
        }
        throw error;
      }
    }
    
    // Handle original get_data tool for backward compatibility
    if (toolName === UNIFIED_SOCRATA_TOOL.name) {
      try {
        console.log(`[Server] Calling tool: ${toolName} with args:`, JSON.stringify(toolArgs, null, 2));
        
        const parsed = socrataToolZodSchema.parse(toolArgs);
        console.log(`[Server] Parsed Socrata params:`, JSON.stringify(parsed, null, 2));
        
        const handler = UNIFIED_SOCRATA_TOOL.handler;
        if (typeof handler !== 'function') {
          throw new Error('Tool handler is not a function');
        }
        
        const result = await handler(parsed);
        console.log('[Tool] Result:', JSON.stringify(result, null, 2));
        
        let responseText: string;
        if (result === null || result === undefined) {
          responseText = String(result);
        } else if (typeof result === 'string') {
          responseText = result;
        } else if (typeof result === 'number' || typeof result === 'boolean') {
          responseText = result.toString();
        } else {
          responseText = JSON.stringify(result, null, 2);
        }
        
        return {
          content: [{ type: 'text', text: responseText }],
          isError: false
        };
      } catch (error) {
        console.error('[Tool] Error:', error);
        if (error instanceof z.ZodError) {
          console.error('[Server] ZodError issues:', JSON.stringify(error.issues, null, 2));
        }
        throw error;
      }
    } else {
      throw new Error(`Method not found: ${toolName}`);
    }
  });

  console.log('[Server] Server instance created and request handlers registered.');
  return server;
}

// Global map to store transports by session ID
const transports: Map<string, { transport: OpenAICompatibleTransport, server: Server, cleanup: () => Promise<void> }> = new Map();

async function startApp() {
  try {
    const app = express();
    const port = Number(process.env.PORT) || 8000;
    
    console.log('[Environment] DATA_PORTAL_URL:', process.env.DATA_PORTAL_URL);
    
    // IMPORTANT: NO express.json() before /mcp route!
    
    // CORS configuration
    app.use(cors({
      origin: true,
      credentials: true,
      exposedHeaders: ['mcp-session-id']
    }));

    const mcpPath = '/mcp';
    
    // Accept-header shim for OpenAI connector - CRITICAL!
    app.use(mcpPath, (req, _res, next) => {
      const h = req.headers.accept ?? '';
      if (!h.includes('text/event-stream')) {
        req.headers.accept = h ? `${h}, text/event-stream` : 'text/event-stream';
      }
      next();
    });

    // Body parser for /mcp route - parse all content types as text to avoid stream consumption issues
    app.use(mcpPath, express.text({ type: '*/*' }));

    // Health check
    app.get('/healthz', (_req, res) => {
      console.log('[Health] /healthz hit');
      res.sendStatus(200);
    });

    // Root endpoint
    app.get('/', (_req, res) => {
      res.send('OpenGov MCP Server running');
    });
    
    // Debug endpoint to test server
    app.get('/debug', async (_req, res) => {
      console.log('[Debug] Testing server state...');
      res.json({
        server: 'running',
        activeSessions: transports.size,
        sessions: Array.from(transports.keys()).filter(k => k !== '__pending__'),
        environment: {
          DATA_PORTAL_URL: process.env.DATA_PORTAL_URL
        }
      });
    });

    // Remove old global transport creation - we'll create per-session instead
    // Helper function to create and setup a new transport/server pair
    async function createTransportAndServer(sessionId?: string) {
      console.log('[MCP] Creating new transport/server pair', sessionId ? `for session ${sessionId}` : 'for initialization');
      
      const transport = new OpenAICompatibleTransport({
        sessionIdGenerator: () => {
          const newSessionId = crypto.randomBytes(16).toString('hex');
          console.log('[Transport] sessionIdGenerator called! Generated:', newSessionId);
          return newSessionId;
        },
        // Pass callbacks in constructor options
        onsessioninitialized: (initializedSessionId: string) => {
          console.log('[Transport] onsessioninitialized fired! Session:', initializedSessionId);
          // Store the transport in our map when session is initialized
          if (!transports.has(initializedSessionId)) {
            console.log('[Transport] Storing transport for session:', initializedSessionId);
            // Transport and server are already created, just need to store the reference
            const entry = transports.get('__pending__');
            if (entry) {
              transports.delete('__pending__');
              transports.set(initializedSessionId, entry);
            }
          }
        },
        onsessionclosed: (closedSessionId: string) => {
          console.log('[Transport] onsessionclosed fired! Session:', closedSessionId);
          // Clean up transport from map
          if (transports.has(closedSessionId)) {
            console.log('[Transport] Removing transport for closed session:', closedSessionId);
            const entry = transports.get(closedSessionId);
            if (entry) {
              entry.cleanup().catch(err => console.error('[Transport] Error during cleanup:', err));
            }
            transports.delete(closedSessionId);
          }
        }
      });
      
      // Setup transport event handlers
      transport.onmessage = (message: any, extra?: any) => {
        console.log('[Transport] onmessage fired!', JSON.stringify(message, null, 2));
        if (extra) {
          console.log('[Transport] onmessage extra:', JSON.stringify(extra, null, 2));
        }
      };

      transport.onerror = (error: any) => {
        console.error('[Transport] onerror fired! Error:', error);
      };

      transport.onclose = () => {
        console.log('[Transport] onclose fired!');
      };
      
      // Wrap handleRequest to see what's happening
      const originalHandleRequest = transport.handleRequest.bind(transport);
      transport.handleRequest = async (req: any, res: any) => {
        console.log('[Transport.handleRequest] Called');
        console.log('[Transport.handleRequest] Method:', req.method);
        console.log('[Transport.handleRequest] URL:', req.url);
        console.log('[Transport.handleRequest] Session ID:', (transport as any).sessionId);
        console.log('[Transport.handleRequest] Transport internal state:', {
          hasServer: !!(transport as any)._server,
          hasSession: !!(transport as any)._session,
          serverInfo: (transport as any)._server ? {
            name: (transport as any)._server.name,
            connected: true
          } : null
        });
        
        try {
          // The SDK's handleRequest actually accepts a third parameter for parsed body
          const body = (req as any).body;
          const result = await (originalHandleRequest as any)(req, res, body);
          console.log('[Transport.handleRequest] Completed, result:', result);
          return result;
        } catch (error) {
          console.error('[Transport.handleRequest] Error:', error);
          throw error;
        }
      };
      
      // Create server (passing transport so initialize handler can access session ID)
      const server = await createServer(transport);
      
      // Connect server to transport
      console.log('[MCP] Connecting server to transport...');
      await server.connect(transport);
      console.log('[MCP] Server connected');
      
      // Create cleanup function
      const cleanup = async () => {
        console.log('[Cleanup] Cleaning up transport and server');
        try {
          if ('close' in server && typeof (server as any).close === 'function') {
            await (server as any).close();
          }
          await transport.close();
        } catch (error) {
          console.error('[Cleanup] Error during cleanup:', error);
        }
      };
      
      return { transport, server, cleanup };
    }

    // Track response timestamps by session for timing analysis
    const lastResponseTimestamps: Map<string, { method: string, timestamp: number }> = new Map();
    
    // MCP endpoint
    app.all(mcpPath, async (req, res) => {
      // Track request timing
      const requestStartTime = Date.now();
      const sessionId = req.headers['mcp-session-id'] as string;
      
      // Log timing between requests
      if (sessionId && lastResponseTimestamps.has(sessionId)) {
        const lastResponse = lastResponseTimestamps.get(sessionId)!;
        const timeSinceLastResponse = requestStartTime - lastResponse.timestamp;
        console.log(`[Express] Time since last ${lastResponse.method} response: ${timeSinceLastResponse}ms`);
        
        // Special logging for DELETE after tools/list
        if (req.method === 'DELETE' && lastResponse.method === 'tools/list') {
          console.log(`[Express] ⚠️  DELETE request received ${timeSinceLastResponse}ms after tools/list response`);
        }
      }
      
      console.log(`[Express] ${req.method} ${req.url}`);
      console.log('[Express] Request timestamp:', new Date().toISOString());
      console.log('[Express] Headers:', {
        'accept': req.headers.accept,
        'content-type': req.headers['content-type'],
        'mcp-session-id': req.headers['mcp-session-id'],
        'mcp-protocol-version': req.headers['mcp-protocol-version'],
        'x-session-id': req.headers['x-session-id'],
        'user-agent': req.headers['user-agent']
      });
      
      // Log all MCP-related headers
      const mcpHeaders = Object.entries(req.headers)
        .filter(([key]) => key.toLowerCase().startsWith('mcp-'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      if (Object.keys(mcpHeaders).length > 0) {
        console.log('[Express] All MCP headers:', mcpHeaders);
      }
      
      // Track current request body for response interceptors
      let currentRequestBody: any = null;
      let protocolVersion: string | undefined = undefined;
      
      // For POST requests, log parsed body (now available via Express body parser)
      if (req.method === 'POST' && req.body) {
        console.log('[Express] Request body:', req.body);
        currentRequestBody = req.body;
        
        // Check if this is an initialize request without a session ID
        try {
          const parsed = JSON.parse(req.body);
          if (parsed.method === 'initialize') {
            protocolVersion = parsed.params?.protocolVersion;
            console.log('[Express] Initialize request detected:');
            console.log('  - Protocol version:', protocolVersion);
            console.log('  - Has session ID:', !!req.headers['mcp-session-id']);
            console.log('  - Client:', parsed.params?.clientInfo?.name);
            if (!req.headers['mcp-session-id']) {
              console.log('[Express] Initialize request without session ID detected - this is expected for first request');
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Determine which transport to use
      let transportEntry: { transport: OpenAICompatibleTransport, server: Server, cleanup: () => Promise<void> } | undefined;
      let existingSessionId = req.headers['mcp-session-id'] as string | undefined;
      
      // Check if this is an initialization request
      let isInitializeRequest = false;
      if (req.method === 'POST' && currentRequestBody) {
        try {
          const parsed = JSON.parse(currentRequestBody);
          isInitializeRequest = parsed.method === 'initialize';
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      if (existingSessionId && transports.has(existingSessionId)) {
        // Use existing transport for this session
        transportEntry = transports.get(existingSessionId);
        console.log('[Express] Using existing transport for session:', existingSessionId);
      } else if (!existingSessionId && isInitializeRequest) {
        // Create new transport for initialization request
        console.log('[Express] Creating new transport for initialization request');
        transportEntry = await createTransportAndServer();
        // Temporarily store with pending key until session ID is assigned
        transports.set('__pending__', transportEntry);
      } else {
        // No valid session and not an initialization request
        console.error('[Express] No valid session ID and not an initialization request');
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null
        });
        return;
      }
      
      if (!transportEntry) {
        console.error('[Express] Failed to get or create transport!');
        res.status(503).send('Service Unavailable');
        return;
      }
      
      const transport = transportEntry.transport;
      
      // Log response events
      const originalEnd = res.end;
      const originalWrite = res.write;
      const originalSetHeader = res.setHeader;
      const originalJson = res.json;
      
      // Helper function to ensure proper SSE formatting
      const formatSSEMessage = (data: string): string => {
        // Ensure proper SSE format with double newline at the end
        if (!data.endsWith('\n\n')) {
          if (!data.endsWith('\n')) {
            return data + '\n\n';
          }
          return data + '\n';
        }
        return data;
      };
      
      // Track if we're writing an initialize response
      let isInitializeResponse = false;
      
      res.setHeader = function(name: string, value: any) {
        console.log(`[Express] Response.setHeader: ${name} = ${value}`);
        
        // If setting up SSE, add keep-alive
        if (name.toLowerCase() === 'content-type' && value === 'text/event-stream') {
          console.log('[Express] SSE stream detected, setting up keep-alive');
          
          // Send a comment every 30 seconds to keep the connection alive
          const keepAliveInterval = setInterval(() => {
            try {
              res.write(': keep-alive\n\n');
              console.log('[Express] Sent SSE keep-alive comment');
            } catch (err) {
              console.error('[Express] Failed to send keep-alive:', err);
              clearInterval(keepAliveInterval);
            }
          }, 30000);
          
          // Clean up interval when response ends
          const cleanup = () => {
            if (keepAliveInterval) {
              clearInterval(keepAliveInterval);
              console.log('[Express] Cleaned up SSE keep-alive interval');
            }
          };
          
          res.on('close', cleanup);
          res.on('finish', cleanup);
          res.on('error', cleanup);
        }
        
        return originalSetHeader.call(this, name, value);
      };
      
      res.json = function(data: any) {
        console.log('[Express] Response.json:', JSON.stringify(data, null, 2));
        
        // If this is an initialize response, ensure we're sending the session ID
        if (data && data.result && !data.error) {
          const sessionId = res.getHeader('mcp-session-id');
          if (sessionId) {
            console.log('[Express] Initialize response includes session ID in header:', sessionId);
          }
        }
        
        return originalJson.call(this, data);
      };
      
      res.write = function(chunk: any, encoding?: any, callback?: any) {
        console.log('[Express] Response.write called, data length:', chunk ? chunk.length : 0);
        
        // Enhanced logging with response metadata
        console.log('[Express] Response metadata:', {
          timestamp: new Date().toISOString(),
          sessionId: res.getHeader('mcp-session-id'),
          contentType: res.getHeader('Content-Type'),
          method: currentRequestBody ? (typeof currentRequestBody === 'string' ? JSON.parse(currentRequestBody).method : currentRequestBody.method) : 'unknown'
        });
        
        if (chunk) {
          const chunkStr = chunk.toString();
          
          // Log raw data with increased limit (2000 bytes)
          if (chunk.length < 2000) {
            console.log('[Express] Response.write data:', chunkStr);
          } else {
            console.log('[Express] Response.write data (truncated):', chunkStr.substring(0, 2000) + '... [TRUNCATED]');
          }
          
          // Parse SSE data for structured logging
          if (chunkStr.includes('event:') && chunkStr.includes('data:')) {
            try {
              const dataMatch = chunkStr.match(/data:\s*(.+?)(?:\n\n|$)/s);
              if (dataMatch) {
                const jsonData = JSON.parse(dataMatch[1]);
                console.log('[Express] SSE JSON payload:', JSON.stringify(jsonData, null, 2));
                
                // Log specific information based on response type
                if (jsonData.result && jsonData.result.tools) {
                  console.log('[Express] Tools count:', jsonData.result.tools.length);
                  jsonData.result.tools.forEach((tool: any, index: number) => {
                    console.log(`[Express] Tool[${index}]:`, {
                      name: tool.name,
                      hasInputSchema: !!tool.inputSchema,
                      hasRequired: !!(tool.inputSchema && tool.inputSchema.required),
                      requiredCount: tool.inputSchema?.required?.length || 0
                    });
                  });
                }
              }
            } catch (e) {
              console.log('[Express] Failed to parse SSE JSON:', e instanceof Error ? e.message : String(e));
            }
          }
          
          // Detect initialize response
          if (currentRequestBody) {
            try {
              const parsed = JSON.parse(currentRequestBody);
              if (parsed.method === 'initialize' && chunkStr.includes('"result":') && chunkStr.includes('"protocolVersion":')) {
                isInitializeResponse = true;
                console.log('[Express] Detected initialize response');
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
        
        // For SSE responses, ensure proper formatting
        if (res.getHeader('Content-Type') === 'text/event-stream' && typeof chunk === 'string') {
          chunk = formatSSEMessage(chunk);
        }
        
        if (typeof encoding === 'function') {
          callback = encoding;
          encoding = undefined;
        }
        
        // Call original write and ensure data is flushed for SSE
        const result = originalWrite.call(this, chunk, encoding, callback);
        
        // Force flush for SSE to ensure Claude receives data immediately
        if (res.getHeader('Content-Type') === 'text/event-stream' && (res as any).flush) {
          (res as any).flush();
        }
        
        return result;
      };
      
      res.end = function(chunk?: any, encoding?: any, callback?: any) {
        console.log('[Express] Response.end called');
        if (chunk) {
          const preview = typeof chunk === 'string' ? chunk.substring(0, 500) : 
                          Buffer.isBuffer(chunk) ? chunk.toString().substring(0, 500) : 
                          'non-string data';
          console.log('[Express] Response.end data:', preview);
        }
        
        // Removed extra roots.listChanged event - not part of MCP spec and causes issues with OpenAI
        
        if (typeof chunk === 'function') {
          callback = chunk;
          chunk = undefined;
          encoding = undefined;
        } else if (typeof encoding === 'function') {
          callback = encoding;
          encoding = undefined;
        }
        
        // For SSE responses, add a small delay to ensure all data is transmitted
        if (res.getHeader('Content-Type') === 'text/event-stream') {
          // Flush any pending data first
          if ((res as any).flush) {
            (res as any).flush();
          }
          
          // Add a small delay before ending the response
          setTimeout(() => {
            originalEnd.call(this, chunk, encoding, callback);
          }, 10); // 10ms delay
          
          return this; // Return the response object for chaining
        }
        
        return originalEnd.call(this, chunk, encoding, callback);
      };
      
      try {
        console.log('[Express] Calling transport.handleRequest...');
        await transport.handleRequest(req, res);
        console.log('[Express] transport.handleRequest returned');
        console.log('[Express] Response headersSent:', res.headersSent);
        console.log('[Express] Response finished:', res.finished);
        
        // Handle DELETE request cleanup
        if (req.method === 'DELETE' && existingSessionId) {
          console.log('[Express] DELETE request processed, checking if session should be cleaned up');
          // The transport's onsessionclosed callback will handle cleanup
          // We just need to ensure it happens
        }
        
        // Log request completion timing and track for timing analysis
        const requestDuration = Date.now() - requestStartTime;
        console.log('[Express] Request completed in', requestDuration, 'ms');
        
        // Track response timestamp for timing analysis
        const currentSessionId = existingSessionId || (transport as any).sessionId;
        if (currentSessionId && currentRequestBody) {
          try {
            const parsed = typeof currentRequestBody === 'string' ? JSON.parse(currentRequestBody) : currentRequestBody;
            if (parsed.method) {
              lastResponseTimestamps.set(sessionId, {
                method: parsed.method,
                timestamp: Date.now()
              });
              console.log(`[Express] Recorded response timestamp for ${parsed.method}`);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      } catch (error) {
        console.error('[Express] Error handling request:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
        
        // Log error timing
        const requestDuration = Date.now() - requestStartTime;
        console.log('[Express] Request failed after', requestDuration, 'ms');
      }
    });

    // Start server
    const httpServer = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`   Health: http://localhost:${port}/healthz`);
      console.log(`   MCP: http://localhost:${port}/mcp`);
      console.log(`   Debug: http://localhost:${port}/debug`);
      console.log('[Startup] Transports map ready');
      console.log('[Startup] Active sessions:', transports.size);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} signal received: closing resources.`);
      
      // Close all active transports
      console.log(`Closing ${transports.size} active transports...`);
      for (const [sessionId, entry] of transports) {
        if (sessionId !== '__pending__') {
          console.log(`Closing transport for session ${sessionId}...`);
          await entry.cleanup().catch((e: any) => console.error(`Error closing session ${sessionId}:`, e));
        }
      }
      transports.clear();
      
      httpServer.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('[Fatal] Error during startup:', error);
    
    // Clean up any transports that were created
    for (const [sessionId, entry] of transports) {
      if (sessionId !== '__pending__') {
        await entry.cleanup().catch((e: any) => console.error(`Error closing session ${sessionId} during fatal error:`, e));
      }
    }
    transports.clear();
    
    process.exit(1);
  }
}

startApp().catch(console.error);
