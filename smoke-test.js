const { searchIds } = require('./dist/tools/search-ids.js');
const { retrieveDocuments } = require('./dist/tools/document-retrieval.js');
const { handleSearchTool, handleDocumentRetrievalTool } = require('./dist/tools/socrata-tools.js');

async function runSmokeTest() {
  console.log('=== OpenGov MCP Server Smoke Test ===\n');

  // Test 1: Search Chicago crime datasets without datasetId
  console.log('1. Search Chicago crime datasets (no datasetId):');
  console.log('Command:');
  console.log(`curl -X POST http://localhost:10000/mcp \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "mcp-session-id: YOUR_SESSION_ID" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search",
      "arguments": {
        "domain": "data.cityofchicago.org",
        "query": "crime",
        "limit": 2
      }
    },
    "id": 1
  }'`);
  
  try {
    const searchResult = await handleSearchTool({
      domain: 'data.cityofchicago.org',
      query: 'crime',
      limit: 2
    });
    
    console.log('\nResult (truncated):');
    console.log(JSON.stringify(searchResult, null, 2));
    
    // Test 2: Document retrieval for first two IDs
    if (searchResult.length >= 2) {
      const ids = searchResult.slice(0, 2).map(r => r.id);
      console.log('\n\n2. Retrieve metadata for crime datasets:');
      console.log('Command:');
      console.log(`curl -X POST http://localhost:10000/mcp \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "mcp-session-id: YOUR_SESSION_ID" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "document_retrieval",
      "arguments": {
        "domain": "data.cityofchicago.org",
        "ids": ${JSON.stringify(ids)}
      }
    },
    "id": 2
  }'`);
      
      const docsResult = await handleDocumentRetrievalTool({
        domain: 'data.cityofchicago.org',
        ids: ids
      });
      
      console.log('\nResult (truncated to first 500 chars per doc):');
      docsResult.forEach((doc, i) => {
        const preview = JSON.stringify(doc, null, 2).substring(0, 500);
        console.log(`\nDocument ${i + 1}:`);
        console.log(preview + '...');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runSmokeTest().catch(console.error);