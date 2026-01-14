import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before importing actual functions
vi.mock('axios');
vi.mock('../utils/api.js', () => ({
  fetchFromSocrataApi: vi.fn().mockImplementation(async (path) => {
    if (path === '/api/catalog/v1') {
      return { results: [{ id: 'test-dataset', name: 'Test Dataset' }] };
    } else if (path === '/api/catalog/v1/domain_categories') {
      return [{ name: 'Category 1', count: 10 }];
    } else if (path === '/api/catalog/v1/domain_tags') {
      return [{ name: 'Tag 1', count: 5 }];
    } else if (path.startsWith('/api/views/')) {
      if (path.endsWith('/columns')) {
        return [{ name: 'column1', dataTypeName: 'text' }];
      }
      return { id: 'test-dataset', name: 'Test Dataset', columns: [] };
    } else if (path.startsWith('/resource/')) {
      return [{ id: '1', name: 'Record 1' }];
    }
    return { error: 'Unexpected path' };
  })
}));

// Now import the actual functions
import {
  handleCatalogTool as handleCatalog,
  handleCategoriesTool as handleCategories,
  handleTagsTool as handleTags,
  handleDatasetMetadataTool as handleDatasetMetadata,
  handleColumnInfoTool as handleColumnInfo,
  handleDataAccessTool as handleDataAccess,
  handleSocrataTool,
  UNIFIED_SOCRATA_TOOL
} from '../tools/socrata-tools.js';
import { fetchFromSocrataApi } from '../utils/api.js';

// Type assertion for the mocked function - using vitest's mocking types
const mockedFetchFromSocrataApi = fetchFromSocrataApi as unknown as ReturnType<typeof vi.fn>;

