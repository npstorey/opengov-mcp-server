// src/global.d.ts

// --- MCP SDK deep imports ---
declare module '@modelcontextprotocol/sdk/server' {
  // Assuming types are in @modelcontextprotocol/sdk/dist/server/index.d.ts
  export * from '@modelcontextprotocol/sdk/dist/server/index';
}

declare module '@modelcontextprotocol/sdk/server/http' {
  // Assuming types are in @modelcontextprotocol/sdk/dist/server/http.d.ts
  export * from '@modelcontextprotocol/sdk/dist/server/http';
}

declare module '@modelcontextprotocol/sdk/types' {
  // Assuming types are in @modelcontextprotocol/sdk/dist/types/index.d.ts
  // or @modelcontextprotocol/sdk/dist/types.d.ts
  export * from '@modelcontextprotocol/sdk/dist/types/index';
}

// --- process.env typing ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    PORT?: string;
  }
}
