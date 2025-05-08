// src/global.d.ts

// --- Manually declare SDK modules and exports FOR TYPESCRIPT ONLY ---

declare module '@modelcontextprotocol/sdk/server/index.js' {
  export const Server: any;
}

declare module '@modelcontextprotocol/sdk/server/http.js' {
  export const HttpServerTransport: any;
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export const Tool: any;
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
