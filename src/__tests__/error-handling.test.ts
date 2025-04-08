import { describe, it, expect } from 'vitest';

type ErrorResponse = {
  content: Array<{type: string, text: string}>;
  isError: boolean;
};

// Utility to format errors in the same way as the main code
function formatError(error: Error | string): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return {
    content: [{ type: 'text', text: `Error: ${errorMessage}` }],
    isError: true,
  };
}

describe('error handling', () => {
  it('should format error objects correctly', () => {
    const errorObj = new Error('Test error message');
    const result = formatError(errorObj);
    
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('Error: Test error message');
  });
  
  it('should format string errors correctly', () => {
    const errorStr = 'String error message';
    const result = formatError(errorStr);
    
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('Error: String error message');
  });
  
  it('should handle tool not found errors', () => {
    const toolName = 'nonexistent-tool';
    const error = new Error(`Unknown tool: ${toolName}`);
    const result = formatError(error);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Error: Unknown tool: nonexistent-tool');
  });
});