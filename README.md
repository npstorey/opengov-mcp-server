# OpenGov MCP Server

An MCP (Model Context Protocol) server that enables MCP clients like Claude Desktop to access Socrata Open Data APIs. This integration allows Claude Desktop to search for, retrieve, and analyze public datasets from government data portals.

## Overview

This MCP server provides access to open data from any Socrata-powered data portal, including those from cities, states, and federal agencies such as:
- [Chicago](https://data.cityofchicago.org)
- [NYC](https://data.cityofnewyork.us)
- [San Francisco](https://data.sfgov.org)
- [Los Angeles](https://data.lacity.org)
- [And other government entities](https://dev.socrata.com/data/)

No API key is required for basic usage, as the server accesses public data.

## Features

With this MCP server, clients can:
- Search and discover datasets by keyword, category, or tags
- View dataset metadata and column information
- Run SQL-like queries to retrieve and analyze data
- Get portal usage statistics

## Installation for Claude Desktop

### Quick Setup with npx (Recommended)

The easiest way to use this MCP server is with npx, which doesn't require any installation:

1. **Create or edit your Claude Desktop configuration**:
   
   Create or edit `claude_desktop_config.json` in your home directory:

   ```json
   {
     "mcpServers": { 
       "opengov": {
         "command": "npx",
         "args": ["-y", "opengov-mcp-server@latest"],
         "env": {
           "DATA_PORTAL_URL": "https://data.cityofchicago.org"
         }
       }
     }
   }
   ```

   You can replace the DATA_PORTAL_URL with any Socrata-powered data portal.

2. **Restart Claude Desktop** (if it was already running)

3. **Start using the MCP server**:
   
   In Claude Desktop, you can now ask questions like:
   
   ```
   How many cars were towed in Chicago this month?
   ```

   and you can follow up with questions that drill further into detail:

   ```
   Which make and color were towed the most?
   Also, were there any interesting vanity plates?
   ```

   The first time you run a query, npx will automatically download and run the latest version of the server.

### Manual Installation from Source

If you prefer to run from source (for development or customization):

1. **Clone this repository**:
   ```bash
   git clone https://github.com/srobbin/opengov-mcp-server.git
   cd opengov-mcp-server
   ```

2. **Install dependencies and build**:
   ```bash
   npm install
   npm run build
   ```

3. **Create Claude Desktop configuration**:
   
   Create or edit `claude_desktop_config.json` in your home directory:

   ```json
   {
     "mcpServers": { 
       "opengov": {
         "command": "node",
         "args": [
           "/path/to/your/opengov-mcp-server/dist/index.js"
         ],
         "env": {
           "DATA_PORTAL_URL": "https://data.cityofchicago.org"
         }
       }
     }
   }
   ```

   Replace `/path/to/your/opengov-mcp-server` with the actual path where you cloned the repository.

4. **Restart Claude Desktop** (if it was already running)

## Available Tool: get_data

This MCP server provides a unified `get_data` tool that Claude Desktop uses to access Socrata data.

### Parameters

- `type` (string, required): Operation type
  - `catalog`: Search and list datasets
  - `categories`: List dataset categories
  - `tags`: List dataset tags
  - `dataset-metadata`: Get dataset details
  - `column-info`: Get dataset column information
  - `data-access`: Query and retrieve records
  - `site-metrics`: Get portal statistics

- `domain` (string, optional): Data portal hostname (without protocol)

- `query` (string, optional): Search query for datasets

- `datasetId` (string): Dataset identifier for specific operations

- `soqlQuery` (string, optional): SoQL query for filtering data

- `limit` (number, optional): Maximum results to return (default: 10)

- `offset` (number, optional): Results to skip for pagination (default: 0)

### Example Queries

These are examples of how Claude Desktop will format queries to the MCP server:

```javascript
// Find datasets about budgets
{
  "type": "catalog",
  "query": "budget",
  "limit": 5
}

// Get information about a dataset
{
  "type": "dataset-metadata",
  "datasetId": "6zsd-86xi"
}

// Query dataset records with SQL-like syntax
{
  "type": "data-access",
  "datasetId": "6zsd-86xi",
  "soqlQuery": "SELECT * WHERE amount > 1000 ORDER BY date DESC",
  "limit": 10
}
```

## Configuration Options

The server requires one environment variable:

- `DATA_PORTAL_URL`: The Socrata data portal URL (e.g., `https://data.cityofchicago.org`)

This can be set:
- In the Claude Desktop configuration (recommended)
- In your environment variables
- Via command line: `DATA_PORTAL_URL=https://data.cityofchicago.org opengov-mcp-server`
