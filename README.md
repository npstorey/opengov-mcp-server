# OpenGov MCP Server

A Model Context Protocol (MCP) server for accessing open government data through Socrata Open Data APIs.

## Features

- Search and retrieve data from any Socrata-powered open data portal
- Full-text search across datasets and within datasets
- Support for complex SoQL queries
- OpenAI MCP wizard compatibility
- Efficient caching and size limits for optimal performance

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Access at http://localhost:10000
```

## Environment Variables

```bash
# Default data portal (optional)
DATA_PORTAL_URL=https://data.cityofnewyork.us
```

## Available Tools

### search
Search for datasets or documents within datasets. Returns ID/score pairs for efficient retrieval.

### document_retrieval
Retrieve full document content by IDs. Supports batch retrieval and automatic caching.

## Cross-Domain Search Examples

### Search Chicago Crime Data

Search across all Chicago datasets for crime-related data:

```bash
# Search without specifying a dataset ID
curl -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search",
      "arguments": {
        "domain": "data.cityofchicago.org",
        "query": "crime",
        "limit": 5
      }
    },
    "id": 1
  }'
```

This returns dataset IDs in the format `dataset_id:catalog` for datasets matching "crime".

### Retrieve Dataset Metadata

Use the encoded IDs from the search to get dataset details:

```bash
# Retrieve metadata for crime datasets
curl -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "document_retrieval",
      "arguments": {
        "domain": "data.cityofchicago.org",
        "ids": ["ijzp-q8t2:catalog", "6zsd-86xi:catalog"]
      }
    },
    "id": 2
  }'
```

### Search Within a Specific Dataset

Once you have a dataset ID, search within it:

```bash
# Search for theft crimes in Chicago crime dataset
curl -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search",
      "arguments": {
        "dataset_id": "ijzp-q8t2",
        "domain": "data.cityofchicago.org",
        "query": "theft",
        "limit": 10
      }
    },
    "id": 3
  }'
```

### Retrieve Specific Records

Get full details for specific crime records:

```bash
# Retrieve specific crime records by ID
curl -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "document_retrieval",
      "arguments": {
        "dataset_id": "ijzp-q8t2",
        "domain": "data.cityofchicago.org",
        "ids": ["12345", "67890"]
      }
    },
    "id": 4
  }'
```

## SoQL Query Examples

Use complex queries with the legacy `get_data` tool:

```bash
# Get crime counts by type
curl -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_data",
      "arguments": {
        "type": "query",
        "dataset_id": "ijzp-q8t2",
        "domain": "data.cityofchicago.org",
        "query": "SELECT primary_type, COUNT(*) as count GROUP BY primary_type ORDER BY count DESC LIMIT 10"
      }
    },
    "id": 5
  }'
```

## ID Encoding Format

When searching without a dataset ID, results use encoded IDs:
- Dataset metadata: `dataset_id:catalog`
- Regular records: `dataset_id:row_id`
- Row-based records: `row_N` (where N is the row index)

The document_retrieval tool automatically parses these encoded IDs.

## Popular Open Data Portals

- New York City: `data.cityofnewyork.us`
- Chicago: `data.cityofchicago.org`
- San Francisco: `data.sfgov.org`
- Seattle: `data.seattle.gov`
- Los Angeles: `data.lacity.org`

## Development

```bash
# Run tests
npm test

# Build TypeScript
npm run build

# Start development server
npm run dev
```

## License

MIT