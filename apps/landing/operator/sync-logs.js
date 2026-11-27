// Pure helpers backing the connector sync log panel (weekly backlog item 21).
// Kept separate from app.js's DOM wiring so the request shaping and response
// interpretation can run under a plain unit test without a browser/DOM
// environment, matching ledger.js's pattern.

export function buildSyncLogsUrl(baseUrl, { limit, offset } = {}) {
  const trimmedBase = (baseUrl || '').trim().replace(/\/+$/, '');
  const params = new URLSearchParams();
  if (limit !== undefined && limit !== null && limit !== '') {
    params.set('limit', String(limit));
  }
  if (offset !== undefined && offset !== null && offset !== '') {
    params.set('offset', String(offset));
  }
  const query = params.toString();
  return `${trimmedBase}/v1/connectors/sync-logs${query ? `?${query}` : ''}`;
}

// Interprets a fetch response's status + parsed JSON body into a single
// shape the rendering layer can switch on, mirroring parseLedgerLookupResult
// (401 / other non-2xx / success). There is no 404 case here: this is a list
// endpoint, not a lookup by id.
export function parseSyncLogsResult(status, body) {
  if (status === 401) {
    return { ok: false, errorMessage: 'Invalid operator key. Check the X-Operator-Key value and try again.' };
  }
  if (status < 200 || status >= 300) {
    const detail = body && body.error && body.error.message ? `: ${body.error.message}` : '';
    return { ok: false, errorMessage: `Request failed with status ${status}${detail}` };
  }
  return { ok: true, data: body };
}

// Normalizes sync log rows for table rendering. Order is preserved exactly
// as returned by the API (already newest-first); this only shapes each
// row's displayable fields.
export function formatSyncLogs(syncLogs) {
  return (syncLogs || []).map((log) => ({
    connector: log.connector,
    sellerAgentId: log.sellerAgentId,
    status: log.status,
    itemsImported: typeof log.itemsImported === 'number' ? log.itemsImported : 0,
    itemsFailed: typeof log.itemsFailed === 'number' ? log.itemsFailed : 0,
    createdAt: log.createdAt,
  }));
}
