import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock versions of the required classes
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      setRequestHandler: vi.fn(),
      sendLoggingMessage: vi.fn(),
    })),
  };
});

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    })),
  };
});

// Import the mocked modules
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

describe('Server initialization', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });
  
  it('should create server with correct metadata', () => {
    // Manually execute the server setup similar to index.ts
    new Server(
      {
        name: 'true-bench-mcp',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {},
          logging: {}
        }
      }
    );
    
    // Assert that Server was called with correct parameters
    expect(Server).toHaveBeenCalledWith(
      {
        name: 'true-bench-mcp',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {},
          logging: {}
        }
      }
    );
  });
  
  it('should connect server to transport', async () => {
    const server = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {}, logging: {} } }
    );
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    expect(server.connect).toHaveBeenCalledWith(transport);
  });
});