// Operator dashboard — read-only view over GET /v1/operator/metrics and
// GET /v1/operator/checkout-intents/:id/events.
//
// No frameworks, no npm dependencies: plain fetch() + DOM updates, matching
// the rest of apps/landing. This page never calls any mutating endpoint.

import { buildLedgerUrl, parseLedgerLookupResult, formatLedgerEvents } from './ledger.js';

const DEFAULT_BASE_URL = 'https://api.commercebackend.com';

// The operator key is sensitive and lives only in sessionStorage (per-tab,
// cleared when the browser/tab session ends) — never localStorage, never
// written anywhere else, never committed. The base URL is not sensitive; it
// is kept in sessionStorage too, purely so a reload doesn't lose it.
const STORAGE_KEYS = {
  baseUrl: 'cb_operator_base_url',
  operatorKey: 'cb_operator_key',
};

function readSessionStorage(key) {
  try {
    return sessionStorage.getItem(key) || '';
  } catch {
    // sessionStorage can throw in locked-down browser contexts; degrade to
    // "nothing remembered" rather than breaking the page.
    return '';
  }
}

function writeSessionStorage(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Best-effort only.
  }
}

const baseUrlInput = document.getElementById('base-url');
const operatorKeyInput = document.getElementById('operator-key');
const configForm = document.getElementById('config-form');
const refreshBtn = document.getElementById('refresh-btn');
const statusEl = document.getElementById('status');
const generatedAtEl = document.getElementById('generated-at');
const statGrid = document.getElementById('stat-grid');
const criticalTotalEl = document.getElementById('critical-total');
const criticalBody = document.getElementById('critical-body');
const criticalEmpty = document.getElementById('critical-empty');

const STAT_LABELS = [
  ['agents', 'Agents'],
  ['listings', 'Listings'],
  ['offers', 'Offers'],
  ['checkoutIntents', 'Checkout intents'],
  ['orders', 'Orders'],
  ['queryLogs', 'Query logs'],
];

baseUrlInput.value = readSessionStorage(STORAGE_KEYS.baseUrl) || DEFAULT_BASE_URL;
operatorKeyInput.value = readSessionStorage(STORAGE_KEYS.operatorKey);

function setStatus(kind, message) {
  statusEl.className = 'status';
  if (!kind) {
    statusEl.textContent = '';
    return;
  }
  statusEl.classList.add(kind);
  statusEl.textContent = message;
}

function renderCounts(counts) {
  statGrid.innerHTML = '';
  for (const [key, label] of STAT_LABELS) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    const value = document.createElement('div');
    value.className = 'value';
    value.textContent = typeof counts[key] === 'number' ? counts[key].toLocaleString() : '—';
    const labelEl = document.createElement('div');
    labelEl.className = 'label';
    labelEl.textContent = label;
    card.appendChild(value);
    card.appendChild(labelEl);
    statGrid.appendChild(card);
  }
}

function renderCriticalEvents(criticalEvents) {
  criticalTotalEl.textContent =
    typeof criticalEvents.total === 'number' ? criticalEvents.total.toLocaleString() : '—';

  criticalBody.innerHTML = '';
  const codes = Object.entries(criticalEvents.byCode || {});
  if (codes.length === 0) {
    criticalEmpty.style.display = 'block';
    return;
  }
  criticalEmpty.style.display = 'none';
  for (const [code, count] of codes) {
    const row = document.createElement('tr');
    const codeCell = document.createElement('td');
    codeCell.textContent = code;
    const countCell = document.createElement('td');
    countCell.textContent = typeof count === 'number' ? count.toLocaleString() : String(count);
    row.appendChild(codeCell);
    row.appendChild(countCell);
    criticalBody.appendChild(row);
  }
}

async function fetchMetrics() {
  const baseUrl = baseUrlInput.value.trim().replace(/\/+$/, '');
  const operatorKey = operatorKeyInput.value;

  writeSessionStorage(STORAGE_KEYS.baseUrl, baseUrl);
  writeSessionStorage(STORAGE_KEYS.operatorKey, operatorKey);

  if (!baseUrl) {
    setStatus('error', 'Enter an API base URL.');
    return;
  }
  if (!operatorKey) {
    setStatus('error', 'Enter the operator key.');
    return;
  }

  refreshBtn.disabled = true;
  setStatus('loading', 'Loading metrics…');

  let response;
  try {
    response = await fetch(`${baseUrl}/v1/operator/metrics`, {
      method: 'GET',
      headers: {
        'X-Operator-Key': operatorKey,
      },
    });
  } catch (err) {
    refreshBtn.disabled = false;
    setStatus(
      'error',
      'Network error — could not reach the API. Check the base URL, CORS configuration, and your connection.'
    );
    return;
  }

  refreshBtn.disabled = false;

  if (response.status === 401) {
    setStatus('error', 'Invalid operator key. Check the X-Operator-Key value and try again.');
    return;
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body && body.error && body.error.message ? `: ${body.error.message}` : '';
    } catch {
      // response body wasn't JSON; ignore.
    }
    setStatus('error', `Request failed with status ${response.status}${detail}`);
    return;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    setStatus('error', 'The API returned a response that could not be parsed as JSON.');
    return;
  }

  setStatus(null);
  generatedAtEl.textContent = data.generatedAt
    ? `Last generated: ${new Date(data.generatedAt).toLocaleString()}`
    : 'Last generated: unknown';
  renderCounts(data.counts || {});
  renderCriticalEvents(data.criticalEvents || { total: 0, byCode: {} });
}

