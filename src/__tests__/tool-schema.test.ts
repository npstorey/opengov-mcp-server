import { describe, it, expect } from 'vitest';

// Define the schema similar to how it's defined in index.ts
const retrieveToolSchema = {
  name: 'retrieve',
  description: 'Retrieves relevant information based on a query',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 5,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};

describe('tool schema', () => {
  it('should have the correct name', () => {
    expect(retrieveToolSchema.name).toBe('retrieve');
  });
  
  it('should have a description', () => {
    expect(retrieveToolSchema.description).toBeDefined();
    expect(typeof retrieveToolSchema.description).toBe('string');
    expect(retrieveToolSchema.description.length).toBeGreaterThan(0);
  });
  
  it('should have required query parameter', () => {
    expect(retrieveToolSchema.inputSchema.required).toContain('query');
  });
  
  it('should have optional limit parameter with default value', () => {
    const limitProperty = retrieveToolSchema.inputSchema.properties.limit;
    expect(limitProperty).toBeDefined();
    expect(limitProperty.type).toBe('number');
    expect(limitProperty.default).toBe(5);
  });
  
  it('should not allow additional properties', () => {
    expect(retrieveToolSchema.inputSchema.additionalProperties).toBe(false);
  });
});