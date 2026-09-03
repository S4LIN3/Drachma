/**
 * Frontend Database Client with Real-Time Server-Sent Events (SSE) Synchronization
 * Communicates with the persistent SQLite Database on the backend.
 */

const API_BASE = '/api';

export async function fetchDbData() {
  const res = await fetch(`${API_BASE}/data`);
  if (!res.ok) throw new Error(`Failed to fetch database data: ${res.statusText}`);
  const json = await res.json();
  return json.data;
}

export async function dbToggleMeal(date, recurringItemId) {
  const res = await fetch(`${API_BASE}/meals/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, recurringItemId }),
  });
  if (!res.ok) throw new Error('Failed to toggle meal in database');
  return res.json();
}

export async function dbSaveMealNotes(date, notes) {
  const res = await fetch(`${API_BASE}/meals/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, notes }),
  });
  if (!res.ok) throw new Error('Failed to save notes in database');
  return res.json();
}

export async function dbSaveExpense(expenseData) {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
  if (!res.ok) throw new Error('Failed to save expense in database');
  const json = await res.json();
  return json.data;
}

export async function dbDeleteExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete expense in database');
  return res.json();
}

export async function dbSaveRecurringItem(itemData) {
  const res = await fetch(`${API_BASE}/recurring`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  });
  if (!res.ok) throw new Error('Failed to save recurring item in database');
  return res.json();
}

export async function dbToggleRecurringActive(id) {
  const res = await fetch(`${API_BASE}/recurring/${id}/toggle`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to toggle recurring item in database');
  return res.json();
}

export async function dbDeleteRecurringItem(id) {
  const res = await fetch(`${API_BASE}/recurring/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete recurring item in database');
  return res.json();
}

export async function dbSaveSettings(settings) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings in database');
  return res.json();
}

export async function dbClearAll() {
  const res = await fetch(`${API_BASE}/clear`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to clear database');
  return res.json();
}

/**
 * Initializes a real-time SSE listener for instant multi-device / PWA sync.
 */
export function subscribeToDbSync(onUpdateCallback) {
  let eventSource = null;

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

    eventSource.onerror = (err) => {
      // EventSource automatically retries on connection error
    };
  } catch (err) {
    console.warn('SSE Sync not available in this environment:', err);
  }

  return () => {
    if (eventSource) {
      eventSource.close();
    }
  };
}
