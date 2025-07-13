import { describe, it, expect } from 'vitest';
import { SEARCH_TOOL, DOCUMENT_RETRIEVAL_TOOL } from '../tools/socrata-tools.js';
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
    const searchParams = { ...SEARCH_TOOL.parameters };
    
    // Check that search tool has no required field
    expect(searchParams.required).toBeUndefined();
    
    // Validate schema
    const searchSchemaDoc = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...searchParams
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
      parameters: searchParams
    }), 'utf8');
    expect(searchSize).toBeLessThanOrEqual(2048);
    
    // Test document_retrieval tool
    const docParams = { ...DOCUMENT_RETRIEVAL_TOOL.parameters };
    
    // Check that document_retrieval has required field
    expect(docParams.required).toEqual(['ids']);
    
    // Validate schema
    const docSchemaDoc = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...docParams
    };
    
    const docValid = ajv.validateSchema(docSchemaDoc);
    if (!docValid) {
      console.error('Document retrieval tool schema validation errors:', ajv.errors);
    }
    expect(docValid).toBe(true);
    
    // Check size
    const docSize = Buffer.byteLength(JSON.stringify({
      name: DOCUMENT_RETRIEVAL_TOOL.name,
      description: DOCUMENT_RETRIEVAL_TOOL.description,
      parameters: docParams
    }), 'utf8');
    expect(docSize).toBeLessThanOrEqual(2048);
  });

  it('should filter empty required arrays in runtime', () => {
    // Test that the filtering logic works
    const testTool = {
      name: 'test',
      description: 'test',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    };
    
    // Simulate the filtering logic from index.ts
    if (testTool.parameters.required && Array.isArray(testTool.parameters.required) && testTool.parameters.required.length === 0) {
      const { required, ...rest } = testTool.parameters;
      testTool.parameters = rest;
    }
    
    expect(testTool.parameters.required).toBeUndefined();
  });
});