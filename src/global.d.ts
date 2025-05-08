// src/global.d.ts

// --- MCP SDK deep imports ---
declare module '@modelcontextprotocol/sdk/server/index.js';
declare module '@modelcontextprotocol/sdk/server/http.js';
declare module '@modelcontextprotocol/sdk/types.js' {
  export type Tool = any;
  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
}

// --- process.env typing (optional but silences process errors) ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    // Add other environment variables here if needed
    PORT?: string; 
  }
}
