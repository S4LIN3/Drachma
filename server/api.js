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

// Standardized HTTP Helper with Bank-Grade Security Headers
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.end(JSON.stringify(data));
}

// CORS Origin Handling
function applyCorsHeaders(req, res) {
  const origin = req.headers['origin'];
  const allowedOrigin = process.env.ALLOWED_ORIGIN;

  if (allowedOrigin) {
    if (origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
  } else if (origin) {
    // In default development mode, mirror request origin securely
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, X-Admin-Secret');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Dual-Tier In-Memory Rate Limiter (Reads: 120/min, Writes: 35/min per IP)
const rateLimitMap = new Map();

function checkRateLimit(req, isWriteOperation = false) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = isWriteOperation ? 35 : 120;

  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);

  // Clean stale rate limit memory
  if (rateLimitMap.size > 5000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  return record.count > maxRequests;
}

// Secure API Secret Verification (Optional Auth)
function authenticateRequest(req) {
  const secretKey = process.env.API_SECRET_KEY;
  if (!secretKey) return true; // If no key set in env, pass through

  const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  return apiKeyHeader === secretKey;
}

// Body Size Limiter & JSON Parsing (600KB Cap for compressed receipt images)
async function parseJsonBody(req, res) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    let bytesRead = 0;
    const MAX_BYTES = 600 * 1024; // 600 KB max limit

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

// Input Sanitization & Anti-XSS Helper
function sanitizeInput(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>]/g, '') // Strip potentially dangerous HTML tags
    .slice(0, maxLength);
}

function isValidDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
}

function isValidId(idStr) {
  if (typeof idStr !== 'string') return false;
  return /^[a-zA-Z0-9_-]{1,100}$/.test(idStr.trim());
}

/**
 * Universal Express / Serverless API Handler
 */
