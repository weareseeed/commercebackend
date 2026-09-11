// Operator dashboard — read-only view over GET /v1/operator/metrics.
//
// No frameworks, no npm dependencies: plain fetch() + DOM updates, matching
// the rest of apps/landing. This page never calls any mutating endpoint.

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

configForm.addEventListener('submit', (event) => {
  event.preventDefault();
  fetchMetrics();
});

// Keep sessionStorage in sync as the operator edits fields, even before they
// hit Refresh, so a reload doesn't lose in-progress edits either.
baseUrlInput.addEventListener('input', () => writeSessionStorage(STORAGE_KEYS.baseUrl, baseUrlInput.value.trim()));
operatorKeyInput.addEventListener('input', () => writeSessionStorage(STORAGE_KEYS.operatorKey, operatorKeyInput.value));
