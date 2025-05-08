// src/global.d.ts

// --- Manually declare SDK modules and exports FOR TYPESCRIPT ONLY ---
// Declare modules using the specifier WITH .js suffix

declare module '@modelcontextprotocol/sdk/server/index.js' { // Added /index.js
  export const Server: any;
}

declare module '@modelcontextprotocol/sdk/server/http.js' { // Added .js
  export const HttpServerTransport: any;
}

declare module '@modelcontextprotocol/sdk/types.js' { // Added .js
  export type Tool = any;
  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
}

// --- process.env typing ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    PORT?: string;
  }
}
