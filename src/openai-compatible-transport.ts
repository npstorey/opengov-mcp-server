import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Request, Response } from 'express';
import crypto from 'crypto';

export class OpenAICompatibleTransport extends StreamableHTTPServerTransport {
  private sessionStore: Map<string, { createdAt: Date; initialized: boolean }> = new Map();

  constructor(options?: any) {
    // Set up session tracking via the SDK's onsessioninitialized callback
    super({
      ...options,
      // Let the SDK generate session IDs
      sessionIdGenerator: options?.sessionIdGenerator || (() => crypto.randomBytes(16).toString('hex')),
      // Track when sessions are initialized
      onsessioninitialized: (sessionId: string) => {
        console.log('[OpenAICompatibleTransport] Session initialized by SDK:', sessionId);
        this.sessionStore.set(sessionId, { createdAt: new Date(), initialized: true });
        // Call the original callback if provided
        if (options?.onsessioninitialized) {
          options.onsessioninitialized(sessionId);
        }
      }
    });
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    console.log('[OpenAICompatibleTransport] handleRequest called');
    console.log('[OpenAICompatibleTransport] Method:', req.method);
    console.log('[OpenAICompatibleTransport] Headers:', {
      'mcp-session-id': req.headers['mcp-session-id'],
      'content-type': req.headers['content-type'],
      'accept': req.headers.accept
    });

    // For ALL POST requests with a body, we need to create a stream proxy
    // to prevent the SDK from trying to read the already-consumed stream
    if (req.method === 'POST' && req.body) {
      console.log('[OpenAICompatibleTransport] POST request with body detected');
      console.log('[OpenAICompatibleTransport] Request body:', req.body);
      
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
    
    // For all other requests (GET, DELETE), pass through to parent
    return super.handleRequest(req, res);
  }

  close(): Promise<void> {
    this.sessionStore.clear();
    return super.close();
  }
}