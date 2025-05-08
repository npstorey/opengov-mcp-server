// src/global.d.ts

// --- Manually declare the problematic module ---
// This tells TypeScript that when it encounters an import for the string literal
// '@modelcontextprotocol/sdk/server/http.js',
// it should understand that this module exports 'HttpServerTransport'
// and that the definition for 'HttpServerTransport' can be found by looking at
// the module '@modelcontextprotocol/sdk/dist/esm/server/http'
// (which TypeScript would resolve to .../http.d.ts within the SDK).

declare module '@modelcontextprotocol/sdk/server/http.js' {
  // Re-export only the specific member we need from its actual type definition location.
  // This assumes 'HttpServerTransport' is a named export from
  // 'node_modules/@modelcontextprotocol/sdk/dist/esm/server/http.d.ts'.
  export { HttpServerTransport } from '@modelcontextprotocol/sdk/dist/esm/server/http';
  
  // If HttpServerTransport were a default export (less likely for classes):
  // import MainInterfaceOrClass from '@modelcontextprotocol/sdk/dist/esm/server/http';
  // export default MainInterfaceOrClass;
}

// --- process.env typing ---
declare namespace NodeJS {
  interface ProcessEnv {
    REDIS_URL: string;
    DATA_PORTAL_URL?: string;
    PORT?: string;
  }
}
