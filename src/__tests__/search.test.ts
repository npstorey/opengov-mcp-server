import { describe, test, expect, vi, beforeEach } from 'vitest';
import { handleSearch, getRowCount, MAX_ROWS, DEFAULT_PREVIEW_ROWS, ROW_FETCH_CAP } from '../tools/search.js';
import * as api from '../utils/api.js';

// Mock the API module
vi.mock('../utils/api.js');

describe('Search Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env var for tests
    process.env.ROW_FETCH_CAP = '100000';
  });

  describe('getRowCount', () => {
    test('should fetch row count correctly', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      mockFetch.mockResolvedValueOnce([{ count: '12345' }]);

      const count = await getRowCount({
        datasetId: 'test-123',
        domain: 'data.test.gov',
        where: 'amount > 100'
      });

      expect(count).toBe(12345);
      expect(mockFetch).toHaveBeenCalledWith(
        '/resource/test-123.json',
        {
          $select: 'count(*)',
          $limit: 1,
          $where: 'amount > 100'
        },
        'https://data.test.gov'
      );
    });
  });

  describe('handleSearch', () => {
    test('returns full data when dataset is small', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      const mockData = Array(123).fill({}).map((_, i) => ({ id: i, value: `item-${i}` }));
      
      // First call: count
      mockFetch.mockResolvedValueOnce([{ count: '123' }]);
      // Second call: data
      mockFetch.mockResolvedValueOnce(mockData);

      const result = await handleSearch({
        datasetId: 'small-dataset',
        domain: 'data.test.gov'
      });

      expect(result).toEqual({
        data: mockData,
        is_sample: false,
        returned_rows: 123,
        total_rows: 123
      });

      // Should have called count first, then fetched all data
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('marks as sample when dataset is huge and no explicit limit', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      const mockData = Array(DEFAULT_PREVIEW_ROWS).fill({}).map((_, i) => ({ id: i }));
      
      // First call: count shows huge dataset
      mockFetch.mockResolvedValueOnce([{ count: '120000' }]);
      // Second call: preview data
      mockFetch.mockResolvedValueOnce(mockData);

      const result = await handleSearch({
        datasetId: 'huge-dataset',
        domain: 'data.test.gov'
      });

      expect(result).toEqual({
        data: mockData,
        is_sample: true,
        returned_rows: DEFAULT_PREVIEW_ROWS,
        total_rows: 120000,
        has_more: true,
        next_offset: DEFAULT_PREVIEW_ROWS
      });

      // Should fetch only preview rows
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/resource/huge-dataset.json',
        {
          $limit: DEFAULT_PREVIEW_ROWS,
          $offset: 0
        },
        'https://data.test.gov'
      );
    });

    test('paginates when user requests all data within cap', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      const totalRows = 60000;
      
      // First call: count
      mockFetch.mockResolvedValueOnce([{ count: totalRows.toString() }]);
      
      // Two paginated calls (50k + 10k)
      const firstBatch = Array(MAX_ROWS).fill({}).map((_, i) => ({ id: i }));
      const secondBatch = Array(10000).fill({}).map((_, i) => ({ id: i + MAX_ROWS }));
      
      mockFetch.mockResolvedValueOnce(firstBatch);
      mockFetch.mockResolvedValueOnce(secondBatch);

      const result = await handleSearch({
        datasetId: 'paginated-dataset',
        domain: 'data.test.gov',
        limit: 'all'
      });

      expect(result).toEqual({
        data: [...firstBatch, ...secondBatch],
        is_sample: false,
        returned_rows: 60000,
        total_rows: 60000,
        has_more: false
      });

      // Count + 2 pages
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('respects ROW_FETCH_CAP when dataset exceeds cap', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      const totalRows = 150000;
      
      // First call: count
      mockFetch.mockResolvedValueOnce([{ count: totalRows.toString() }]);
      
      // Two full batches up to cap (50k + 50k = 100k)
      const firstBatch = Array(MAX_ROWS).fill({}).map((_, i) => ({ id: i }));
      const secondBatch = Array(MAX_ROWS).fill({}).map((_, i) => ({ id: i + MAX_ROWS }));
      
      mockFetch.mockResolvedValueOnce(firstBatch);
      mockFetch.mockResolvedValueOnce(secondBatch);

      const result = await handleSearch({
        datasetId: 'huge-all-dataset',
        domain: 'data.test.gov',
        limit: 'all'
      });

      expect(result).toEqual({
        data: [...firstBatch, ...secondBatch],
        is_sample: false,
        returned_rows: 100000,
        total_rows: 150000,
        has_more: true,
        next_offset: 100000
      });

      // Should stop at cap
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('handles full SoQL query', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      const mockData = Array(42).fill({}).map((_, i) => ({ id: i }));
      
      mockFetch.mockResolvedValueOnce(mockData);

      const result = await handleSearch({
        datasetId: 'soql-dataset',
        domain: 'data.test.gov',
        soqlQuery: 'SELECT * WHERE category = "test" LIMIT 42'
      });

      expect(result).toEqual({
        data: mockData,
        is_sample: false,
        returned_rows: 42,
        total_rows: 42,
        has_more: false
      });

      // Should make only one call with the full query
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/resource/soql-dataset.json',
        {
          $query: 'SELECT * WHERE category = "test" LIMIT 42'
        },
        'https://data.test.gov'
      );
    });

    test('uses custom limit when provided', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      const mockData = Array(500).fill({}).map((_, i) => ({ id: i }));
      
      // First call: count
      mockFetch.mockResolvedValueOnce([{ count: '10000' }]);
      // Second call: limited data
      mockFetch.mockResolvedValueOnce(mockData);

      const result = await handleSearch({
        datasetId: 'custom-limit-dataset',
        domain: 'data.test.gov',
        limit: 500
      });

      expect(result).toEqual({
        data: mockData,
        is_sample: false,
        returned_rows: 500,
        total_rows: 10000
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        '/resource/custom-limit-dataset.json',
        {
          $limit: 500,
          $offset: 0
        },
        'https://data.test.gov'
      );
    });

    test('applies filters correctly', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      
      // First call: count with filters
      mockFetch.mockResolvedValueOnce([{ count: '50' }]);
      // Second call: filtered data
      mockFetch.mockResolvedValueOnce(Array(50).fill({}).map((_, i) => ({ id: i })));

      await handleSearch({
        datasetId: 'filtered-dataset',
        domain: 'data.test.gov',
        where: 'amount > 1000',
        select: 'id, name, amount',
        order: 'amount DESC',
        q: 'important'
      });

      // Check that filters were applied to both count and data queries
      expect(mockFetch).toHaveBeenCalledWith(
        '/resource/filtered-dataset.json',
        {
          $select: 'count(*)',
          $limit: 1,
          $where: 'amount > 1000',
          $q: 'important'
        },
        'https://data.test.gov'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        '/resource/filtered-dataset.json',
        {
          $limit: 50,
          $offset: 0,
          $select: 'id, name, amount',
          $where: 'amount > 1000',
          $order: 'amount DESC',
          $q: 'important'
        },
        'https://data.test.gov'
      );
    });

    test('handles offset correctly', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      const mockData = Array(100).fill({}).map((_, i) => ({ id: i + 1000 }));
      
      // First call: count
      mockFetch.mockResolvedValueOnce([{ count: '5000' }]);
      // Second call: offset data
      mockFetch.mockResolvedValueOnce(mockData);

      const result = await handleSearch({
        datasetId: 'offset-dataset',
        domain: 'data.test.gov',
        limit: 100,
        offset: 1000
      });

      expect(result).toEqual({
        data: mockData,
        is_sample: false,
        returned_rows: 100,
        total_rows: 5000
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        '/resource/offset-dataset.json',
        {
          $limit: 100,
          $offset: 1000
        },
        'https://data.test.gov'
      );
    });

    test('handles empty result gracefully', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      
      // First call: count = 0
      mockFetch.mockResolvedValueOnce([{ count: '0' }]);
      // Second call: empty array
      mockFetch.mockResolvedValueOnce([]);

      const result = await handleSearch({
        datasetId: 'empty-dataset',
        domain: 'data.test.gov'
      });

      expect(result).toEqual({
        data: [],
        is_sample: false,
        returned_rows: 0,
        total_rows: 0
      });
    });

    test('detects when SoQL query hits MAX_ROWS limit', async () => {
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      const mockData = Array(MAX_ROWS).fill({}).map((_, i) => ({ id: i }));
      
      mockFetch.mockResolvedValueOnce(mockData);

      const result = await handleSearch({
        datasetId: 'max-rows-dataset',
        domain: 'data.test.gov',
        soqlQuery: 'SELECT * FROM dataset'
      });

      expect(result).toEqual({
        data: mockData,
        is_sample: false,
        returned_rows: MAX_ROWS,
        total_rows: MAX_ROWS,
        has_more: true // Indicates there might be more data
      });
    });

    test('respects custom ROW_FETCH_CAP from environment', async () => {
      process.env.ROW_FETCH_CAP = '25000';
      
      // Re-import to pick up new env var
      vi.resetModules();
      const { handleSearch: handleSearchWithNewCap } = await import('../tools/search.js');
      
      const mockFetch = vi.mocked(api.fetchFromSocrataApi);
      
      // First call: count shows 30k rows
      mockFetch.mockResolvedValueOnce([{ count: '30000' }]);
      // Second call: first batch (will be limited to 25k due to cap)
      mockFetch.mockResolvedValueOnce(Array(25000).fill({}).map((_, i) => ({ id: i })));

      const result = await handleSearchWithNewCap({
        datasetId: 'custom-cap-dataset',
        domain: 'data.test.gov',
        limit: 'all'
      });

      expect(result.returned_rows).toBe(25000);
      expect(result.total_rows).toBe(30000);
      expect(result.has_more).toBe(true);
      expect(result.next_offset).toBe(25000);
    });
  });
});