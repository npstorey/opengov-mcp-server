import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchIds } from './search-ids.js';
import { retrieveDocuments, retrieveAllDocuments } from './document-retrieval.js';
import { documentCache } from '../utils/cache.js';
import { McpError } from '../utils/mcp-errors.js';

// Mock the API module
vi.mock('../utils/api.js', () => ({
  fetchFromSocrataApi: vi.fn()
}));

import { fetchFromSocrataApi } from '../utils/api.js';
const mockFetchFromSocrataApi = fetchFromSocrataApi as unknown as ReturnType<typeof vi.fn>;

describe('Split Tools - Search and Document Retrieval', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    documentCache.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('searchIds', () => {
    it('should return id/score pairs for matching documents', async () => {
      const mockData = [
        { ':id': '123', name: 'Test Document', description: 'Contains test data' },
        { ':id': '456', name: 'Another Document', description: 'More test content' }
      ];

      mockFetchFromSocrataApi.mockResolvedValueOnce(mockData);

      const result = await searchIds({
        datasetId: 'test-dataset',
        domain: 'data.example.com',
        query: 'test',
        limit: 10
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('score');
    });

    it('should handle missing ID fields gracefully', async () => {
      const mockData = [
        { name: 'No ID Document', description: 'Missing ID field' }
      ];

      mockFetchFromSocrataApi.mockResolvedValueOnce(mockData);

      const result = await searchIds({
        datasetId: 'test-dataset',
        domain: 'data.example.com',
        limit: 10
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toMatch(/^row_\d+$/);
    });

    it('should enforce size limits', async () => {
      // Create a large dataset
      const mockData = Array(200).fill(null).map((_, i) => ({
        ':id': `id-${i}`,
        name: `Document ${i}`,
        description: 'x'.repeat(1000) // Large description
      }));

      mockFetchFromSocrataApi.mockResolvedValueOnce(mockData);
      // Mock for count query
      mockFetchFromSocrataApi.mockResolvedValueOnce([{ count: '200' }]);

      const result = await searchIds({
        datasetId: 'test-dataset',
        domain: 'data.example.com',
        limit: 200
      });

      // Should return all 200 since each object is small enough
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });

  describe('retrieveDocuments', () => {
    it('should fetch documents by IDs', async () => {
      const mockData = [
        { ':id': '123', name: 'Document 1', data: 'Full content 1' },
        { ':id': '456', name: 'Document 2', data: 'Full content 2' }
      ];

      // Mock for detectIdField
      mockFetchFromSocrataApi.mockResolvedValueOnce([{ ':id': 'test' }]);
      // Mock for actual data fetch
      mockFetchFromSocrataApi.mockResolvedValueOnce(mockData);

      const result = await retrieveDocuments({
        ids: ['123', '456'],
        datasetId: 'test-dataset',
        domain: 'data.example.com'
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ ':id': '123' }));
      expect(result[1]).toEqual(expect.objectContaining({ ':id': '456' }));
    });

    it('should enforce maximum rows per request', async () => {
      const ids = Array(100).fill(null).map((_, i) => `id-${i}`);

      // Should throw an error for too many IDs
      await expect(retrieveDocuments({
        ids,
        datasetId: 'test-dataset',
        domain: 'data.example.com'
      })).rejects.toThrow('Cannot retrieve more than 50 documents at once');
    });

    it('should use cache for repeated requests', async () => {
      const mockData = [
        { ':id': '123', name: 'Cached Document' }
      ];

      // Mock for detectIdField
      mockFetchFromSocrataApi.mockResolvedValueOnce([{ ':id': 'test' }]);
      // Mock for actual data fetch
      mockFetchFromSocrataApi.mockResolvedValueOnce(mockData);

      // First request
      const result1 = await retrieveDocuments({
        ids: ['123'],
        datasetId: 'test-dataset',
        domain: 'data.example.com'
      });

      // Second request (should use cache)
      const result2 = await retrieveDocuments({
        ids: ['123'],
        datasetId: 'test-dataset',
        domain: 'data.example.com'
      });

      // Should have called API twice total (once for detectIdField, once for data)
      expect(mockFetchFromSocrataApi).toHaveBeenCalledTimes(2);
      expect(result1).toEqual(result2);
    });

    it('should handle row-based IDs', async () => {
      const mockData = Array(10).fill(null).map((_, i) => ({
        ':id': `actual-id-${i}`,
        name: `Row ${i}`
      }));

      // Mock for detectIdField
      mockFetchFromSocrataApi.mockResolvedValueOnce([{ ':id': 'test' }]);
      // Mock for row-based fetch
      mockFetchFromSocrataApi.mockResolvedValueOnce(mockData);

      const result = await retrieveDocuments({
        ids: ['row_2', 'row_5', 'row_7'],
        datasetId: 'test-dataset',
        domain: 'data.example.com'
      });

      expect(result).toHaveLength(3);
      expect(mockFetchFromSocrataApi).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          $offset: 2,
          $limit: expect.any(Number)
        }),
        expect.any(String)
      );
    });
  });

  describe('retrieveAllDocuments', () => {
    it('should fetch all documents with default limits', async () => {
      const mockCount = [{ count: '1000' }];
      const mockData = Array(50).fill(null).map((_, i) => ({
        ':id': `id-${i}`,
        name: `Document ${i}`
      }));

      mockFetchFromSocrataApi
        .mockResolvedValueOnce(mockCount)
        .mockResolvedValueOnce(mockData);

      const result = await retrieveAllDocuments({
        datasetId: 'test-dataset',
        domain: 'data.example.com'
      });

      expect(result).toHaveLength(50);
    });

    it('should handle "all" limit request', async () => {
      const mockCount = [{ count: '100' }];
      const mockData = Array(100).fill(null).map((_, i) => ({
        ':id': `id-${i}`,
        name: `Document ${i}`
      }));

      mockFetchFromSocrataApi
        .mockResolvedValueOnce(mockCount)
        .mockResolvedValueOnce(mockData);

      const result = await retrieveAllDocuments({
        datasetId: 'test-dataset',
        domain: 'data.example.com',
        limit: 'all'
      });

      expect(result).toHaveLength(100);
    });
  });
});