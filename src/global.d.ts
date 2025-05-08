// src/global.d.ts

// --- Manually declare SDK modules and exports FOR TYPESCRIPT ONLY ---
// Declare modules using the specifier WITHOUT .js suffix

declare module '@modelcontextprotocol/sdk/server' {
  export const Server: any; // Assuming Server is exported here
}

declare module '@modelcontextprotocol/sdk/server/http' {
  export const HttpServerTransport: any; // Assuming HttpServerTransport is exported here
}

declare module '@modelcontextprotocol/sdk/types' {
  export type Tool = any; // Tool is used as a Type
  export const CallToolRequestSchema: any; // Likely a Zod schema object (value)
  export const ListToolsRequestSchema: any; // Likely a Zod schema object (value)
}

// --- process.env typing ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    PORT?: string;
  }
}