const ledgerForm = document.getElementById('ledger-form');
const ledgerIdInput = document.getElementById('ledger-checkout-intent-id');
const ledgerLookupBtn = document.getElementById('ledger-lookup-btn');
const ledgerStatusEl = document.getElementById('ledger-status');
const ledgerSummaryEl = document.getElementById('ledger-summary');
const ledgerTable = document.getElementById('ledger-table');
const ledgerBody = document.getElementById('ledger-body');
const ledgerEmpty = document.getElementById('ledger-empty');

function setLedgerStatus(kind, message) {
  ledgerStatusEl.className = 'status';
  if (!kind) {
    ledgerStatusEl.textContent = '';
    return;
  }
  ledgerStatusEl.classList.add(kind);
  ledgerStatusEl.textContent = message;
}

function renderLedger(data) {
  ledgerSummaryEl.textContent = `Checkout intent ${data.checkoutIntentId} — status: ${data.status}`;

  const rows = formatLedgerEvents(data.events);
  ledgerBody.innerHTML = '';
  if (rows.length === 0) {
    ledgerTable.style.display = 'none';
    ledgerEmpty.style.display = 'block';
    return;
  }
  ledgerEmpty.style.display = 'none';
  ledgerTable.style.display = 'table';
  for (const row of rows) {
    const tr = document.createElement('tr');
    const typeCell = document.createElement('td');
    typeCell.textContent = row.type;
    const occurredCell = document.createElement('td');
    occurredCell.textContent = row.occurredAt ? new Date(row.occurredAt).toLocaleString() : '—';
    const detailCell = document.createElement('td');
    detailCell.textContent = row.detailText;
    tr.appendChild(typeCell);
    tr.appendChild(occurredCell);
    tr.appendChild(detailCell);
    ledgerBody.appendChild(tr);
  }
}

async function lookupLedger() {
  const baseUrl = baseUrlInput.value.trim().replace(/\/+$/, '');
  const operatorKey = operatorKeyInput.value;
  const checkoutIntentId = ledgerIdInput.value.trim();

  if (!baseUrl) {
    setLedgerStatus('error', 'Enter an API base URL above.');
    return;
  }
  if (!operatorKey) {
    setLedgerStatus('error', 'Enter the operator key above.');
    return;
  }
  if (!checkoutIntentId) {
    setLedgerStatus('error', 'Enter a checkout intent id.');
    return;
  }

  ledgerLookupBtn.disabled = true;
  setLedgerStatus('loading', 'Looking up checkout intent…');
  ledgerTable.style.display = 'none';
  ledgerEmpty.style.display = 'none';
  ledgerSummaryEl.textContent = '';

  let response;
  try {
    response = await fetch(buildLedgerUrl(baseUrl, checkoutIntentId), {
      method: 'GET',
      headers: {
        'X-Operator-Key': operatorKey,
      },
    });
  } catch (err) {
    ledgerLookupBtn.disabled = false;
    setLedgerStatus(
      'error',
      'Network error — could not reach the API. Check the base URL, CORS configuration, and your connection.'
    );
    return;
  }

  ledgerLookupBtn.disabled = false;

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Response wasn't JSON; parseLedgerLookupResult still handles non-2xx
    // statuses without needing the body.
  }

  const result = parseLedgerLookupResult(response.status, body);
  if (!result.ok) {
    setLedgerStatus('error', result.errorMessage);
    return;
  }

  setLedgerStatus(null);
  renderLedger(result.data);
}

configForm.addEventListener('submit', (event) => {
  event.preventDefault();
  fetchMetrics();
});

ledgerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  lookupLedger();
});

// Keep sessionStorage in sync as the operator edits fields, even before they
// hit Refresh, so a reload doesn't lose in-progress edits either.
baseUrlInput.addEventListener('input', () => writeSessionStorage(STORAGE_KEYS.baseUrl, baseUrlInput.value.trim()));
operatorKeyInput.addEventListener('input', () => writeSessionStorage(STORAGE_KEYS.operatorKey, operatorKeyInput.value));
