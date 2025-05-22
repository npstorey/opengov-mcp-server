import { describe, it, expect } from 'vitest';
import { buildSocrataUrl } from '../src/mcp/tools/socrata.js';

describe('buildSocrataUrl', () => {
  it('catalog query', () => {
    expect(
      buildSocrataUrl({
        domain: 'data.cityofnewyork.us',
        type: 'catalog',
        query: 'noise',
        limit: 5,
        offset: 0
      })
    ).toBe('https://data.cityofnewyork.us/api/catalog/v1?q=noise&limit=5&offset=0');
  });

  it('dataset paging', () => {
    expect(
      buildSocrataUrl({
        domain: 'data.cityofnewyork.us',
        type: 'dataset',
        resourceId: 'erm2-nwe9',
        limit: 5,
        offset: 0
      })
    ).toBe('https://data.cityofnewyork.us/resource/erm2-nwe9.json?$limit=5&$offset=0');
  });

  it('dataset soql', () => {
    expect(
      buildSocrataUrl({
        domain: 'data.cityofnewyork.us',
        type: 'dataset',
        resourceId: 'erm2-nwe9',
        query: 'SELECT count(*)'
      })
    ).toBe('https://data.cityofnewyork.us/resource/erm2-nwe9.json?$query=SELECT%20count(*)');
  });
});
