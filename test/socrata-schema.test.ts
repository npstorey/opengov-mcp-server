import { describe, it, expect } from 'vitest';
import { GetDataArgs } from '../src/mcp/tools/socrata.js';

describe('GetDataArgs schema', () => {
  it('allows catalog with query', () => {
    expect(() =>
      GetDataArgs.parse({ domain: 'data.cityofnewyork.us', type: 'catalog', query: 'noise' })
    ).not.toThrow();
  });

  it('allows dataset with resourceId', () => {
    expect(() =>
      GetDataArgs.parse({ domain: 'data.cityofnewyork.us', type: 'dataset', resourceId: 'erm2-nwe9' })
    ).not.toThrow();
  });

  it('allows dataset with soql query', () => {
    expect(() =>
      GetDataArgs.parse({ domain: 'data.cityofnewyork.us', type: 'dataset', resourceId: 'erm2-nwe9', query: 'SELECT 1' })
    ).not.toThrow();
  });

  it('rejects missing selectors', () => {
    expect(() =>
      GetDataArgs.parse({ domain: 'x', type: 'catalog' })
    ).toThrow();
  });
});
