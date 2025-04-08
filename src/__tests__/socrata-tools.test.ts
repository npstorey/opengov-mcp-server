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
    }
    return { error: 'Unexpected path' };
  })
}));

// Now import the actual functions
import { 
  handleCatalogTool as handleCatalog, 
  handleCategoriesTool as handleCategories, 
  handleTagsTool as handleTags 
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
});