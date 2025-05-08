// src/global.d.ts

// --- MCP SDK deep imports ---
// REMOVED: declare module '@modelcontextprotocol/sdk/server/index.js';
// REMOVED: declare module '@modelcontextprotocol/sdk/server/http.js';
// REMOVED: declare module '@modelcontextprotocol/sdk/types.js' { ... }


// --- process.env typing (optional but silences process errors) ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    PORT?: string;
  }
}
