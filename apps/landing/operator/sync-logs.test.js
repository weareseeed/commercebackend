import { describe, it, expect } from 'vitest';
import { buildSyncLogsUrl, parseSyncLogsResult, formatSyncLogs } from './sync-logs.js';

describe('buildSyncLogsUrl', () => {
  it('builds the sync-logs endpoint path with a trimmed base URL and no query string by default', () => {
    expect(buildSyncLogsUrl('https://api.commercebackend.com/')).toBe(
      'https://api.commercebackend.com/v1/connectors/sync-logs'
    );
  });

  it('collapses trailing slashes on the base URL', () => {
    expect(buildSyncLogsUrl('https://api.commercebackend.com///')).toBe(
      'https://api.commercebackend.com/v1/connectors/sync-logs'
    );
  });

  it('appends limit and offset as query params when provided', () => {
    expect(buildSyncLogsUrl('https://api.commercebackend.com', { limit: 20, offset: 40 })).toBe(
      'https://api.commercebackend.com/v1/connectors/sync-logs?limit=20&offset=40'
    );
  });

  it('omits params that are not provided', () => {
    expect(buildSyncLogsUrl('https://api.commercebackend.com', { limit: 10 })).toBe(
      'https://api.commercebackend.com/v1/connectors/sync-logs?limit=10'
    );
  });
});

describe('parseSyncLogsResult', () => {
  it('reports an invalid-operator-key message on 401', () => {
    const result = parseSyncLogsResult(401, { error: { message: 'unauthorized' } });
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain('Invalid operator key');
  });

  it('surfaces the API error message for other non-2xx statuses', () => {
    const result = parseSyncLogsResult(500, { error: { message: 'boom' } });
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe('Request failed with status 500: boom');
  });

  it('returns the parsed body as data on a 200', () => {
    const body = { syncLogs: [], pagination: { limit: 20, offset: 0 } };
    const result = parseSyncLogsResult(200, body);
    expect(result).toEqual({ ok: true, data: body });
  });
});

describe('formatSyncLogs', () => {
  it('returns an empty array for missing or empty input', () => {
    expect(formatSyncLogs(undefined)).toEqual([]);
    expect(formatSyncLogs([])).toEqual([]);
  });

  it('preserves newest-first order across multiple connectors and shapes each row', () => {
    const syncLogs = [
      {
        id: 'sync_2',
        connector: 'shopify',
        sellerAgentId: 'agent_seller_2',
        status: 'success',
        itemsImported: 5,
        itemsFailed: 0,
        errors: null,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'sync_1',
        connector: 'square',
        sellerAgentId: 'agent_seller_1',
        status: 'partial',
        itemsImported: 3,
        itemsFailed: 1,
        errors: [{ message: 'bad item' }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    expect(formatSyncLogs(syncLogs)).toEqual([
      {
        connector: 'shopify',
        sellerAgentId: 'agent_seller_2',
        status: 'success',
        itemsImported: 5,
        itemsFailed: 0,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        connector: 'square',
        sellerAgentId: 'agent_seller_1',
        status: 'partial',
        itemsImported: 3,
        itemsFailed: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('defaults missing item counts to zero', () => {
    const [row] = formatSyncLogs([
      { connector: 'bigcommerce', sellerAgentId: 'agent_x', status: 'failed', errors: ['network error'], createdAt: '2026-01-03T00:00:00.000Z' },
    ]);
    expect(row.itemsImported).toBe(0);
    expect(row.itemsFailed).toBe(0);
  });
});
