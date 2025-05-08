// src/global.d.ts

// --- Manually declare SDK modules and exports FOR TYPESCRIPT ONLY ---

declare module '@modelcontextprotocol/sdk/server/index.js' {
  export const Server: any; // Likely a class, which is a value at runtime
}

declare module '@modelcontextprotocol/sdk/server/http.js' {
  export const HttpServerTransport: any; // Likely a class, a value at runtime
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export type Tool = any; // CHANGED: Tool is used as a Type
  export const CallToolRequestSchema: any; // This is likely a Zod schema object (value)
  export const ListToolsRequestSchema: any; // This is likely a Zod schema object (value)
}

// --- process.env typing ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    PORT?: string;
  }
}
