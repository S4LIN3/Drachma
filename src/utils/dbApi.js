/**
 * Frontend Database Client with JWT auth, BroadcastChannel and SSE Synchronization.
 * All requests automatically attach the JWT token from localStorage.
 */

const API_BASE = '/api';
const AUTH_TOKEN_KEY = 'drachma_auth_token';

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function getAuthHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Cross-tab / PWA BroadcastChannel for instant local device synchronization
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('drachma_pwa_sync')
  : null;

function notifyLocalSync(eventType, payload) {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: eventType, payload, timestamp: Date.now() });
    } catch (_) {}
  }
}

/**
 * Handle 401 responses by dispatching an event for the app to redirect to login.
 */
function handleUnauthorized(res) {
  if (res.status === 401 || res.status === 403) {
    window.dispatchEvent(new CustomEvent('drachma:unauthorized'));
  }
}

export async function fetchDbData() {
  const res = await fetch(`${API_BASE}/data`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) {
    handleUnauthorized(res);
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`Failed to fetch database data: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

export async function dbToggleMeal(date, recurringItemId) {
  const res = await fetch(`${API_BASE}/meals/toggle`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ date, recurringItemId }),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to toggle meal in database');
  const data = await res.json();
  notifyLocalSync('MEAL_TOGGLED', { date, recurringItemId });
  return data;
}

export async function dbSaveMealNotes(date, notes) {
  const res = await fetch(`${API_BASE}/meals/notes`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ date, notes }),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to save notes in database');
  const data = await res.json();
  notifyLocalSync('NOTES_UPDATED', { date, notes });
  return data;
}

export async function dbSaveExpense(expenseData) {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(expenseData),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to save expense in database');
  const json = await res.json();
  notifyLocalSync('EXPENSE_SAVED', json.data);
  return json.data;
}

export async function dbDeleteExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to delete expense in database');
  const data = await res.json();
  notifyLocalSync('EXPENSE_DELETED', { id });
  return data;
}

export async function dbSaveRecurringItem(itemData) {
  const res = await fetch(`${API_BASE}/recurring`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(itemData),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to save recurring item in database');
  const data = await res.json();
  notifyLocalSync('RECURRING_SAVED', data);
  return data;
}

export async function dbToggleRecurringActive(id) {
  const res = await fetch(`${API_BASE}/recurring/${id}/toggle`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to toggle recurring item in database');
  const data = await res.json();
  notifyLocalSync('RECURRING_TOGGLED', { id });
  return data;
}

export async function dbDeleteRecurringItem(id) {
  const res = await fetch(`${API_BASE}/recurring/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to delete recurring item in database');
  const data = await res.json();
  notifyLocalSync('RECURRING_DELETED', { id });
  return data;
}

export async function dbSaveSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(settings),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to save settings in database');
  const data = await res.json();
  notifyLocalSync('SETTINGS_UPDATED', settings);
  return data;
}

export async function dbSaveBudget(budgetData) {
  const res = await fetch(`${API_BASE}/budgets`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(budgetData),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to save budget in database');
  const json = await res.json();
  notifyLocalSync('BUDGET_SAVED', json.data);
  return json.data;
}

export async function dbDeleteBudget(id) {
  const res = await fetch(`${API_BASE}/budgets/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to delete budget in database');
  const data = await res.json();
  notifyLocalSync('BUDGET_DELETED', { id });
  return data;
}

export async function dbMarkMealsAsPaid({ recurringItemId, paidTillDate, notes }) {
  const res = await fetch(`${API_BASE}/payments/mark-paid`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ recurringItemId, paidTillDate, notes }),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to mark meals as paid');
  }
  const json = await res.json();
  notifyLocalSync('MEAL_PAID', json.data);
  return json.data;
}

export async function dbDeletePayment(paymentId) {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to delete payment record');
  const data = await res.json();
  notifyLocalSync('PAYMENT_DELETED', { id: paymentId });
  return data;
}

export async function dbRunMaintenance() {
  const res = await fetch(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to run database maintenance');
  const json = await res.json();
  notifyLocalSync('MAINTENANCE_COMPLETED', json.data);
  return json.data;
}

export async function dbClearAll() {
  const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
  const adminSecret = import.meta.env.VITE_ADMIN_SECRET;
  if (adminSecret) headers['X-Admin-Secret'] = adminSecret;

  const res = await fetch(`${API_BASE}/clear`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ confirm: true }),
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error('Failed to clear database');
  const data = await res.json();
  notifyLocalSync('DATA_CLEARED', {});
  return data;
}

/**
 * Fetch yearly report data from the API.
 */
export async function dbFetchYearlyReport(year) {
  const res = await fetch(`${API_BASE}/reports/yearly?year=${year}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  if (res.status === 401) { handleUnauthorized(res); throw new Error('Unauthorized'); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch yearly report');
  }
  const json = await res.json();
  return json.data;
}

/**
 * Initializes a real-time BroadcastChannel and SSE listener for multi-device / PWA sync.
 */
export function subscribeToDbSync(onUpdateCallback) {
  let eventSource = null;

  const handleBroadcastMessage = (event) => {
    if (onUpdateCallback && event.data) {
      onUpdateCallback(event.data);
    }
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleBroadcastMessage);
  }

  try {
    const token = getAuthToken();
    // SSE requires token — attach via URL param as EventSource doesn't support custom headers
    const sseUrl = token
      ? `${API_BASE}/sync/events?_t=${encodeURIComponent(token)}`
      : null;

    if (sseUrl) {
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (onUpdateCallback) onUpdateCallback(parsed);
        } catch (_) {}
      };

      eventSource.onerror = () => {
        // EventSource auto-retries
      };
    }
  } catch (_) {}

  return () => {
    if (syncChannel) syncChannel.removeEventListener('message', handleBroadcastMessage);
    if (eventSource) eventSource.close();
  };
}
