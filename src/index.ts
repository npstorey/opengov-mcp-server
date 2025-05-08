{
  "name": "opengov-mcp-server",
  "version": "0.1.1",
  "description": "MCP server that enables a client, such as Claude Desktop, to access open government data through Socrata APIs",
  "private": false,
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "main": "./dist/server.js",
  "bin": {
    "opengov-mcp-server": "./dist/server.js"
  },
  "scripts": {
    "clean": "rm -rf dist",
    "build": "npm run clean && esbuild src/index.ts --bundle --outfile=dist/server.js --platform=node --format=esm --target=node18 --sourcemap",
    "start": "node ./dist/server.js"
  },
  "keywords": [
    "anthropic",
    "claude-desktop",
    "claude",
    "data",
    "government",
    "mcp",
    "model-context-protocol",
    "open-government",
    "opendata",
    "opengov",
    "socrata"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/npstorey/opengov-mcp-server"
  },
  "author": "Scott Robbin <scott@robbin.co>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/npstorey/opengov-mcp-server/issues"
  },
  "homepage": "https://github.com/npstorey/opengov-mcp-server#readme",
  "files": [
    "dist/server.js",
    "dist/server.js.map",
    "LICENSE",
    "README.md"
  ],
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "axios": "^1.8.4"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "@types/node": "^18.0.0",
    "@types/axios": "^0.14.0",
    "@typescript-eslint/eslint-plugin": "^8.29.0",
    "@typescript-eslint/parser": "^8.29.0",
    "eslint": "^9.23.0",
    "prettier": "^3.5.3",
    "shx": "^0.4.0",
    "vitest": "^3.1.1",
    "esbuild": "^0.20.0"
  }
}
