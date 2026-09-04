/**
 * Frontend Database Client with Security Headers, BroadcastChannel and SSE Synchronization
 * Communicates with the persistent Database on the backend.
 */

const API_BASE = '/api';
const API_SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY || '';
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || '';

function getAuthHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  if (API_SECRET_KEY) {
    headers['X-Api-Key'] = API_SECRET_KEY;
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
    } catch (err) {
      // Ignore broadcast errors
    }
  }
}

export async function fetchDbData() {
  const res = await fetch(`${API_BASE}/data`, { 
    headers: getAuthHeaders(),
    cache: 'no-store' 
  });
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
  if (!res.ok) throw new Error('Failed to save settings in database');
  const data = await res.json();
  notifyLocalSync('SETTINGS_UPDATED', settings);
  return data;
}

export async function dbClearAll() {
  const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
  if (ADMIN_SECRET) {
    headers['X-Admin-Secret'] = ADMIN_SECRET;
  }

  const res = await fetch(`${API_BASE}/clear`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) throw new Error('Failed to clear database');
  const data = await res.json();
  notifyLocalSync('DATA_CLEARED', {});
  return data;
}

/**
 * Initializes a real-time BroadcastChannel and SSE listener for multi-device / PWA sync.
 */
export function subscribeToDbSync(onUpdateCallback) {
  let eventSource = null;

  // 1. BroadcastChannel Listener (Instant local tab/PWA synchronization)
  const handleBroadcastMessage = (event) => {
    if (onUpdateCallback && event.data) {
      onUpdateCallback(event.data);
    }
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleBroadcastMessage);
  }

  // 2. SSE Listener (For long-lived server connection if supported)
  try {
    eventSource = new EventSource(`${API_BASE}/sync/events`);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (onUpdateCallback) {
          onUpdateCallback(parsed);
        }
      } catch (err) {
        console.error('Error parsing sync event:', err);
      }
    };

    eventSource.onerror = () => {
      // EventSource auto-retries
    };
  } catch (err) {
    console.warn('SSE Sync not available in this environment:', err);
  }

  return () => {
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleBroadcastMessage);
    }
    if (eventSource) {
      eventSource.close();
    }
  };
}
