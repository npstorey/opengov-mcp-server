# OpenGov MCP Server - Build, Test, and Run Commands

## Build the Project
```bash
npm run build
```

## Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test openai-initialize.test.ts
```

## Run Server Locally
```bash
# Development mode (with hot reload if configured)
npm run dev

# Production mode
npm run start
```

## Test with Curl Commands

### 1. Test OpenAI Initialize Sequence
```bash
# Initialize request (no session ID needed)
curl -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"openai-mcp","version":"1.0.0"}}}'

# Save the session ID from the response header (mcp-session-id)
# Use it in subsequent requests
```

### 2. Send Notifications/Initialized (use session ID from step 1)
```bash
curl -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID_HERE" \
  -d '{"method":"notifications/initialized","jsonrpc":"2.0"}'
```

### 3. List Prompts (use session ID from step 1)
```bash
curl -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID_HERE" \
  -d '{"jsonrpc":"2.0","method":"prompts/list","id":2}'
```

### 4. List Tools (use session ID from step 1)
```bash
curl -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID_HERE" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":3}'
```

### 5. Open SSE Stream (use session ID from step 1)
```bash
curl -X GET http://localhost:10000/mcp \
  -H "Accept: text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID_HERE"
```

## Test Health Check
```bash
curl http://localhost:10000/healthz
```

## Test Debug Endpoint
```bash
curl http://localhost:10000/debug
```

## Environment Variables
Make sure to set up your `.env` file:
```
DATA_PORTAL_URL=https://data.cityofnewyork.us
PORT=10000
```

## Quick Test Script
Save this as `test-openai.sh` and run with `bash test-openai.sh`:
```bash
#!/bin/bash

echo "Testing OpenAI MCP handshake..."

# Step 1: Initialize
echo -e "\n1. Sending initialize request..."
RESPONSE=$(curl -s -i -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"openai-mcp","version":"1.0.0"}}}')

# Extract session ID
SESSION_ID=$(echo "$RESPONSE" | grep -i "mcp-session-id:" | awk '{print $2}' | tr -d '\r')
echo "Session ID: $SESSION_ID"

# Step 2: Notifications/initialized
echo -e "\n2. Sending notifications/initialized..."
curl -s -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"method":"notifications/initialized","jsonrpc":"2.0"}'

# Step 3: List prompts
echo -e "\n\n3. Listing prompts..."
curl -s -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"prompts/list","id":2}'

# Step 4: List tools
echo -e "\n\n4. Listing tools..."
curl -s -X POST http://localhost:10000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":3}'

echo -e "\n\nHandshake complete!"
```