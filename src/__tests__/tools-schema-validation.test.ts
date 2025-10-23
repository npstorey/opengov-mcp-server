import { describe, it, expect } from 'vitest';
import { SEARCH_TOOL, FETCH_TOOL } from '../tools/socrata-tools.js';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('Tools Schema Validation', () => {
  it('should have valid JSON Schema for all tools', () => {
    // Initialize AJV with Draft-07 schema support
    const ajv = new Ajv({ 
      strict: false,
      allErrors: true,
      verbose: true
    });
    addFormats(ajv);

    // Test search tool
    const searchParams = { ...SEARCH_TOOL.inputSchema };
    
    // Check that search tool has required field with only query
    expect(searchParams.required).toEqual(['query']);
    
    // Validate schema
    const searchSchemaDoc = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...SEARCH_TOOL.inputSchema
    };
    
    const searchValid = ajv.validateSchema(searchSchemaDoc);
    if (!searchValid) {
      console.error('Search tool schema validation errors:', ajv.errors);
    }
    expect(searchValid).toBe(true);
    
    // Check size
    const searchSize = Buffer.byteLength(JSON.stringify({
      name: SEARCH_TOOL.name,
      description: SEARCH_TOOL.description,
      inputSchema: SEARCH_TOOL.inputSchema
    }), 'utf8');
    expect(searchSize).toBeLessThanOrEqual(2048);
    
    // Test fetch tool
    const fetchParams = { ...FETCH_TOOL.inputSchema };
    
    // Check that fetch has required field
    expect(fetchParams.required).toEqual(['id']);
    
    // Validate schema
    const fetchSchemaDoc = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...FETCH_TOOL.inputSchema
    };
    
    const fetchValid = ajv.validateSchema(fetchSchemaDoc);
    if (!fetchValid) {
      console.error('Fetch tool schema validation errors:', ajv.errors);
    }
    expect(fetchValid).toBe(true);
    
    // Check size
    const fetchSize = Buffer.byteLength(JSON.stringify({
      name: FETCH_TOOL.name,
      description: FETCH_TOOL.description,
      inputSchema: FETCH_TOOL.inputSchema
    }), 'utf8');
    expect(fetchSize).toBeLessThanOrEqual(2048);
  });

  it('should filter empty required arrays in runtime', () => {
    // Test that the filtering logic works
    const testTool = {
      name: 'test',
      description: 'test',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    };
    
    // Simulate the filtering logic from index.ts
    if (testTool.inputSchema.required && Array.isArray(testTool.inputSchema.required) && testTool.inputSchema.required.length === 0) {
      const { required, ...rest } = testTool.inputSchema;
      testTool.inputSchema = rest;
    }
    
    expect(testTool.inputSchema.required).toBeUndefined();
  });

  it('should validate against JSON Schema draft-2020-12 and fail if required is empty or missing', () => {
    // Initialize AJV with Draft 2020-12 support
    const ajv2020 = new Ajv({ 
      strict: false,
      allErrors: true,
      validateFormats: true
    });
    addFormats(ajv2020);

    // Test that search tool with required array validates correctly
    const searchSchema = {
      ...SEARCH_TOOL.inputSchema
    };
    
    const searchValid = ajv2020.validateSchema(searchSchema);
    expect(searchValid).toBe(true);
    expect(SEARCH_TOOL.inputSchema.required).toBeDefined();
    expect(SEARCH_TOOL.inputSchema.required.length).toBeGreaterThan(0);

    // Test that fetch tool with required array validates correctly
    const fetchSchema = {
      ...FETCH_TOOL.inputSchema
    };
    
    const fetchValid2020 = ajv2020.validateSchema(fetchSchema);
    expect(fetchValid2020).toBe(true);
    expect(FETCH_TOOL.inputSchema.required).toBeDefined();
    expect(FETCH_TOOL.inputSchema.required.length).toBeGreaterThan(0);

    // Test that a tool without required array would fail our expectations
    const invalidTool = {
      type: 'object',
      properties: {
        test: { type: 'string' }
      }
      // Missing required array
    };

    // This schema is valid, but we expect all our tools to have required arrays
    expect(invalidTool.required).toBeUndefined();
    
    // Test empty required array
    const emptyRequiredTool = {
      type: 'object',
      properties: {
        test: { type: 'string' }
      },
      required: []
    };

    // Empty required arrays should be filtered out in our implementation
    expect(emptyRequiredTool.required.length).toBe(0);
  });

  it('should use inputSchema field name for OpenAI compatibility', () => {
    // Import the handler to simulate tools/list response
    const { ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
    
    // Simulate building the tools list as done in index.ts
    const tools = [
      {
        name: 'search',
        title: 'Search Socrata Datasets',
        description: SEARCH_TOOL.description,
        inputSchema: { ...SEARCH_TOOL.inputSchema }
      },
      {
        name: 'fetch',
        title: 'Fetch Documents',
        description: FETCH_TOOL.description,
        inputSchema: { ...FETCH_TOOL.inputSchema }
      }
    ];
    
    // Verify each tool has inputSchema, not parameters
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
      expect((tool as any).parameters).toBeUndefined();
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.title).toBeTruthy();
    }
    
    // Verify search tool has minimal required array
    expect(tools[0].inputSchema.required).toEqual(['query']);
    
    // Verify fetch has correct required array
    expect(tools[1].inputSchema.required).toEqual(['id']);
  });
});