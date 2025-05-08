// src/global.d.ts

// --- MCP SDK deep imports ---
// Re-add these, but matching the non-.js import paths
declare module '@modelcontextprotocol/sdk/server' {
  export * from '@modelcontextprotocol/sdk/dist/server/index'; // Point to the actual d.ts location if known, or use a general export
}
declare module '@modelcontextprotocol/sdk/server/http' {
  export * from '@modelcontextprotocol/sdk/dist/server/http';
}
declare module '@modelcontextprotocol/sdk/types' {
  export * from '@modelcontextprotocol/sdk/dist/types/index';
  // Or if types are directly in dist/types.d.ts
  // export * from '@modelcontextprotocol/sdk/dist/types';
}


// --- process.env typing ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    PORT?: string;
  }
}
