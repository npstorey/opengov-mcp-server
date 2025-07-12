import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Request, Response } from 'express';
import crypto from 'crypto';

export class OpenAICompatibleTransport extends StreamableHTTPServerTransport {
  private sessionStore: Map<string, { createdAt: Date; initialized: boolean }> = new Map();
  private initializeRequests: Set<string> = new Set();

  constructor(options?: any) {
    super(options);
    
    // Override session ID generator to ensure we control session creation
    this.sessionIdGenerator = () => {
      const sessionId = crypto.randomBytes(16).toString('hex');
      console.log('[OpenAICompatibleTransport] Generated session ID:', sessionId);
      return sessionId;
    };
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    console.log('[OpenAICompatibleTransport] handleRequest called');
    console.log('[OpenAICompatibleTransport] Method:', req.method);
    console.log('[OpenAICompatibleTransport] Headers:', {
      'mcp-session-id': req.headers['mcp-session-id'],
      'content-type': req.headers['content-type'],
      'accept': req.headers.accept
    });

    // Check if this is a POST request that might be an initialize
    if (req.method === 'POST' && !req.headers['mcp-session-id'] && req.body) {
      console.log('[OpenAICompatibleTransport] POST without session ID - checking if initialize');
      console.log('[OpenAICompatibleTransport] Request body:', req.body);
      
      let isInitialize = false;
      try {
        const parsed = JSON.parse(req.body);
        if (parsed.method === 'initialize') {
          isInitialize = true;
          console.log('[OpenAICompatibleTransport] Detected initialize request');
        }
      } catch (e) {
        console.log('[OpenAICompatibleTransport] Could not parse body as JSON');
      }
      
      if (isInitialize) {
        const sessionId = this.sessionIdGenerator();
        this.sessionStore.set(sessionId, { createdAt: new Date(), initialized: false });
        this.initializeRequests.add(sessionId);
        
        // Add the session ID to the request headers
        req.headers['mcp-session-id'] = sessionId;
        console.log('[OpenAICompatibleTransport] Added session ID to initialize request:', sessionId);
        
        // Wrap the response to add session ID header
        const originalJson = res.json.bind(res);
        const originalEnd = res.end.bind(res);
        const originalWrite = res.write.bind(res);
        
        res.json = function(data: any) {
          console.log('[OpenAICompatibleTransport] Intercepting json response for initialize');
          res.setHeader('Mcp-Session-Id', sessionId);
          return originalJson(data);
        };
        
        res.end = function(chunk?: any, encoding?: any, callback?: any) {
          console.log('[OpenAICompatibleTransport] Intercepting end response for initialize');
          if (!res.headersSent) {
            res.setHeader('Mcp-Session-Id', sessionId);
          }
          if (typeof chunk === 'function') {
            callback = chunk;
            chunk = undefined;
            encoding = undefined;
          } else if (typeof encoding === 'function') {
            callback = encoding;
            encoding = undefined;
          }
          return originalEnd.call(res, chunk, encoding, callback);
        };
        
        res.write = function(chunk: any, encoding?: any, callback?: any) {
          console.log('[OpenAICompatibleTransport] Intercepting write response for initialize');
          if (!res.headersSent) {
            res.setHeader('Mcp-Session-Id', sessionId);
          }
          if (typeof encoding === 'function') {
            callback = encoding;
            encoding = undefined;
          }
          return originalWrite.call(res, chunk, encoding, callback);
        };
        
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
    }
    
    // For all other requests, pass through to parent
    return super.handleRequest(req, res);
  }

  // Override validation to be more lenient for session checking
  protected validateSession(req: Request): string | null {
    const sessionId = req.headers['mcp-session-id'] as string;
    
    // If no session ID and it's not an initialize request, reject
    if (!sessionId) {
      console.log('[OpenAICompatibleTransport] No session ID in request');
      return null;
    }
    
    // Check if session exists
    if (!this.sessionStore.has(sessionId)) {
      console.log('[OpenAICompatibleTransport] Session ID not found in store:', sessionId);
      return null;
    }
    
    return sessionId;
  }

  close(): Promise<void> {
    this.sessionStore.clear();
    this.initializeRequests.clear();
    return super.close();
  }
}