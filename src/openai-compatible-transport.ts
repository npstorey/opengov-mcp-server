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
    if (req.method === 'POST' && !req.headers['mcp-session-id']) {
      console.log('[OpenAICompatibleTransport] POST without session ID - checking if initialize');
      
      // We need to peek at the body to see if it's an initialize request
      const chunks: Buffer[] = [];
      let isInitialize = false;
      let body = '';
      
      // Store original methods
      const originalOn = req.on.bind(req);
      const originalOnce = req.once.bind(req);
      
      // Buffer the body data
      req.on = function(event: string, listener: any) {
        if (event === 'data') {
          const wrappedListener = (chunk: Buffer) => {
            chunks.push(chunk);
            listener(chunk);
          };
          return originalOn(event, wrappedListener);
        }
        return originalOn(event, listener);
      };
      
      req.once = function(event: string, listener: any) {
        if (event === 'end') {
          const wrappedListener = () => {
            body = Buffer.concat(chunks).toString();
            console.log('[OpenAICompatibleTransport] Request body:', body);
            
            try {
              const parsed = JSON.parse(body);
              if (parsed.method === 'initialize') {
                isInitialize = true;
                console.log('[OpenAICompatibleTransport] Detected initialize request');
              }
            } catch (e) {
              console.log('[OpenAICompatibleTransport] Could not parse body as JSON');
            }
            
            listener();
          };
          return originalOnce(event, wrappedListener);
        }
        return originalOnce(event, listener);
      };
      
      // If it's an initialize request, generate a session ID and add it to the request
      return new Promise<void>((resolve, reject) => {
        req.once('end', async () => {
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
          }
          
          // Restore the request body for the parent handler
          const restoredReq = Object.create(req);
          restoredReq.headers = req.headers;
          restoredReq.method = req.method;
          restoredReq.url = req.url;
          
          let position = 0;
          restoredReq.on = function(event: string, listener: any) {
            if (event === 'data' && body) {
              // Immediately emit the buffered data
              process.nextTick(() => {
                listener(Buffer.from(body));
              });
              return this;
            } else if (event === 'end' && body) {
              // Immediately emit end
              process.nextTick(() => {
                listener();
              });
              return this;
            }
            return originalOn(event, listener);
          };
          
          restoredReq.once = restoredReq.on;
          
          try {
            await super.handleRequest(restoredReq, res);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
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