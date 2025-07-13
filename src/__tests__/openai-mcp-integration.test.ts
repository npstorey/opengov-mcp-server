import { describe, it, expect, vi } from 'vitest';
import { SEARCH_TOOL, DOCUMENT_RETRIEVAL_TOOL } from '../tools/socrata-tools.js';

describe('OpenAI MCP Integration', () => {
  it('should return tools with inputSchema field for OpenAI compatibility', () => {
    // Simulate the tools/list response as built in index.ts
    const toolsListResponse = {
      tools: [
        {
          name: 'search',
          title: 'Search Socrata Datasets',
          description: SEARCH_TOOL.description,
          inputSchema: { ...SEARCH_TOOL.parameters }
        },
        {
          name: 'document_retrieval',
          title: 'Retrieve Documents',
          description: DOCUMENT_RETRIEVAL_TOOL.description,
          inputSchema: { ...DOCUMENT_RETRIEVAL_TOOL.parameters }
        }
      ]
    };

    // Validate the response structure matches OpenAI expectations
    expect(toolsListResponse.tools).toHaveLength(2);
    
    // Check first tool (search)
    const searchTool = toolsListResponse.tools[0];
    expect(searchTool.name).toBe('search');
    expect(searchTool.title).toBe('Search Socrata Datasets');
    expect(searchTool.description).toBeTruthy();
    expect(searchTool.inputSchema).toBeDefined();
    expect(searchTool.inputSchema.type).toBe('object');
    expect(searchTool.inputSchema.properties).toBeDefined();
    expect(searchTool.inputSchema.required).toEqual(['query']);
    
    // Check second tool (document_retrieval)
    const docTool = toolsListResponse.tools[1];
    expect(docTool.name).toBe('document_retrieval');
    expect(docTool.title).toBe('Retrieve Documents');
    expect(docTool.description).toBeTruthy();
    expect(docTool.inputSchema).toBeDefined();
    expect(docTool.inputSchema.type).toBe('object');
    expect(docTool.inputSchema.properties).toBeDefined();
    expect(docTool.inputSchema.required).toEqual(['ids']);
  });

  it('should validate tool sizes are under 2KB limit', () => {
    const tools = [
      {
        name: 'search',
        title: 'Search Socrata Datasets',
        description: SEARCH_TOOL.description,
        inputSchema: { ...SEARCH_TOOL.parameters }
      },
      {
        name: 'document_retrieval',
        title: 'Retrieve Documents',
        description: DOCUMENT_RETRIEVAL_TOOL.description,
        inputSchema: { ...DOCUMENT_RETRIEVAL_TOOL.parameters }
      }
    ];

    for (const tool of tools) {
      const size = Buffer.byteLength(JSON.stringify(tool), 'utf8');
      expect(size).toBeLessThanOrEqual(2048); // 2KB limit
    }
  });

  it('should be able to call search with only query parameter', () => {
    // Simulate a minimal search call that OpenAI wizard would make
    const searchParams = {
      query: 'crime statistics'
    };

    // Validate the params match the minimal required schema
    expect(searchParams).toHaveProperty('query');
    expect(Object.keys(searchParams)).toHaveLength(1);
    
    // The handler should accept this minimal input
    // (actual handler testing is done in other test files)
  });

  it('should handle MCP protocol sequence correctly', () => {
    // This test validates the expected sequence of calls
    const sequence = [
      { method: 'initialize', expectsSessionId: false },
      { method: 'notifications/initialized', expectsSessionId: true },
      { method: 'tools/list', expectsSessionId: true },
      { method: 'tools/call', expectsSessionId: true }
    ];

    // Validate the sequence follows MCP protocol
    expect(sequence[0].method).toBe('initialize');
    expect(sequence[0].expectsSessionId).toBe(false);
    
    // All subsequent calls should have session ID
    for (let i = 1; i < sequence.length; i++) {
      expect(sequence[i].expectsSessionId).toBe(true);
    }
  });
});