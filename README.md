# OpenGov MCP Server (Remote-Ready Fork)

This project is a fork of Scott Robbin's original [srobbin/opengov-mcp-server](https://github.com/srobbin/opengov-mcp-server). The primary goal of this fork is to adapt the server for deployment as a **remote, HTTP-based Model Context Protocol (MCP) server**, suitable for platforms like Render.com, rather than solely local command-line (stdio) execution.

The aim is to enable MCP clients (like Claude.ai or Claude Desktop configured for remote servers) to connect over the internet and utilize the Socrata Open Data API integration provided by this server.

## Original Project Overview

The original server enables MCP clients to access Socrata Open Data APIs, allowing interaction with public datasets from various government data portals. Key features include:

*   Searching and discovering datasets.
*   Viewing dataset metadata and column information.
*   Running SQL-like queries (SoQL) to retrieve and analyze data.
*   Getting portal usage statistics.

## Goals of This Fork

1.  **Remote Deployability:** Refactor the server to use an HTTP-based MCP transport (e.g., `StreamableHTTPServerTransport` or `StreamableHTTPServerTransport` from the `@modelcontextprotocol/sdk`) to allow deployment as a web service.
2.  **Platform Compatibility:** Ensure the build process and runtime are compatible with cloud hosting platforms like Render.com.
3.  **Robustness:** Implement necessary error handling and logging for a remote server environment.
4.  **ESM & TypeScript:** Maintain the project as a Node.js application using ES Modules and TypeScript, with appropriate build configurations.

## Current Status & Challenges

As of the last update, the project has successfully:
*   Been configured to build with `tsc` outputting to a `dist` directory.
*   Attempted integration with both `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport` and `StreamableHTTPServerTransport` using `express` for the HTTP layer.
*   Successfully deployed to Render.com where the basic Express server starts and listens on the assigned port, passing Render's health checks (when a `/` root endpoint is provided).
*   Confirmed that Claude.ai can make an initial connection to the deployed server's SSE endpoint.

The primary ongoing challenge is ensuring that after the initial MCP `initialize` handshake, Claude.ai successfully receives the list of available tools and enables them, rather than showing them as "Disabled." This involves:
*   Correctly implementing the chosen HTTP transport (`StreamableHTTPServerTransport` is the current focus due to SDK documentation and file packaging observations).
*   Ensuring the `ListToolsRequestSchema` handler is correctly invoked and responds in the format expected by the client and the MCP SDK.
*   Investigating the SDK's behavior regarding the `initialize` sequence and subsequent `listTools` requests over HTTP-based transports.

The original `srobbin/opengov-mcp-server` used `StdioServerTransport`, which is suitable for local `npx` execution but not for a remote web service. This fork requires adapting to an HTTP transport.

## Key Technologies & Configuration

*   **Node.js:** Version 18.19.1 (as per Render environment)
*   **TypeScript:** For type safety and modern JavaScript features.
*   **ES Modules (`type: "module"`):** In `package.json`.
*   **`@modelcontextprotocol/sdk`:** Currently targeting version `1.11.4`.
*   **HTTP Transport:** Currently implementing `StreamableHTTPServerTransport` with `express`.
*   **Build Process:** `npm run build` (which runs `tsc`).
*   **Deployment Platform:** Render.com (as a Web Service).
*   **Environment Variables on Render:**
    *   `DATA_PORTAL_URL`: (e.g., `https://data.cityofnewyork.us`)
    *   `REDIS_URL`: (Currently configured but not actively used by the core server logic visible in this fork).
    *   `PORT`: Provided by Render.

## Development & Deployment

### Local Development (Recommended Workflow)

1.  Ensure Node.js (v18.19.1 or as specified in `package.json`) and npm are installed.
2.  Clone this repository.
3.  Delete `package-lock.json` and the `node_modules` directory if they exist to ensure a clean start when switching SDK versions or making significant dependency changes.
4.  Run `npm install` to install dependencies and generate/update `package-lock.json`.
5.  Make code changes in the `src` directory.
6.  Run `npm run build` to compile TypeScript and run checks. Address any errors.
7.  Commit changes, including `package.json` and `package-lock.json`.
8.  Push to GitHub.

### Deployment to Render.com

1.  Ensure the Render.com service is connected to this GitHub repository and branch.
2.  The Build Command on Render should be: `npm install && npm run build`
3.  The Start Command on Render should be: `npm start` (which executes `NODE_ENV=production node ./dist/index.js` or `node ./dist/index.js`)
4.  Ensure the Health Check Path on Render is set to `/`.
5.  Trigger a manual deploy or allow auto-deploy on commit.
6.  Monitor Render logs for build progress, server startup messages, and any runtime errors.

## Next Steps in Troubleshooting

The immediate next step is to ensure the `ListToolsRequestSchema` handler is correctly invoked after a successful `initialize` handshake when using `StreamableHTTPServerTransport` and that the tool list it provides is accepted by Claude.ai, enabling the tools. This involves careful logging and comparison with official SDK examples for `StreamableHTTPServerTransport`.

Refer to the project's issue tracker and commit history for detailed troubleshooting attempts.
