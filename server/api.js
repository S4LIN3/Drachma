import { db, initDatabase, getAllData } from './db.js';

initDatabase();

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

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * Universal Connect / Express API handler for SQLite Database
 */
export async function handleApiRequest(req, res, next) {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  // Normalize path (handle both '/api/...' and stripped '/...' from Connect)
  const path = url.replace(/^\/api/, '') || '/';

  // 1. Real-Time SSE Stream: /sync/events
  if (path === '/sync/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });
    res.write('retry: 3000\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. GET /data
  if (path === '/data' && method === 'GET') {
    try {
      const data = getAllData();
      return sendJson(res, 200, { success: true, data });
    } catch (err) {
      console.error('Error fetching data:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 3. POST /meals/toggle
  if (path === '/meals/toggle' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { date, recurringItemId } = body;
      if (!date || !recurringItemId) {
        return sendJson(res, 400, { success: false, error: 'date and recurringItemId required' });
      }

      const month = date.slice(0, 7);
      const existing = db.prepare('SELECT * FROM meal_tracker WHERE date = ?').get(date);

      let updatedMarks = {};
      const now = new Date().toISOString();

      if (existing) {
        const currentMarks = existing.meals_marked ? JSON.parse(existing.meals_marked) : {};
        const currentVal = !!currentMarks[recurringItemId];
        updatedMarks = {
          ...currentMarks,
          [recurringItemId]: !currentVal,
        };

        const hasAnyMarked = Object.values(updatedMarks).some(Boolean);
        if (!hasAnyMarked && !existing.notes) {
          db.prepare('DELETE FROM meal_tracker WHERE date = ?').run(date);
        } else {
          db.prepare('UPDATE meal_tracker SET meals_marked = ?, updated_at = ? WHERE date = ?')
            .run(JSON.stringify(updatedMarks), now, date);
        }
      } else {
        updatedMarks = { [recurringItemId]: true };
        const id = `meal-track-${date}-${Date.now()}`;
        db.prepare(`
          INSERT INTO meal_tracker (id, date, month, meals_marked, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, date, month, JSON.stringify(updatedMarks), '', now, now);
      }

      broadcastEvent('MEAL_TOGGLED', { date, recurringItemId });
      return sendJson(res, 200, { success: true, data: { date, mealsMarked: updatedMarks } });
    } catch (err) {
      console.error('Error in /meals/toggle:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 4. POST /meals/notes
  if (path === '/meals/notes' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { date, notes } = body;
      if (!date) return sendJson(res, 400, { success: false, error: 'date required' });

      const month = date.slice(0, 7);
      const existing = db.prepare('SELECT * FROM meal_tracker WHERE date = ?').get(date);
      const now = new Date().toISOString();

      if (existing) {
        db.prepare('UPDATE meal_tracker SET notes = ?, updated_at = ? WHERE date = ?')
          .run(notes || '', now, date);
      } else if (notes) {
        const id = `meal-track-${date}-${Date.now()}`;
        db.prepare(`
          INSERT INTO meal_tracker (id, date, month, meals_marked, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, date, month, JSON.stringify({}), notes, now, now);
      }

      broadcastEvent('NOTES_UPDATED', { date, notes });
      return sendJson(res, 200, { success: true, data: { date, notes } });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 5. POST /expenses
  if (path === '/expenses' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { id, date, description, category, unitPrice, quantity, totalAmount, notes } = body;
      if (!date || !description) {
        return sendJson(res, 400, { success: false, error: 'date and description required' });
      }

      const month = date.slice(0, 7);
      const uPrice = Number(unitPrice) || 0;
      const qty = Number(quantity) || 1;
      const tot = totalAmount !== undefined ? Number(totalAmount) : (uPrice * qty);
      const now = new Date().toISOString();

      const expenseId = id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(expenseId);

      if (existing) {
        db.prepare(`
          UPDATE expenses 
          SET date = ?, month = ?, description = ?, category = ?, unit_price = ?, quantity = ?, total_amount = ?, notes = ?, updated_at = ?
          WHERE id = ?
        `).run(date, month, description.trim(), category || 'other', uPrice, qty, tot, notes || '', now, expenseId);
      } else {
        db.prepare(`
          INSERT INTO expenses (id, date, month, description, category, unit_price, quantity, total_amount, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(expenseId, date, month, description.trim(), category || 'other', uPrice, qty, tot, notes || '', now, now);
      }

      const savedExpense = {
        id: expenseId,
        date,
        month,
        description: description.trim(),
        category: category || 'other',
        unitPrice: uPrice,
        quantity: qty,
        totalAmount: tot,
        notes: notes || '',
        updatedAt: now,
      };

      broadcastEvent('EXPENSE_SAVED', savedExpense);
      return sendJson(res, 200, { success: true, data: savedExpense });
    } catch (err) {
      console.error('Error saving expense:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 6. DELETE /expenses/:id
  if (path.startsWith('/expenses/') && method === 'DELETE') {
    try {
      const id = path.replace('/expenses/', '');
      db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
      broadcastEvent('EXPENSE_DELETED', { id });
      return sendJson(res, 200, { success: true, data: { id } });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 7. POST /recurring
  if (path === '/recurring' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { id, name, pricePerOccurrence, frequency, startDate, endDate, isActive, icon, description, priceHistory } = body;
      if (!name) return sendJson(res, 400, { success: false, error: 'name required' });

      const price = Number(pricePerOccurrence) || 0;
      const now = new Date().toISOString();
      const itemId = id || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const historyJson = JSON.stringify(priceHistory || [{ effectiveFrom: startDate || now.slice(0, 10), price }]);

      const existing = db.prepare('SELECT id FROM recurring_items WHERE id = ?').get(itemId);

      if (existing) {
        db.prepare(`
          UPDATE recurring_items
          SET name = ?, price_per_occurrence = ?, frequency = ?, start_date = ?, end_date = ?, is_active = ?, icon = ?, description = ?, price_history = ?, updated_at = ?
          WHERE id = ?
        `).run(name.trim(), price, frequency || 'daily', startDate || now.slice(0, 10), endDate || null, isActive !== false ? 1 : 0, icon || '🍽️', description || '', historyJson, now, itemId);
      } else {
        db.prepare(`
          INSERT INTO recurring_items (id, name, price_per_occurrence, frequency, start_date, end_date, is_active, icon, description, price_history, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(itemId, name.trim(), price, frequency || 'daily', startDate || now.slice(0, 10), endDate || null, isActive !== false ? 1 : 0, icon || '🍽️', description || '', historyJson, now, now);
      }

      broadcastEvent('RECURRING_SAVED', { id: itemId, name });
      return sendJson(res, 200, { success: true, data: { id: itemId } });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 8. PATCH /recurring/:id/toggle
  if (path.startsWith('/recurring/') && path.endsWith('/toggle') && method === 'PATCH') {
    try {
      const id = path.replace('/recurring/', '').replace('/toggle', '');
      const current = db.prepare('SELECT is_active FROM recurring_items WHERE id = ?').get(id);
      if (!current) return sendJson(res, 404, { success: false, error: 'Item not found' });

      const nextState = current.is_active === 1 ? 0 : 1;
      db.prepare('UPDATE recurring_items SET is_active = ?, updated_at = ? WHERE id = ?')
        .run(nextState, new Date().toISOString(), id);

      broadcastEvent('RECURRING_TOGGLED', { id, isActive: nextState === 1 });
      return sendJson(res, 200, { success: true, data: { id, isActive: nextState === 1 } });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 9. DELETE /recurring/:id
  if (path.startsWith('/recurring/') && method === 'DELETE') {
    try {
      const id = path.replace('/recurring/', '');
      db.prepare('DELETE FROM recurring_items WHERE id = ?').run(id);
      broadcastEvent('RECURRING_DELETED', { id });
      return sendJson(res, 200, { success: true, data: { id } });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 10. POST /settings
  if (path === '/settings' && method === 'POST') {
    try {
      const settings = await parseJsonBody(req);
      const now = new Date().toISOString();
      const updateStmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `);

      const updateMany = db.transaction((entries) => {
        for (const [k, v] of Object.entries(entries)) {
          updateStmt.run(k, String(v), now);
        }
      });

      updateMany(settings);
      broadcastEvent('SETTINGS_UPDATED', settings);
      return sendJson(res, 200, { success: true, data: settings });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 11. POST /clear
  if (path === '/clear' && method === 'POST') {
    try {
      db.exec(`
        DELETE FROM meal_tracker;
        DELETE FROM expenses;
        DELETE FROM recurring_items;
      `);
      broadcastEvent('DATA_CLEARED', {});
      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // Fallthrough to next middleware if not handled
  if (next) {
    next();
  } else {
    sendJson(res, 404, { error: 'Not Found' });
  }
}