describe('Socrata Tools', () => {
  beforeEach(() => {
    // Set DATA_PORTAL_URL for tests
    process.env.DATA_PORTAL_URL = 'https://data.cityofchicago.org';
    
    // Clear mocks before each test
    vi.clearAllMocks();
  });

  describe('handleCatalog', () => {
    it('should add search_context parameter with domain', async () => {
      await handleCatalog({});
      
      // Verify fetchFromSocrataApi was called with the correct params
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/api/catalog/v1',
        expect.objectContaining({
          search_context: 'data.cityofchicago.org'
        }),
        'https://data.cityofchicago.org'
      );
    });

    it('should use provided domain for search_context', async () => {
      await handleCatalog({ domain: 'data.somecity.gov' });
      
      // Verify fetchFromSocrataApi was called with the provided domain
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/api/catalog/v1',
        expect.objectContaining({
          search_context: 'data.somecity.gov'
        }),
        'https://data.somecity.gov'
      );
    });

    it('should add query parameter if provided', async () => {
      await handleCatalog({ query: 'budget' });
      
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/api/catalog/v1',
        expect.objectContaining({
          q: 'budget'
        }),
        'https://data.cityofchicago.org'
      );
    });
  });

  describe('handleCategories', () => {
    it('should add search_context parameter with domain', async () => {
      // Set up mock to return an empty array for primary endpoint and valid data for fallback
      mockedFetchFromSocrataApi.mockImplementationOnce(async () => []);
      mockedFetchFromSocrataApi.mockImplementationOnce(async () => ({ categories: [{ name: 'Test', count: 1 }] }));
      
      await handleCategories({});
      
      // Verify both endpoints are tried with search_context
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(2);
      expect(mockedFetchFromSocrataApi).toHaveBeenNthCalledWith(
        1,
        '/api/catalog/v1/domain_categories',
        expect.objectContaining({
          search_context: 'data.cityofchicago.org'
        }),
        'https://data.cityofchicago.org'
      );
      expect(mockedFetchFromSocrataApi).toHaveBeenNthCalledWith(
        2,
        '/api/catalog/v1',
        expect.objectContaining({
          search_context: 'data.cityofchicago.org',
          only: 'categories'
        }),
        'https://data.cityofchicago.org'
      );
    });
  });

  describe('handleTags', () => {
    it('should add search_context parameter with domain', async () => {
      // Set up mock to return an empty array for primary endpoint and valid data for fallback
      mockedFetchFromSocrataApi.mockImplementationOnce(async () => []);
      mockedFetchFromSocrataApi.mockImplementationOnce(async () => ({ tags: [{ name: 'Test', count: 1 }] }));
      
      await handleTags({});
      
      // Verify both endpoints are tried with search_context
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(2);
      expect(mockedFetchFromSocrataApi).toHaveBeenNthCalledWith(
        1,
        '/api/catalog/v1/domain_tags',
        expect.objectContaining({
          search_context: 'data.cityofchicago.org'
        }),
        'https://data.cityofchicago.org'
      );
      expect(mockedFetchFromSocrataApi).toHaveBeenNthCalledWith(
        2,
        '/api/catalog/v1',
        expect.objectContaining({
          search_context: 'data.cityofchicago.org',
          only: 'tags'
        }),
        'https://data.cityofchicago.org'
      );
    });
  });

  describe('handleDatasetMetadata', () => {
    it('should fetch dataset metadata with correct parameters', async () => {
      await handleDatasetMetadata({ datasetId: 'abc-123' });
      
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/api/views/abc-123',
        {},
        'https://data.cityofchicago.org'
      );
    });
  });

  describe('handleColumnInfo', () => {
    it('should fetch column info with correct parameters', async () => {
      await handleColumnInfo({ datasetId: 'abc-123' });
      
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/api/views/abc-123/columns',
        {},
        'https://data.cityofchicago.org'
      );
    });
  });

  describe('handleDataAccess', () => {
    it('should set pagination parameters correctly', async () => {
      await handleDataAccess({ datasetId: 'abc-123', limit: 20, offset: 10 });
      
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/resource/abc-123.json',
        expect.objectContaining({
          $limit: 20,
          $offset: 10
        }),
        'https://data.cityofchicago.org'
      );
    });

    it('should handle soqlQuery parameter correctly', async () => {
      await handleDataAccess({ datasetId: 'abc-123', soqlQuery: 'SELECT * WHERE amount > 1000' });
      
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/resource/abc-123.json',
        expect.objectContaining({
          $query: 'SELECT * WHERE amount > 1000'
        }),
        'https://data.cityofchicago.org'
      );
    });

    it('should handle individual SoQL parameters correctly', async () => {
      await handleDataAccess({ 
        datasetId: 'abc-123', 
        select: 'name, amount', 
        where: 'amount > 1000',
        order: 'amount DESC',
        group: 'name',
        having: 'sum(amount) > 5000',
        q: 'important'
      });
      
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/resource/abc-123.json',
        expect.objectContaining({
          $select: 'name, amount',
          $where: 'amount > 1000',
          $order: 'amount DESC',
          $group: 'name',
          $having: 'sum(amount) > 5000',
          $q: 'important'
        }),
        'https://data.cityofchicago.org'
      );
    });

    it('should prioritize soqlQuery over individual parameters', async () => {
      await handleDataAccess({ 
        datasetId: 'abc-123', 
        soqlQuery: 'SELECT * WHERE amount > 1000',
        select: 'name, amount', 
        where: 'amount > 500'
      });
      
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/resource/abc-123.json',
        expect.objectContaining({
          $query: 'SELECT * WHERE amount > 1000'
        }),
        'https://data.cityofchicago.org'
      );
      
      // Verify that the individual SoQL parameters were not included
      const params = mockedFetchFromSocrataApi.mock.calls[0][1];
      expect(params.$select).toBeUndefined();
      expect(params.$where).toBeUndefined();
    });
  });

  describe('handleSocrataTool', () => {
    it('should route to the correct handler based on type', async () => {
      // Test each type of operation
      await handleSocrataTool({ type: 'catalog', query: 'budget' });
      await handleSocrataTool({ type: 'metadata', query: 'abc-123' });
      await handleSocrataTool({ type: 'query', dataset_id: 'abc-123', limit: 20 });

      // Verify that each call counts (query type makes 2 calls - count + data)
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(4);
    });

    it('should map query to $query for query operations', async () => {
      await handleSocrataTool({ 
        type: 'query', 
        dataset_id: 'abc-123', 
        query: 'SELECT * WHERE amount > 1000' 
      });
      
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/resource/abc-123.json',
        expect.objectContaining({
          $query: 'SELECT * WHERE amount > 1000'
        }),
        'https://data.cityofchicago.org'
      );
    });

    it('should throw an error for invalid operation type', async () => {
      await expect(handleSocrataTool({ type: 'invalid' as any }))
        .rejects.toThrow('Unknown Socrata operation type: invalid');
    });

    it('should throw an error when datasetId is missing for dataset operations', async () => {
      await expect(handleSocrataTool({ type: 'metadata' }))
        .rejects.toThrow('dataset_id is required for type=metadata');

      await expect(handleSocrataTool({ type: 'query' }))
        .rejects.toThrow('Dataset ID (from dataset_id field, or from query field if not a SoQL SELECT) is required for type=query operation.');
    });

    it('should accept dataset_id directly for metadata operations', async () => {
      await handleSocrataTool({ type: 'metadata', dataset_id: 'xyz-789' });

      expect(mockedFetchFromSocrataApi).toHaveBeenCalledTimes(1);
      expect(mockedFetchFromSocrataApi).toHaveBeenCalledWith(
        '/api/views/xyz-789',
        {},
        'https://data.cityofchicago.org'
      );
    });
  });

  describe('UNIFIED_SOCRATA_TOOL', () => {
    it('should have the correct name and description', () => {
      expect(UNIFIED_SOCRATA_TOOL.name).toBe('get_data');
      expect(UNIFIED_SOCRATA_TOOL.description).toBeDefined();
      expect(typeof UNIFIED_SOCRATA_TOOL.description).toBe('string');
    });

    it('should have a valid inputSchema', () => {
      const schema = UNIFIED_SOCRATA_TOOL.inputSchema as any;

      // Verify required properties
      expect(schema.type).toBe('object');

      // Ensure properties object exists
      expect(schema.properties).toBeDefined();
      if (!schema.properties) return; // TypeScript guard

      // Verify type property exists
      expect(schema.properties.type).toBeDefined();

      // Verify query property exists
      expect(schema.properties.query).toBeDefined();
    });
  });
});