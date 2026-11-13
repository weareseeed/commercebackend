// Pure helpers backing the checkout event ledger lookup panel (weekly
// backlog item 19). Kept separate from app.js's DOM wiring so the request
// shaping and response interpretation can run under a plain unit test
// without a browser/DOM environment.

export function buildLedgerUrl(baseUrl, checkoutIntentId) {
  const trimmedBase = (baseUrl || '').trim().replace(/\/+$/, '');
  const trimmedId = (checkoutIntentId || '').trim();
  return `${trimmedBase}/v1/operator/checkout-intents/${encodeURIComponent(trimmedId)}/events`;
}

// Interprets a fetch response's status + parsed JSON body into a single
// shape the rendering layer can switch on, mirroring the existing metrics
// panel's status handling (401 / 404 / other non-2xx / success).
export function parseLedgerLookupResult(status, body) {
  if (status === 401) {
    return { ok: false, errorMessage: 'Invalid operator key. Check the X-Operator-Key value and try again.' };
  }
  if (status === 404) {
    return { ok: false, errorMessage: 'No checkout intent found with that id.' };
  }
  if (status < 200 || status >= 300) {
    const detail = body && body.error && body.error.message ? `: ${body.error.message}` : '';
    return { ok: false, errorMessage: `Request failed with status ${status}${detail}` };
  }
  return { ok: true, data: body };
}

// Normalizes the ledger's ordered events for table rendering. Order is
// preserved exactly as returned by the API (already chronological); this
// only shapes each row's displayable fields.
export function formatLedgerEvents(events) {
  return (events || []).map((event) => ({
    type: event.type,
    occurredAt: event.occurredAt,
    detailText: event.detail ? JSON.stringify(event.detail) : '',
  }));
}
