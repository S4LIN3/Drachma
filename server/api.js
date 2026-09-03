import { db, initDatabase, getAllData } from './db.js';

// Connected SSE clients for real-time live sync
const sseClients = new Set();

function broadcastEvent(eventType, payload) {
  const data = JSON.stringify({ type: eventType, payload, timestamp: Date.now() });
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// Standardized HTTP Helper with Security Headers
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.end(JSON.stringify(data));
}

// In-Memory Rate Limiter (120 requests/min per IP)
const rateLimitMap = new Map();
function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 120;

  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);

  // Clean up stale rate limit entries periodically
  if (rateLimitMap.size > 5000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  return record.count > maxRequests;
}

// Secure JSON Parser with 100KB Body Size Cap
async function parseJsonBody(req, res) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    let bytesRead = 0;
    const MAX_BYTES = 100 * 1024; // 100 KB limit

    req.on('data', (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > MAX_BYTES) {
        req.destroy();
        reject(new Error('PAYLOAD_TOO_LARGE'));
      }
      raw += chunk;
    });

    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error('INVALID_JSON'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

// Input Validation Helpers
function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function isValidDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
}

/**
 * Universal Express / Serverless API Handler for Database Operations
 */
export async function handleApiRequest(req, res, next) {
  // Apply Rate Limiting
  if (checkRateLimit(req)) {
    return sendJson(res, 429, { success: false, error: 'Too many requests. Please try again later.' });
  }

  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();
  const path = url.replace(/^\/api/, '') || '/';

  // 1. Real-Time SSE Stream: /sync/events
  if (path === '/sync/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    });
    res.write('retry: 3000\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // Ensure DB initialized before executing endpoints
  try {
    await initDatabase();
  } catch (err) {
    console.error('Failed DB init:', err);
    return sendJson(res, 500, { success: false, error: 'Database service unavailable' });
  }

  // 2. GET /data
  if (path === '/data' && method === 'GET') {
    try {
      const data = await getAllData();
      return sendJson(res, 200, { success: true, data });
    } catch (err) {
      console.error('Error fetching data:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to retrieve data' });
    }
  }

  // 3. POST /meals/toggle
  if (path === '/meals/toggle' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const date = sanitizeString(body.date, 10);
      const recurringItemId = sanitizeString(body.recurringItemId, 100);

      if (!isValidDate(date) || !recurringItemId) {
        return sendJson(res, 400, { success: false, error: 'Valid date (YYYY-MM-DD) and recurringItemId required' });
      }

      const month = date.slice(0, 7);
      const existingRes = await db.execute({
        sql: 'SELECT * FROM meal_tracker WHERE date = ?',
        args: [date],
      });
      const existing = existingRes.rows[0];

      let updatedMarks = {};
      const now = new Date().toISOString();

      if (existing) {
        const currentMarks = existing.meals_marked ? JSON.parse(String(existing.meals_marked)) : {};
        const currentVal = !!currentMarks[recurringItemId];
        updatedMarks = {
          ...currentMarks,
          [recurringItemId]: !currentVal,
        };

        const hasAnyMarked = Object.values(updatedMarks).some(Boolean);
        if (!hasAnyMarked && !existing.notes) {
          await db.execute({
            sql: 'DELETE FROM meal_tracker WHERE date = ?',
            args: [date],
          });
        } else {
          await db.execute({
            sql: 'UPDATE meal_tracker SET meals_marked = ?, updated_at = ? WHERE date = ?',
            args: [JSON.stringify(updatedMarks), now, date],
          });
        }
      } else {
        updatedMarks = { [recurringItemId]: true };
        const id = `meal-track-${date}-${Date.now()}`;
        await db.execute({
          sql: `INSERT INTO meal_tracker (id, date, month, meals_marked, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [id, date, month, JSON.stringify(updatedMarks), '', now, now],
        });
      }

      broadcastEvent('MEAL_TOGGLED', { date, recurringItemId });
      return sendJson(res, 200, { success: true, data: { date, mealsMarked: updatedMarks } });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error in /meals/toggle:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to toggle meal' });
    }
  }

  // 4. POST /meals/notes
  if (path === '/meals/notes' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const date = sanitizeString(body.date, 10);
      const notes = sanitizeString(body.notes, 2000);

      if (!isValidDate(date)) return sendJson(res, 400, { success: false, error: 'Valid date (YYYY-MM-DD) required' });

      const month = date.slice(0, 7);
      const existingRes = await db.execute({
        sql: 'SELECT * FROM meal_tracker WHERE date = ?',
        args: [date],
      });
      const existing = existingRes.rows[0];
      const now = new Date().toISOString();

      if (existing) {
        await db.execute({
          sql: 'UPDATE meal_tracker SET notes = ?, updated_at = ? WHERE date = ?',
          args: [notes, now, date],
        });
      } else if (notes) {
        const id = `meal-track-${date}-${Date.now()}`;
        await db.execute({
          sql: `INSERT INTO meal_tracker (id, date, month, meals_marked, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [id, date, month, JSON.stringify({}), notes, now, now],
        });
      }

      broadcastEvent('NOTES_UPDATED', { date, notes });
      return sendJson(res, 200, { success: true, data: { date, notes } });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error in /meals/notes:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to update notes' });
    }
  }

  // 5. POST /expenses
  if (path === '/expenses' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const id = body.id ? sanitizeString(body.id, 100) : null;
      const date = sanitizeString(body.date, 10);
      const description = sanitizeString(body.description, 300);
      const category = sanitizeString(body.category, 50) || 'other';
      const notes = sanitizeString(body.notes, 1000);

      if (!isValidDate(date) || !description) {
        return sendJson(res, 400, { success: false, error: 'Valid date (YYYY-MM-DD) and description required' });
      }

      const month = date.slice(0, 7);
      const uPrice = Number.isFinite(Number(body.unitPrice)) ? Math.max(0, Number(body.unitPrice)) : 0;
      const qty = Number.isInteger(Number(body.quantity)) ? Math.max(1, Number(body.quantity)) : 1;
      const tot = Number.isFinite(Number(body.totalAmount)) ? Math.max(0, Number(body.totalAmount)) : uPrice * qty;
      const now = new Date().toISOString();

      const expenseId = id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const existingRes = await db.execute({
        sql: 'SELECT id FROM expenses WHERE id = ?',
        args: [expenseId],
      });

      if (existingRes.rows.length > 0) {
        await db.execute({
          sql: `UPDATE expenses 
                SET date = ?, month = ?, description = ?, category = ?, unit_price = ?, quantity = ?, total_amount = ?, notes = ?, updated_at = ?
                WHERE id = ?`,
          args: [date, month, description, category, uPrice, qty, tot, notes, now, expenseId],
        });
      } else {
        await db.execute({
          sql: `INSERT INTO expenses (id, date, month, description, category, unit_price, quantity, total_amount, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [expenseId, date, month, description, category, uPrice, qty, tot, notes, now, now],
        });
      }

      const savedExpense = {
        id: expenseId,
        date,
        month,
        description,
        category,
        unitPrice: uPrice,
        quantity: qty,
        totalAmount: tot,
        notes,
        updatedAt: now,
      };

      broadcastEvent('EXPENSE_SAVED', savedExpense);
      return sendJson(res, 200, { success: true, data: savedExpense });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error saving expense:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to save expense' });
    }
  }

  // 6. DELETE /expenses/:id
  if (path.startsWith('/expenses/') && method === 'DELETE') {
    try {
      const id = sanitizeString(path.replace('/expenses/', ''), 100);
      if (!id) return sendJson(res, 400, { success: false, error: 'Expense ID required' });

      await db.execute({
        sql: 'DELETE FROM expenses WHERE id = ?',
        args: [id],
      });
      broadcastEvent('EXPENSE_DELETED', { id });
      return sendJson(res, 200, { success: true, data: { id } });
    } catch (err) {
      console.error('Error deleting expense:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to delete expense' });
    }
  }

  // 7. POST /recurring
  if (path === '/recurring' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const id = body.id ? sanitizeString(body.id, 100) : null;
      const name = sanitizeString(body.name, 200);
      const frequency = sanitizeString(body.frequency, 50) || 'daily';
      const startDate = isValidDate(body.startDate) ? body.startDate : new Date().toISOString().slice(0, 10);
      const endDate = isValidDate(body.endDate) ? body.endDate : null;
      const icon = sanitizeString(body.icon, 10) || '🍽️';
      const description = sanitizeString(body.description, 500);

      if (!name) return sendJson(res, 400, { success: false, error: 'Name required' });

      const price = Number.isFinite(Number(body.pricePerOccurrence)) ? Math.max(0, Number(body.pricePerOccurrence)) : 0;
      const now = new Date().toISOString();
      const itemId = id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      let historyJson = JSON.stringify([{ effectiveFrom: startDate, price }]);
      if (Array.isArray(body.priceHistory)) {
        historyJson = JSON.stringify(body.priceHistory);
      }

      const isActiveVal = body.isActive !== false ? 1 : 0;
      const existingRes = await db.execute({
        sql: 'SELECT id FROM recurring_items WHERE id = ?',
        args: [itemId],
      });

      if (existingRes.rows.length > 0) {
        await db.execute({
          sql: `UPDATE recurring_items
                SET name = ?, price_per_occurrence = ?, frequency = ?, start_date = ?, end_date = ?, is_active = ?, icon = ?, description = ?, price_history = ?, updated_at = ?
                WHERE id = ?`,
          args: [name, price, frequency, startDate, endDate, isActiveVal, icon, description, historyJson, now, itemId],
        });
      } else {
        await db.execute({
          sql: `INSERT INTO recurring_items (id, name, price_per_occurrence, frequency, start_date, end_date, is_active, icon, description, price_history, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [itemId, name, price, frequency, startDate, endDate, isActiveVal, icon, description, historyJson, now, now],
        });
      }

      broadcastEvent('RECURRING_SAVED', { id: itemId, name });
      return sendJson(res, 200, { success: true, data: { id: itemId } });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error saving recurring item:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to save recurring item' });
    }
  }

  // 8. PATCH /recurring/:id/toggle
  if (path.startsWith('/recurring/') && path.endsWith('/toggle') && method === 'PATCH') {
    try {
      const id = sanitizeString(path.replace('/recurring/', '').replace('/toggle', ''), 100);
      if (!id) return sendJson(res, 400, { success: false, error: 'Item ID required' });

      const currentRes = await db.execute({
        sql: 'SELECT is_active FROM recurring_items WHERE id = ?',
        args: [id],
      });
      const current = currentRes.rows[0];
      if (!current) return sendJson(res, 404, { success: false, error: 'Item not found' });

      const nextState = Number(current.is_active) === 1 ? 0 : 1;
      await db.execute({
        sql: 'UPDATE recurring_items SET is_active = ?, updated_at = ? WHERE id = ?',
        args: [nextState, new Date().toISOString(), id],
      });

      broadcastEvent('RECURRING_TOGGLED', { id, isActive: nextState === 1 });
      return sendJson(res, 200, { success: true, data: { id, isActive: nextState === 1 } });
    } catch (err) {
      console.error('Error toggling recurring item:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to toggle item state' });
    }
  }

  // 9. DELETE /recurring/:id
  if (path.startsWith('/recurring/') && method === 'DELETE') {
    try {
      const id = sanitizeString(path.replace('/recurring/', ''), 100);
      if (!id) return sendJson(res, 400, { success: false, error: 'Item ID required' });

      await db.execute({
        sql: 'DELETE FROM recurring_items WHERE id = ?',
        args: [id],
      });
      broadcastEvent('RECURRING_DELETED', { id });
      return sendJson(res, 200, { success: true, data: { id } });
    } catch (err) {
      console.error('Error deleting recurring item:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to delete recurring item' });
    }
  }

  // 10. POST /settings
  if (path === '/settings' && method === 'POST') {
    try {
      const settingsObj = await parseJsonBody(req, res);
      if (typeof settingsObj !== 'object' || Array.isArray(settingsObj)) {
        return sendJson(res, 400, { success: false, error: 'Settings must be an object' });
      }

      const now = new Date().toISOString();
      const statements = [];

      for (const [k, v] of Object.entries(settingsObj)) {
        const sanitizedKey = sanitizeString(k, 100);
        const sanitizedVal = sanitizeString(String(v), 500);
        if (sanitizedKey) {
          statements.push({
            sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            args: [sanitizedKey, sanitizedVal, now],
          });
        }
      }

      if (statements.length > 0) {
        await db.batch(statements, 'write');
      }

      broadcastEvent('SETTINGS_UPDATED', settingsObj);
      return sendJson(res, 200, { success: true, data: settingsObj });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error updating settings:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to update settings' });
    }
  }

  // 11. POST /clear (Data Reset protection)
  if (path === '/clear' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      if (body.confirm !== true) {
        return sendJson(res, 400, { success: false, error: 'Data clear confirmation required' });
      }

      await db.batch([
        { sql: 'DELETE FROM meal_tracker', args: [] },
        { sql: 'DELETE FROM expenses', args: [] },
        { sql: 'DELETE FROM recurring_items', args: [] },
      ], 'write');

      broadcastEvent('DATA_CLEARED', {});
      return sendJson(res, 200, { success: true });
    } catch (err) {
      console.error('Error clearing data:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to clear data' });
    }
  }

  // Fallthrough to next middleware
  if (next) {
    next();
  } else {
    sendJson(res, 404, { error: 'Not Found' });
  }
}
