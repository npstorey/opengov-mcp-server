import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Request, Response } from 'express';
import crypto from 'crypto';

export class OpenAICompatibleTransport extends StreamableHTTPServerTransport {
  private sessionStore: Map<string, { createdAt: Date; initialized: boolean }> = new Map();
  private connectionSessions: Map<string, string> = new Map(); // connection ID -> session ID

  constructor(options?: any) {
    // Store reference to track current request context
    let currentRequest: Request | null = null;
    
    // Set up session tracking via the SDK's onsessioninitialized callback
    super({
      ...options,
      // Let the SDK generate session IDs
      sessionIdGenerator: options?.sessionIdGenerator || (() => crypto.randomBytes(16).toString('hex')),
      // Track when sessions are initialized
      onsessioninitialized: (sessionId: string) => {
        console.log('[OpenAICompatibleTransport] Session initialized by SDK:', sessionId);
        this.sessionStore.set(sessionId, { createdAt: new Date(), initialized: true });
        
        // Map the connection to this session
        if (currentRequest) {
          const connectionId = this.getConnectionId(currentRequest);
          console.log('[OpenAICompatibleTransport] Mapping connection to session:', connectionId, '→', sessionId);
          this.connectionSessions.set(connectionId, sessionId);
        }
        
        // Call the original callback if provided
        if (options?.onsessioninitialized) {
          options.onsessioninitialized(sessionId);
        }
      },
      // Also handle session closed callback
      onsessionclosed: (sessionId: string) => {
        console.log('[OpenAICompatibleTransport] Session closed:', sessionId);
        this.sessionStore.delete(sessionId);
        
        // Remove connection mapping for this session
        for (const [connId, sessId] of this.connectionSessions.entries()) {
          if (sessId === sessionId) {
            this.connectionSessions.delete(connId);
          }
        }
        
        // Call the original callback if provided
        if (options?.onsessionclosed) {
          options.onsessionclosed(sessionId);
        }
      }
    });
    
    // Store reference to set current request context
    (this as any).setCurrentRequest = (req: Request) => {
      currentRequest = req;
    };
  }

  private getConnectionId(req: Request): string {
    // Use a combination of IP and user-agent as connection identifier
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return `${ip}:${userAgent}`;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    console.log('[OpenAICompatibleTransport] handleRequest called');
    console.log('[OpenAICompatibleTransport] Method:', req.method);
    console.log('[OpenAICompatibleTransport] Headers:', {
      'mcp-session-id': req.headers['mcp-session-id'],
      'content-type': req.headers['content-type'],
      'accept': req.headers.accept
    });

    // Set current request context for onsessioninitialized callback
    (this as any).setCurrentRequest(req);

    const connectionId = this.getConnectionId(req);
    let sessionId = req.headers['mcp-session-id'] as string | undefined;

    // For POST requests, check if we need to inject a session ID
    if (req.method === 'POST' && req.body) {
      console.log('[OpenAICompatibleTransport] POST request with body detected');
      console.log('[OpenAICompatibleTransport] Request body:', req.body);
      
      // Parse the body to check if it's an initialize request
      let parsedBody: any;
      try {
        parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (e) {
        console.error('[OpenAICompatibleTransport] Failed to parse body:', e);
        parsedBody = null;
      }

      const isInitializeRequest = parsedBody && parsedBody.method === 'initialize';

      // If no session ID is provided
      if (!sessionId) {
        if (isInitializeRequest) {
          // For initialize requests, let the SDK generate the session ID
          // We'll capture it in the onsessioninitialized callback
          console.log('[OpenAICompatibleTransport] Initialize request without session ID - SDK will generate one');
        } else {
          // Look up existing session ID for non-initialize requests
          sessionId = this.connectionSessions.get(connectionId);
          if (sessionId) {
            console.log('[OpenAICompatibleTransport] Found existing session ID for connection:', sessionId);
            // Inject the session ID into headers
            req.headers['mcp-session-id'] = sessionId;
          } else {
            console.log('[OpenAICompatibleTransport] No session ID found for connection, request will likely fail');
          }
        }
      } else {
        // Update the connection mapping with the provided session ID
        this.connectionSessions.set(connectionId, sessionId);
      }

      // Create a new readable stream from the parsed body for the parent handler
      const { Readable } = await import('stream');
      const bodyStream = new Readable({
        read() {
          this.push(req.body);
          this.push(null);
        }
      });
      
      // Create a proxy that combines request properties with stream behavior
      const streamProxy = new Proxy(req, {
        get(target, prop) {
          // For stream-specific methods, use bodyStream
          if (prop === 'on' || prop === 'once' || prop === 'emit' || prop === 'addListener' || prop === 'removeListener') {
            return bodyStream[prop].bind(bodyStream);
          }
          // For stream state properties, return bodyStream's values
          if (prop === 'readable' || prop === 'readableEnded' || prop === 'readableFlowing') {
            return bodyStream[prop];
          }
          // For read method, use bodyStream
          if (prop === 'read') {
            return bodyStream.read.bind(bodyStream);
          }
          // For everything else (headers, method, url, body), use the original request
          return target[prop];
        }
      });
      
      return super.handleRequest(streamProxy as any, res);
    }
    
    // For GET requests, also check for session injection
    if (req.method === 'GET' && !sessionId) {
      sessionId = this.connectionSessions.get(connectionId);
      if (sessionId) {
        console.log('[OpenAICompatibleTransport] Injecting session ID for GET request:', sessionId);
        req.headers['mcp-session-id'] = sessionId;
      }
    }
    
    // For all other requests (GET, DELETE), pass through to parent
    return super.handleRequest(req, res);
  }

  // Override validateSession to allow initialize requests before server is initialized
  protected validateSession(req: any, res: any): boolean {
    // Check if this is an initialize request by peeking at the body
    if (req.method === 'POST' && req.body) {
      try {
        const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        if (parsedBody && parsedBody.method === 'initialize') {
          // Allow initialize requests to bypass validation
          return true;
        }
      } catch (e) {
        // If we can't parse the body, fall back to default validation
      }
    }
    
    // For non-initialize requests, use default validation
    return super.validateSession(req, res);
  }

  close(): Promise<void> {
    this.sessionStore.clear();
    this.connectionSessions.clear();
    return super.close();
  }
}