import { describe, it, expect } from 'vitest';
import { buildLedgerUrl, parseLedgerLookupResult, formatLedgerEvents } from './ledger.js';

describe('buildLedgerUrl', () => {
  it('joins a trimmed base URL and encoded checkout intent id into the ledger endpoint path', () => {
    expect(buildLedgerUrl('https://api.commercebackend.com/', 'chk_abc123')).toBe(
      'https://api.commercebackend.com/v1/operator/checkout-intents/chk_abc123/events'
    );
  });

  it('encodes ids containing characters that are not URL-safe', () => {
    expect(buildLedgerUrl('https://api.commercebackend.com', 'chk abc/123')).toBe(
      'https://api.commercebackend.com/v1/operator/checkout-intents/chk%20abc%2F123/events'
    );
  });

  it('trims whitespace from the id and collapses trailing slashes on the base URL', () => {
    expect(buildLedgerUrl('https://api.commercebackend.com///', '  chk_xyz  ')).toBe(
      'https://api.commercebackend.com/v1/operator/checkout-intents/chk_xyz/events'
    );
  });
});

describe('parseLedgerLookupResult', () => {
  it('reports an invalid-operator-key message on 401', () => {
    const result = parseLedgerLookupResult(401, { error: { message: 'unauthorized' } });
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain('Invalid operator key');
  });

  it('reports a not-found message on 404 without leaking the raw error body', () => {
    const result = parseLedgerLookupResult(404, { error: { code: 'CHECKOUT_INTENT_NOT_FOUND' } });
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe('No checkout intent found with that id.');
  });

  it('surfaces the API error message for other non-2xx statuses', () => {
    const result = parseLedgerLookupResult(500, { error: { message: 'boom' } });
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe('Request failed with status 500: boom');
  });

  it('returns the parsed body as data on a 200', () => {
    const body = { checkoutIntentId: 'chk_1', status: 'paid', events: [] };
    const result = parseLedgerLookupResult(200, body);
    expect(result).toEqual({ ok: true, data: body });
  });
});

describe('formatLedgerEvents', () => {
  it('returns an empty array for missing or empty input', () => {
    expect(formatLedgerEvents(undefined)).toEqual([]);
    expect(formatLedgerEvents([])).toEqual([]);
  });

  it('preserves event order and formats detail as JSON text when present', () => {
    const events = [
      { type: 'created', occurredAt: '2026-01-01T00:00:00.000Z', detail: { amountTotal: 1000 } },
      { type: 'paid', occurredAt: '2026-01-02T00:00:00.000Z', detail: { orderId: 'ord_1' } },
    ];
    expect(formatLedgerEvents(events)).toEqual([
      { type: 'created', occurredAt: '2026-01-01T00:00:00.000Z', detailText: '{"amountTotal":1000}' },
      { type: 'paid', occurredAt: '2026-01-02T00:00:00.000Z', detailText: '{"orderId":"ord_1"}' },
    ]);
  });

  it('leaves detailText empty when an event has no detail', () => {
    const [row] = formatLedgerEvents([{ type: 'human_approved', occurredAt: '2026-01-01T00:00:00.000Z' }]);
    expect(row.detailText).toBe('');
  });
});
