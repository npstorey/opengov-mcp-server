// src/global.d.ts

// --- Manually declare the problematic module and its exports FOR TYPESCRIPT ONLY ---
// This tells TypeScript that the module identified by the string
// '@modelcontextprotocol/sdk/server/http.js' exists and has a named export 'HttpServerTransport'.
// This does NOT change how Node.js resolves this module at runtime.
// It just satisfies TypeScript's type checker.
declare module '@modelcontextprotocol/sdk/server/http.js' {
  // We need to know the actual type of HttpServerTransport.
  // Since we can't easily inspect it, we'll use 'any' for now as a placeholder.
  // Ideally, we'd import the type from its real definition if we could resolve that separately
  // for type-checking purposes only, but that's complex here.
  export const HttpServerTransport: any; // Or a more specific type if known, e.g., constructor type
}

// If other modules like '@modelcontextprotocol/sdk/server/index.js' or '@modelcontextprotocol/sdk/types.js'
// also cause runtime 'ERR_MODULE_NOT_FOUND' due to similar global.d.ts issues,
// or if they cause TS2307 (cannot find module) at compile time again,
// we'll need to add similar blocks for them.

// For example, if '@modelcontextprotocol/sdk/server/index.js' was also problematic:
/*
declare module '@modelcontextprotocol/sdk/server/index.js' {
  export const Server: any; // Replace 'any' with the actual type if it can be determined
}
*/

// And for '@modelcontextprotocol/sdk/types.js':
/*
declare module '@modelcontextprotocol/sdk/types.js' {
  export const Tool: any;
  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
}
*/

// --- process.env typing ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    PORT?: string;
  }
}