export async function handleApiRequest(req, res, next) {
  applyCorsHeaders(req, res);

  const method = req.method.toUpperCase();

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const isWrite = method === 'POST' || method === 'PATCH' || method === 'DELETE';

  // 1. Rate Limiting Check
  if (checkRateLimit(req, isWrite)) {
    return sendJson(res, 429, { success: false, error: 'Too many requests. Please slow down.' });
  }

  // 2. Authentication Check
  if (!authenticateRequest(req)) {
    return sendJson(res, 401, { success: false, error: 'Unauthorized: Invalid API Key' });
  }

  const url = req.url.split('?')[0];
  const path = url.replace(/^\/api/, '') || '/';

  // 3. Real-Time SSE Stream: /sync/events
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

  // Ensure DB connection is initialized
  try {
    await initDatabase();
  } catch (err) {
    console.error('Failed DB init:', err);
    return sendJson(res, 500, { success: false, error: 'Database service unavailable' });
  }

  // 4. GET /data
  if (path === '/data' && method === 'GET') {
    try {
      const data = await getAllData();
      return sendJson(res, 200, { success: true, data });
    } catch (err) {
      console.error('Error fetching data:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to retrieve data' });
    }
  }

  // 5. POST /meals/toggle
  if (path === '/meals/toggle' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const date = sanitizeInput(body.date, 10);
      const recurringItemId = sanitizeInput(body.recurringItemId, 100);

      if (!isValidDate(date) || !isValidId(recurringItemId)) {
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

  // 6. POST /meals/notes
  if (path === '/meals/notes' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const date = sanitizeInput(body.date, 10);
      const notes = sanitizeInput(body.notes, 2000);

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

  // 7. POST /expenses
  if (path === '/expenses' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const id = body.id ? sanitizeInput(body.id, 100) : null;
      const date = sanitizeInput(body.date, 10);
      const description = sanitizeInput(body.description, 300);
      const category = sanitizeInput(body.category, 50) || 'other';
      const notes = sanitizeInput(body.notes, 1000);
      const attachment = typeof body.attachment === 'string' ? body.attachment.slice(0, 500000) : '';

      if (!isValidDate(date) || !description) {
        return sendJson(res, 400, { success: false, error: 'Valid date (YYYY-MM-DD) and description required' });
      }

      if (id && !isValidId(id)) {
        return sendJson(res, 400, { success: false, error: 'Invalid expense ID format' });
      }

      const month = date.slice(0, 7);
      const uPrice = Number.isFinite(Number(body.unitPrice)) ? Math.min(Math.max(0, Number(body.unitPrice)), 1000000) : 0;
      const qty = Number.isInteger(Number(body.quantity)) ? Math.min(Math.max(1, Number(body.quantity)), 10000) : 1;
      const tot = Number.isFinite(Number(body.totalAmount)) ? Math.min(Math.max(0, Number(body.totalAmount)), 10000000) : uPrice * qty;
      const now = new Date().toISOString();

      const expenseId = id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const existingRes = await db.execute({
        sql: 'SELECT id FROM expenses WHERE id = ?',
        args: [expenseId],
      });

      if (existingRes.rows.length > 0) {
        await db.execute({
          sql: `UPDATE expenses 
                SET date = ?, month = ?, description = ?, category = ?, unit_price = ?, quantity = ?, total_amount = ?, notes = ?, attachment = ?, updated_at = ?
                WHERE id = ?`,
          args: [date, month, description, category, uPrice, qty, tot, notes, attachment, now, expenseId],
        });
      } else {
        await db.execute({
          sql: `INSERT INTO expenses (id, date, month, description, category, unit_price, quantity, total_amount, notes, attachment, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [expenseId, date, month, description, category, uPrice, qty, tot, notes, attachment, now, now],
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
        attachment,
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

  // 8. DELETE /expenses/:id (Strict Regex Parameter Parsing)
  const deleteExpenseMatch = path.match(/^\/expenses\/([a-zA-Z0-9_-]{1,100})$/);
  if (deleteExpenseMatch && method === 'DELETE') {
    try {
      const id = deleteExpenseMatch[1];
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

  // 9. POST /recurring
  if (path === '/recurring' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const id = body.id ? sanitizeInput(body.id, 100) : null;
      const name = sanitizeInput(body.name, 200);
      const frequency = sanitizeInput(body.frequency, 50) || 'daily';
      const startDate = isValidDate(body.startDate) ? body.startDate : new Date().toISOString().slice(0, 10);
      const endDate = isValidDate(body.endDate) ? body.endDate : null;
      const icon = sanitizeInput(body.icon, 10) || '🍽️';
      const description = sanitizeInput(body.description, 500);

      if (!name) return sendJson(res, 400, { success: false, error: 'Name required' });

      if (id && !isValidId(id)) {
        return sendJson(res, 400, { success: false, error: 'Invalid recurring item ID format' });
      }

      const price = Number.isFinite(Number(body.pricePerOccurrence)) ? Math.min(Math.max(0, Number(body.pricePerOccurrence)), 1000000) : 0;
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

  // 10. PATCH /recurring/:id/toggle (Strict Regex Parsing)
  const toggleRecurringMatch = path.match(/^\/recurring\/([a-zA-Z0-9_-]{1,100})\/toggle$/);
  if (toggleRecurringMatch && method === 'PATCH') {
    try {
      const id = toggleRecurringMatch[1];

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

  // 11. DELETE /recurring/:id (Strict Regex Parsing)
  const deleteRecurringMatch = path.match(/^\/recurring\/([a-zA-Z0-9_-]{1,100})$/);
  if (deleteRecurringMatch && method === 'DELETE') {
    try {
      const id = deleteRecurringMatch[1];

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

  // 12. POST /budgets
  if (path === '/budgets' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const id = body.id ? sanitizeInput(body.id, 100) : null;
      const month = sanitizeInput(body.month, 7);
      const category = sanitizeInput(body.category, 50) || 'overall';
      const amount = Number.isFinite(Number(body.amount)) ? Math.max(0, Number(body.amount)) : 0;

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return sendJson(res, 400, { success: false, error: 'Valid month (YYYY-MM) required' });
      }

      const now = new Date().toISOString();
      const budgetId = id || `bgt-${month}-${category}`;

      await db.execute({
        sql: `INSERT INTO budgets (id, month, category, amount, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(month, category) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at`,
        args: [budgetId, month, category, amount, now, now],
      });

      const savedBudget = { id: budgetId, month, category, amount, updatedAt: now };
      broadcastEvent('BUDGET_SAVED', savedBudget);
      return sendJson(res, 200, { success: true, data: savedBudget });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error saving budget:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to save budget' });
    }
  }

  // 13. DELETE /budgets/:id
  const deleteBudgetMatch = path.match(/^\/budgets\/([a-zA-Z0-9_-]{1,100})$/);
  if (deleteBudgetMatch && method === 'DELETE') {
    try {
      const id = deleteBudgetMatch[1];
      await db.execute({
        sql: 'DELETE FROM budgets WHERE id = ?',
        args: [id],
      });
      broadcastEvent('BUDGET_DELETED', { id });
      return sendJson(res, 200, { success: true, data: { id } });
    } catch (err) {
      console.error('Error deleting budget:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to delete budget' });
    }
  }

  // 14. POST /settings
  if (path === '/settings' && method === 'POST') {
    try {
      const settingsObj = await parseJsonBody(req, res);
      if (typeof settingsObj !== 'object' || Array.isArray(settingsObj)) {
        return sendJson(res, 400, { success: false, error: 'Settings must be an object' });
      }

      const now = new Date().toISOString();
      const statements = [];

      for (const [k, v] of Object.entries(settingsObj)) {
        const sanitizedKey = sanitizeInput(k, 100);
        const sanitizedVal = sanitizeInput(String(v), 500);
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

  // 15. POST /clear (Data Reset protection with Admin Secret support)
  if (path === '/clear' && method === 'POST') {
    try {
      const body = await parseJsonBody(req, res);
      const adminSecret = process.env.ADMIN_SECRET;

      if (adminSecret && req.headers['x-admin-secret'] !== adminSecret) {
        return sendJson(res, 403, { success: false, error: 'Forbidden: Invalid Admin Secret' });
      }

      if (body.confirm !== true) {
        return sendJson(res, 400, { success: false, error: 'Data clear confirmation required' });
      }

      await db.batch([
        { sql: 'DELETE FROM meal_tracker', args: [] },
        { sql: 'DELETE FROM expenses', args: [] },
        { sql: 'DELETE FROM recurring_items', args: [] },
        { sql: 'DELETE FROM budgets', args: [] },
      ], 'write');

      broadcastEvent('DATA_CLEARED', {});
      return sendJson(res, 200, { success: true });
    } catch (err) {
      console.error('Error clearing data:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to clear data' });
    }
  }

  // Fallthrough 404
  if (next) {
    next();
  } else {
    sendJson(res, 404, { error: 'Not Found' });
  }
}
