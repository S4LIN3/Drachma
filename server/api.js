import { db, initDatabase, getAllData, getYearlyData, runDatabaseMaintenance } from './db.js';
import { hashPassword, verifyPassword, signToken, extractUserFromRequest } from './auth.js';

// ─── SSE clients (keyed by userId for per-user broadcasts) ──────────────────
const sseClients = new Map(); // userId -> Set<res>

function broadcastEvent(userId, eventType, payload) {
  const data = JSON.stringify({ type: eventType, payload, timestamp: Date.now() });
  const clients = sseClients.get(userId);
  if (!clients) return;
  for (const client of clients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (_) {
      clients.delete(client);
    }
  }
}

// ─── Security / utility helpers ──────────────────────────────────────────────

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

function applyCorsHeaders(req, res) {
  const origin = req.headers['origin'];
  const allowedOrigin = process.env.ALLOWED_ORIGIN;

  if (allowedOrigin) {
    if (origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
  } else if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, X-Admin-Secret');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Dual-Tier In-Memory Rate Limiter (Reads: 120/min, Writes: 35/min per IP)
const rateLimitMap = new Map();

function checkRateLimit(req, isWriteOperation = false) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = isWriteOperation ? 35 : 120;

  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);

  if (rateLimitMap.size > 5000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  return record.count > maxRequests;
}

// Dedicated Login Brute-Force Rate Limiter (Max 10 failed attempts per 15 minutes per IP)
const failedLoginMap = new Map();

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxFailed = 10;
  const record = failedLoginMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  return record.count >= maxFailed;
}

function recordFailedLoginAttempt(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const record = failedLoginMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }
  failedLoginMap.set(ip, record);
}

function clearFailedLoginAttempts(ip) {
  failedLoginMap.delete(ip);
}

// Legacy API secret check (still supported for backward compat)
function authenticateApiKey(req) {
  const secretKey = process.env.API_SECRET_KEY;
  if (!secretKey) return true;
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  return apiKeyHeader === secretKey;
}

// JWT-based authentication middleware — returns user object or null
function getAuthenticatedUser(req) {
  return extractUserFromRequest(req);
}

// Body Size Limiter & JSON Parsing (600KB Cap)
async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    let bytesRead = 0;
    const MAX_BYTES = 600 * 1024;

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
      } catch (_) {
        reject(new Error('INVALID_JSON'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

function sanitizeInput(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '').slice(0, maxLength);
}

function isValidDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
}

function isValidId(idStr) {
  if (typeof idStr !== 'string') return false;
  return /^[a-zA-Z0-9_-]{1,100}$/.test(idStr.trim());
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

// ─── Universal API Handler ────────────────────────────────────────────────────
export async function handleApiRequest(req, res, next) {
  applyCorsHeaders(req, res);

  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const isWrite = method === 'POST' || method === 'PATCH' || method === 'DELETE';

  if (checkRateLimit(req, isWrite)) {
    return sendJson(res, 429, { success: false, error: 'Too many requests. Please slow down.' });
  }

  const url = req.url.split('?')[0];
  const path = url.replace(/^\/api/, '') || '/';

  // Ensure DB is initialized
  try {
    await initDatabase();
  } catch (err) {
    console.error('Failed DB init:', err);
    return sendJson(res, 500, { success: false, error: 'Database service unavailable' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC ROUTES (no auth required)
  // ══════════════════════════════════════════════════════════════════════════

  // POST /auth/register
  if (path === '/auth/register' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const name = sanitizeInput(body.name, 100);
      const email = sanitizeInput(body.email, 200).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';

      if (!name) return sendJson(res, 400, { success: false, error: 'Name is required' });
      if (!isValidEmail(email)) return sendJson(res, 400, { success: false, error: 'Valid email is required' });
      if (!password || password.length < 8) {
        return sendJson(res, 400, { success: false, error: 'Password must be at least 8 characters' });
      }

      // Check duplicate email
      const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
      if (existing.rows.length > 0) {
        return sendJson(res, 409, { success: false, error: 'An account with this email already exists' });
      }

      const now = new Date().toISOString();
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const passwordHash = await hashPassword(password);

      await db.execute({
        sql: `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [userId, name, email, passwordHash, now, now],
      });

      // If this is the first registered real user, reassign any unassigned or legacy migrated records
      const usersCountRes = await db.execute('SELECT COUNT(*) as count FROM users');
      const isFirstUser = Number(usersCountRes.rows[0]?.count || 0) <= 1;

      if (isFirstUser) {
        const tables = ['recurring_items', 'meal_tracker', 'expenses', 'budgets', 'payments', 'settings'];
        for (const tbl of tables) {
          try {
            await db.execute({
              sql: `UPDATE ${tbl} SET user_id = ? WHERE user_id = 'user-default-migrated' OR user_id IS NULL OR user_id = ''`,
              args: [userId],
            });
          } catch (_) {}
        }
      }

      // Create default settings for new user if none exist
      const settingsCountRes = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM settings WHERE user_id = ?',
        args: [userId],
      });
      if (Number(settingsCountRes.rows[0]?.count || 0) === 0) {
        const defaultSettings = [
          { key: 'theme', value: 'light' },
          { key: 'currency', value: 'INR' },
          { key: 'notificationsEnabled', value: 'true' },
        ];
        await db.batch(
          defaultSettings.map((s) => ({
            sql: 'INSERT OR IGNORE INTO settings (key, value, updated_at, user_id) VALUES (?, ?, ?, ?)',
            args: [s.key, s.value, now, userId],
          })),
          'write',
        );
      }

      // Create initial meal templates for new user if they don't have any
      const recurringCountRes = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM recurring_items WHERE user_id = ?',
        args: [userId],
      });
      if (Number(recurringCountRes.rows[0]?.count || 0) === 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const defaultTemplates = [
          {
            id: `rec-lunch-${userId}`,
            name: 'Lunch',
            price_per_occurrence: 100,
            frequency: 'daily',
            start_date: todayStr,
            end_date: null,
            is_active: 1,
            icon: '🍽️',
            description: 'Standard Daily Lunch',
            price_history: JSON.stringify([{ effectiveFrom: todayStr, price: 100 }]),
            created_at: now,
            updated_at: now,
          },
          {
            id: `rec-dinner-${userId}`,
            name: 'Dinner',
            price_per_occurrence: 80,
            frequency: 'daily',
            start_date: todayStr,
            end_date: null,
            is_active: 1,
            icon: '🍛',
            description: 'Standard Daily Dinner',
            price_history: JSON.stringify([{ effectiveFrom: todayStr, price: 80 }]),
            created_at: now,
            updated_at: now,
          },
          {
            id: `rec-tea-${userId}`,
            name: 'Tea & Snacks',
            price_per_occurrence: 25,
            frequency: 'daily',
            start_date: todayStr,
            end_date: null,
            is_active: 1,
            icon: '☕',
            description: 'Evening Tea and Light Snacks',
            price_history: JSON.stringify([{ effectiveFrom: todayStr, price: 25 }]),
            created_at: now,
            updated_at: now,
          },
        ];

        await db.batch(
          defaultTemplates.map((item) => ({
            sql: `INSERT INTO recurring_items (id, name, price_per_occurrence, frequency, start_date, end_date, is_active, icon, description, price_history, created_at, updated_at, user_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              item.id, item.name, item.price_per_occurrence, item.frequency,
              item.start_date, item.end_date, item.is_active, item.icon,
              item.description, item.price_history, item.created_at, item.updated_at,
              userId,
            ],
          })),
          'write',
        );
      }

      const token = signToken({ userId, email, name });
      console.log(`[Auth] User registered: ${email}`);

      return sendJson(res, 201, {
        success: true,
        data: {
          token,
          user: { id: userId, name, email, createdAt: now },
        },
      });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Registration error:', err);
      return sendJson(res, 500, { success: false, error: 'Registration failed' });
    }
  }

  // POST /auth/login
  if (path === '/auth/login' && method === 'POST') {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    if (checkLoginRateLimit(clientIp)) {
      return sendJson(res, 429, {
        success: false,
        error: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
      });
    }

    try {
      const body = await parseJsonBody(req);
      const email = sanitizeInput(body.email, 200).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';

      if (!email || !password) {
        return sendJson(res, 400, { success: false, error: 'Email and password are required' });
      }

      const userRes = await db.execute({
        sql: 'SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?',
        args: [email],
      });
      const userRow = userRes.rows[0];

      if (!userRow) {
        recordFailedLoginAttempt(clientIp);
        // Constant-time-ish response to avoid user enumeration
        await hashPassword('dummy-to-avoid-timing-attack');
        return sendJson(res, 401, { success: false, error: 'Invalid email or password' });
      }

      const valid = await verifyPassword(password, String(userRow.password_hash));
      if (!valid) {
        recordFailedLoginAttempt(clientIp);
        return sendJson(res, 401, { success: false, error: 'Invalid email or password' });
      }

      // Successful login — clear failed attempt count
      clearFailedLoginAttempts(clientIp);

      const userId = String(userRow.id);
      const name = String(userRow.name);
      const token = signToken({ userId, email, name });

      console.log(`[Auth] User logged in: ${email}`);
      return sendJson(res, 200, {
        success: true,
        data: {
          token,
          user: { id: userId, name, email, createdAt: String(userRow.created_at) },
        },
      });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Login error:', err);
      return sendJson(res, 500, { success: false, error: 'Login failed' });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROTECTED ROUTES — require valid JWT
  // ══════════════════════════════════════════════════════════════════════════

  // For all protected routes, verify authentication
  // Also support legacy API key auth for backward compat during transition
  const jwtUser = getAuthenticatedUser(req);
  const hasValidApiKey = authenticateApiKey(req);

  if (!jwtUser && !hasValidApiKey) {
    return sendJson(res, 401, { success: false, error: 'Unauthorized: Please log in' });
  }

  // If JWT present, use it (proper multi-user). Otherwise legacy single-user fallback.
  const userId = jwtUser ? jwtUser.userId : null;

  // If using legacy API key without JWT, reject user-specific routes
  if (!userId) {
    return sendJson(res, 401, { success: false, error: 'Unauthorized: Authentication required' });
  }

  // GET /auth/me
  if (path === '/auth/me' && method === 'GET') {
    try {
      const userRes = await db.execute({
        sql: 'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
        args: [userId],
      });
      const user = userRes.rows[0];
      if (!user) return sendJson(res, 404, { success: false, error: 'User not found' });

      return sendJson(res, 200, {
        success: true,
        data: {
          id: String(user.id),
          name: String(user.name),
          email: String(user.email),
          createdAt: String(user.created_at),
          updatedAt: String(user.updated_at),
        },
      });
    } catch (err) {
      console.error('GET /auth/me error:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to fetch user' });
    }
  }

  // PATCH /auth/profile
  if (path === '/auth/profile' && method === 'PATCH') {
    try {
      const body = await parseJsonBody(req);
      const updates = {};
      const now = new Date().toISOString();

      if (body.name !== undefined) {
        const name = sanitizeInput(body.name, 100);
        if (!name) return sendJson(res, 400, { success: false, error: 'Name cannot be empty' });
        updates.name = name;
      }

      if (body.email !== undefined) {
        const email = sanitizeInput(body.email, 200).toLowerCase();
        if (!isValidEmail(email)) return sendJson(res, 400, { success: false, error: 'Valid email required' });
        // Check uniqueness against other users
        const existingRes = await db.execute({
          sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
          args: [email, userId],
        });
        if (existingRes.rows.length > 0) {
          return sendJson(res, 409, { success: false, error: 'Email already in use' });
        }
        updates.email = email;
      }

      if (body.currentPassword && body.newPassword) {
        if (body.newPassword.length < 8) {
          return sendJson(res, 400, { success: false, error: 'New password must be at least 8 characters' });
        }
        const userRes = await db.execute({ sql: 'SELECT password_hash FROM users WHERE id = ?', args: [userId] });
        const valid = await verifyPassword(body.currentPassword, String(userRes.rows[0]?.password_hash));
        if (!valid) return sendJson(res, 401, { success: false, error: 'Current password is incorrect' });
        updates.password_hash = await hashPassword(body.newPassword);
      }

      if (Object.keys(updates).length === 0) {
        return sendJson(res, 400, { success: false, error: 'No updates provided' });
      }

      const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
      const values = [...Object.values(updates), now, userId];
      await db.execute({
        sql: `UPDATE users SET ${setClauses}, updated_at = ? WHERE id = ?`,
        args: values,
      });

      const updatedRes = await db.execute({
        sql: 'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
        args: [userId],
      });
      const u = updatedRes.rows[0];

      return sendJson(res, 200, {
        success: true,
        data: {
          id: String(u.id),
          name: String(u.name),
          email: String(u.email),
          createdAt: String(u.created_at),
          updatedAt: String(u.updated_at),
        },
      });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Profile update error:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to update profile' });
    }
  }

  // GET /sync/events — SSE per-user
  if (path === '/sync/events' && method === 'GET') {
    // EventSource cannot set custom headers; accept token via URL param as fallback
    const urlObj = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');
    const urlToken = urlObj.get('_t');
    let sseUser = jwtUser;
    if (!sseUser && urlToken) {
      const { verifyToken } = await import('./auth.js');
      sseUser = verifyToken(decodeURIComponent(urlToken));
    }
    if (!sseUser) {
      return sendJson(res, 401, { success: false, error: 'Unauthorized' });
    }
    const sseUserId = sseUser.userId;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    });
    res.write('retry: 3000\n\n');

    if (!sseClients.has(sseUserId)) sseClients.set(sseUserId, new Set());
    sseClients.get(sseUserId).add(res);

    req.on('close', () => {
      const clients = sseClients.get(sseUserId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) sseClients.delete(sseUserId);
      }
    });
    return;
  }


  // GET /data — user-scoped full data fetch
  if (path === '/data' && method === 'GET') {
    try {
      const data = await getAllData(userId);
      return sendJson(res, 200, { success: true, data });
    } catch (err) {
      console.error('Error fetching data:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to retrieve data' });
    }
  }

  // GET /reports/yearly?year=2026
  if (path === '/reports/yearly' && method === 'GET') {
    try {
      const urlParams = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');
      const year = urlParams.get('year');

      if (!year || !/^\d{4}$/.test(year)) {
        return sendJson(res, 400, { success: false, error: 'Valid year parameter required (e.g. ?year=2026)' });
      }

      const yearNum = Number(year);
      if (yearNum < 2000 || yearNum > 2100) {
        return sendJson(res, 400, { success: false, error: 'Year must be between 2000 and 2100' });
      }

      // Fetch user info
      const userRes = await db.execute({
        sql: 'SELECT id, name, email FROM users WHERE id = ?',
        args: [userId],
      });
      const user = userRes.rows[0];
      if (!user) return sendJson(res, 404, { success: false, error: 'User not found' });

      const yearlyData = await getYearlyData(userId, year);

      // Build monthly breakdown
      const months = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December',
      ];

      const monthlyBreakdown = months.map((monthName, idx) => {
        const monthKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
        const monthExpenses = yearlyData.expenses.filter((e) => e.month === monthKey || e.date.startsWith(monthKey));
        const monthMeals = yearlyData.mealTracker.filter((m) => m.month === monthKey || m.date.startsWith(monthKey));
        const monthPayments = yearlyData.payments.filter((p) => p.paymentDate.startsWith(monthKey));

        const miscTotal = monthExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
        const mealTotal = monthPayments.reduce((sum, p) => sum + p.totalAmount, 0);
        const mealDays = monthMeals.filter((m) => Object.values(m.mealsMarked).some(Boolean)).length;
        const mealPortions = monthMeals.reduce((sum, m) => sum + Object.values(m.mealsMarked).filter(Boolean).length, 0);

        return {
          month: monthName,
          monthKey,
          expenseCount: monthExpenses.length,
          miscTotal: Math.round(miscTotal * 100) / 100,
          mealTotal: Math.round(mealTotal * 100) / 100,
          total: Math.round((miscTotal + mealTotal) * 100) / 100,
          mealDays,
          mealPortions,
        };
      });

      const totalExpenses = yearlyData.expenses.reduce((sum, e) => sum + e.totalAmount, 0);
      const totalMealPayments = yearlyData.payments.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalOverall = totalExpenses + totalMealPayments;
      const totalMealDays = yearlyData.mealTracker.filter((m) => Object.values(m.mealsMarked).some(Boolean)).length;
      const totalMealPortions = yearlyData.mealTracker.reduce((sum, m) => sum + Object.values(m.mealsMarked).filter(Boolean).length, 0);

      // Category breakdown
      const categoryTotals = {};
      for (const e of yearlyData.expenses) {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.totalAmount;
      }
      const categoryBreakdown = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount: Math.round(amount * 100) / 100,
          percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      const hasData = yearlyData.expenses.length > 0 || yearlyData.mealTracker.length > 0;

      console.log(`[Report] Yearly report generated for user ${userId}, year ${year}, hasData: ${hasData}`);

      return sendJson(res, 200, {
        success: true,
        data: {
          user: { id: String(user.id), name: String(user.name), email: String(user.email) },
          year: yearNum,
          generatedAt: new Date().toISOString(),
          hasData,
          summary: {
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            totalMealPayments: Math.round(totalMealPayments * 100) / 100,
            totalOverall: Math.round(totalOverall * 100) / 100,
            totalMealDays,
            totalMealPortions,
            expenseCount: yearlyData.expenses.length,
            paymentCount: yearlyData.payments.length,
          },
          monthlyBreakdown,
          categoryBreakdown,
          recurringItems: yearlyData.recurringItems,
        },
      });
    } catch (err) {
      console.error('Yearly report error:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to generate yearly report' });
    }
  }

  // POST /meals/toggle
  if (path === '/meals/toggle' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const date = sanitizeInput(body.date, 10);
      const recurringItemId = sanitizeInput(body.recurringItemId, 100);

      if (!isValidDate(date) || !isValidId(recurringItemId)) {
        return sendJson(res, 400, { success: false, error: 'Valid date (YYYY-MM-DD) and recurringItemId required' });
      }

      // Verify recurring item belongs to this user
      const recCheck = await db.execute({
        sql: 'SELECT id FROM recurring_items WHERE id = ? AND user_id = ?',
        args: [recurringItemId, userId],
      });
      if (recCheck.rows.length === 0) {
        return sendJson(res, 404, { success: false, error: 'Recurring item not found' });
      }

      const month = date.slice(0, 7);
      const existingRes = await db.execute({
        sql: 'SELECT * FROM meal_tracker WHERE date = ? AND user_id = ?',
        args: [date, userId],
      });
      const existing = existingRes.rows[0];

      let updatedMarks = {};
      const now = new Date().toISOString();

      if (existing) {
        const currentMarks = existing.meals_marked ? JSON.parse(String(existing.meals_marked)) : {};
        const currentVal = !!currentMarks[recurringItemId];
        updatedMarks = { ...currentMarks, [recurringItemId]: !currentVal };

        const hasAnyMarked = Object.values(updatedMarks).some(Boolean);
        if (!hasAnyMarked && !existing.notes) {
          await db.execute({ sql: 'DELETE FROM meal_tracker WHERE date = ? AND user_id = ?', args: [date, userId] });
        } else {
          await db.execute({
            sql: 'UPDATE meal_tracker SET meals_marked = ?, updated_at = ? WHERE date = ? AND user_id = ?',
            args: [JSON.stringify(updatedMarks), now, date, userId],
          });
        }
      } else {
        updatedMarks = { [recurringItemId]: true };
        const id = `meal-track-${date}-${Date.now()}`;
        await db.execute({
          sql: `INSERT INTO meal_tracker (id, date, month, meals_marked, notes, created_at, updated_at, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, date, month, JSON.stringify(updatedMarks), '', now, now, userId],
        });
      }

      broadcastEvent(userId, 'MEAL_TOGGLED', { date, recurringItemId });
      return sendJson(res, 200, { success: true, data: { date, mealsMarked: updatedMarks } });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error in /meals/toggle:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to toggle meal' });
    }
  }

  // POST /meals/notes
  if (path === '/meals/notes' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const date = sanitizeInput(body.date, 10);
      const notes = sanitizeInput(body.notes, 2000);

      if (!isValidDate(date)) return sendJson(res, 400, { success: false, error: 'Valid date (YYYY-MM-DD) required' });

      const month = date.slice(0, 7);
      const existingRes = await db.execute({
        sql: 'SELECT * FROM meal_tracker WHERE date = ? AND user_id = ?',
        args: [date, userId],
      });
      const existing = existingRes.rows[0];
      const now = new Date().toISOString();

      if (existing) {
        await db.execute({
          sql: 'UPDATE meal_tracker SET notes = ?, updated_at = ? WHERE date = ? AND user_id = ?',
          args: [notes, now, date, userId],
        });
      } else if (notes) {
        const id = `meal-track-${date}-${Date.now()}`;
        await db.execute({
          sql: `INSERT INTO meal_tracker (id, date, month, meals_marked, notes, created_at, updated_at, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, date, month, JSON.stringify({}), notes, now, now, userId],
        });
      }

      broadcastEvent(userId, 'NOTES_UPDATED', { date, notes });
      return sendJson(res, 200, { success: true, data: { date, notes } });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error in /meals/notes:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to update notes' });
    }
  }

  // POST /expenses
  if (path === '/expenses' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
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
        sql: 'SELECT id FROM expenses WHERE id = ? AND user_id = ?',
        args: [expenseId, userId],
      });

      if (existingRes.rows.length > 0) {
        await db.execute({
          sql: `UPDATE expenses
                SET date = ?, month = ?, description = ?, category = ?, unit_price = ?, quantity = ?, total_amount = ?, notes = ?, attachment = ?, updated_at = ?
                WHERE id = ? AND user_id = ?`,
          args: [date, month, description, category, uPrice, qty, tot, notes, attachment, now, expenseId, userId],
        });
      } else {
        await db.execute({
          sql: `INSERT INTO expenses (id, date, month, description, category, unit_price, quantity, total_amount, notes, attachment, created_at, updated_at, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [expenseId, date, month, description, category, uPrice, qty, tot, notes, attachment, now, now, userId],
        });
      }

      const savedExpense = { id: expenseId, date, month, description, category, unitPrice: uPrice, quantity: qty, totalAmount: tot, notes, attachment, updatedAt: now };
      broadcastEvent(userId, 'EXPENSE_SAVED', savedExpense);
      return sendJson(res, 200, { success: true, data: savedExpense });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error saving expense:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to save expense' });
    }
  }

  // DELETE /expenses/:id
  const deleteExpenseMatch = path.match(/^\/expenses\/([a-zA-Z0-9_-]{1,100})$/);
  if (deleteExpenseMatch && method === 'DELETE') {
    try {
      const id = deleteExpenseMatch[1];
      // Only delete if owned by user
      const result = await db.execute({
        sql: 'DELETE FROM expenses WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      if (result.rowsAffected === 0) {
        return sendJson(res, 404, { success: false, error: 'Expense not found' });
      }
      broadcastEvent(userId, 'EXPENSE_DELETED', { id });
      return sendJson(res, 200, { success: true, data: { id } });
    } catch (err) {
      console.error('Error deleting expense:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to delete expense' });
    }
  }

  // POST /recurring
  if (path === '/recurring' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const id = body.id ? sanitizeInput(body.id, 100) : null;
      const name = sanitizeInput(body.name, 200);
      const frequency = sanitizeInput(body.frequency, 50) || 'daily';
      const startDate = isValidDate(body.startDate) ? body.startDate : new Date().toISOString().slice(0, 10);
      const endDate = isValidDate(body.endDate) ? body.endDate : null;
      const icon = sanitizeInput(body.icon, 10) || '🍽️';
      const description = sanitizeInput(body.description, 500);

      if (!name) return sendJson(res, 400, { success: false, error: 'Name required' });
      if (id && !isValidId(id)) return sendJson(res, 400, { success: false, error: 'Invalid recurring item ID format' });

      const price = Number.isFinite(Number(body.pricePerOccurrence)) ? Math.min(Math.max(0, Number(body.pricePerOccurrence)), 1000000) : 0;
      const now = new Date().toISOString();
      const itemId = id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      let historyJson = JSON.stringify([{ effectiveFrom: startDate, price }]);
      if (Array.isArray(body.priceHistory)) historyJson = JSON.stringify(body.priceHistory);
      const isActiveVal = body.isActive !== false ? 1 : 0;

      // If ID provided, check ownership
      if (id) {
        const existingRes = await db.execute({
          sql: 'SELECT id FROM recurring_items WHERE id = ? AND user_id = ?',
          args: [itemId, userId],
        });
        if (existingRes.rows.length > 0) {
          await db.execute({
            sql: `UPDATE recurring_items
                  SET name = ?, price_per_occurrence = ?, frequency = ?, start_date = ?, end_date = ?, is_active = ?, icon = ?, description = ?, price_history = ?, updated_at = ?
                  WHERE id = ? AND user_id = ?`,
            args: [name, price, frequency, startDate, endDate, isActiveVal, icon, description, historyJson, now, itemId, userId],
          });
        } else {
          await db.execute({
            sql: `INSERT INTO recurring_items (id, name, price_per_occurrence, frequency, start_date, end_date, is_active, icon, description, price_history, created_at, updated_at, user_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [itemId, name, price, frequency, startDate, endDate, isActiveVal, icon, description, historyJson, now, now, userId],
          });
        }
      } else {
        await db.execute({
          sql: `INSERT INTO recurring_items (id, name, price_per_occurrence, frequency, start_date, end_date, is_active, icon, description, price_history, created_at, updated_at, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [itemId, name, price, frequency, startDate, endDate, isActiveVal, icon, description, historyJson, now, now, userId],
        });
      }

      broadcastEvent(userId, 'RECURRING_SAVED', { id: itemId, name });
      return sendJson(res, 200, { success: true, data: { id: itemId } });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error saving recurring item:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to save recurring item' });
    }
  }

  // PATCH /recurring/:id/toggle
  const toggleRecurringMatch = path.match(/^\/recurring\/([a-zA-Z0-9_-]{1,100})\/toggle$/);
  if (toggleRecurringMatch && method === 'PATCH') {
    try {
      const id = toggleRecurringMatch[1];
      const currentRes = await db.execute({
        sql: 'SELECT is_active FROM recurring_items WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      const current = currentRes.rows[0];
      if (!current) return sendJson(res, 404, { success: false, error: 'Item not found' });

      const nextState = Number(current.is_active) === 1 ? 0 : 1;
      await db.execute({
        sql: 'UPDATE recurring_items SET is_active = ?, updated_at = ? WHERE id = ? AND user_id = ?',
        args: [nextState, new Date().toISOString(), id, userId],
      });

      broadcastEvent(userId, 'RECURRING_TOGGLED', { id, isActive: nextState === 1 });
      return sendJson(res, 200, { success: true, data: { id, isActive: nextState === 1 } });
    } catch (err) {
      console.error('Error toggling recurring item:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to toggle item state' });
    }
  }

  // DELETE /recurring/:id
  const deleteRecurringMatch = path.match(/^\/recurring\/([a-zA-Z0-9_-]{1,100})$/);
  if (deleteRecurringMatch && method === 'DELETE') {
    try {
      const id = deleteRecurringMatch[1];
      const result = await db.execute({
        sql: 'DELETE FROM recurring_items WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      if (result.rowsAffected === 0) return sendJson(res, 404, { success: false, error: 'Item not found' });

      broadcastEvent(userId, 'RECURRING_DELETED', { id });
      return sendJson(res, 200, { success: true, data: { id } });
    } catch (err) {
      console.error('Error deleting recurring item:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to delete recurring item' });
    }
  }

  // POST /budgets
  if (path === '/budgets' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const id = body.id ? sanitizeInput(body.id, 100) : null;
      const month = sanitizeInput(body.month, 7);
      const category = sanitizeInput(body.category, 50) || 'overall';
      const amount = Number.isFinite(Number(body.amount)) ? Math.max(0, Number(body.amount)) : 0;

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return sendJson(res, 400, { success: false, error: 'Valid month (YYYY-MM) required' });
      }

      const now = new Date().toISOString();
      const budgetId = id || `bgt-${month}-${category}-${userId.slice(-6)}`;

      await db.execute({
        sql: `INSERT INTO budgets (id, month, category, amount, created_at, updated_at, user_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(month, category) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at`,
        args: [budgetId, month, category, amount, now, now, userId],
      });

      const savedBudget = { id: budgetId, month, category, amount, updatedAt: now };
      broadcastEvent(userId, 'BUDGET_SAVED', savedBudget);
      return sendJson(res, 200, { success: true, data: savedBudget });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error saving budget:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to save budget' });
    }
  }

  // DELETE /budgets/:id
  const deleteBudgetMatch = path.match(/^\/budgets\/([a-zA-Z0-9_-]{1,100})$/);
  if (deleteBudgetMatch && method === 'DELETE') {
    try {
      const id = deleteBudgetMatch[1];
      const result = await db.execute({
        sql: 'DELETE FROM budgets WHERE id = ? AND user_id = ?',
        args: [id, userId],
      });
      if (result.rowsAffected === 0) return sendJson(res, 404, { success: false, error: 'Budget not found' });

      broadcastEvent(userId, 'BUDGET_DELETED', { id });
      return sendJson(res, 200, { success: true, data: { id } });
    } catch (err) {
      console.error('Error deleting budget:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to delete budget' });
    }
  }

  // POST /settings
  if (path === '/settings' && method === 'POST') {
    try {
      const settingsObj = await parseJsonBody(req);
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
            sql: `INSERT INTO settings (key, value, updated_at, user_id) VALUES (?, ?, ?, ?)
                  ON CONFLICT(key, user_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            args: [sanitizedKey, sanitizedVal, now, userId],
          });
        }
      }

      if (statements.length > 0) {
        await db.batch(statements, 'write');
      }

      broadcastEvent(userId, 'SETTINGS_UPDATED', settingsObj);
      return sendJson(res, 200, { success: true, data: settingsObj });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error updating settings:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to update settings' });
    }
  }

  // POST /clear
  if (path === '/clear' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const adminSecret = process.env.ADMIN_SECRET;

      if (adminSecret && req.headers['x-admin-secret'] !== adminSecret) {
        return sendJson(res, 403, { success: false, error: 'Forbidden: Invalid Admin Secret' });
      }

      if (body.confirm !== true) {
        return sendJson(res, 400, { success: false, error: 'Data clear confirmation required' });
      }

      // Only clear the authenticated user's data
      await db.batch([
        { sql: 'DELETE FROM meal_tracker WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM expenses WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM recurring_items WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM budgets WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM payments WHERE user_id = ?', args: [userId] },
      ], 'write');

      broadcastEvent(userId, 'DATA_CLEARED', {});
      return sendJson(res, 200, { success: true });
    } catch (err) {
      console.error('Error clearing data:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to clear data' });
    }
  }

  // POST /payments/mark-paid
  if (path === '/payments/mark-paid' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const recurringItemId = sanitizeInput(body.recurringItemId, 100);
      const paidTillDate = sanitizeInput(body.paidTillDate, 10);
      const notes = sanitizeInput(body.notes, 1000);

      if (!isValidId(recurringItemId) || !isValidDate(paidTillDate)) {
        return sendJson(res, 400, { success: false, error: 'Valid recurringItemId and paidTillDate (YYYY-MM-DD) required' });
      }

      // Verify item ownership
      const recRes = await db.execute({
        sql: 'SELECT * FROM recurring_items WHERE id = ? AND user_id = ?',
        args: [recurringItemId, userId],
      });
      const itemRow = recRes.rows[0];
      if (!itemRow) return sendJson(res, 404, { success: false, error: 'Recurring item not found' });

      const mealRes = await db.execute({
        sql: 'SELECT * FROM meal_tracker WHERE user_id = ? ORDER BY date ASC',
        args: [userId],
      });

      const eligibleEntries = [];
      for (const row of mealRes.rows) {
        const date = String(row.date);
        if (date > paidTillDate) continue;
        const mealsMarked = row.meals_marked ? JSON.parse(String(row.meals_marked)) : {};
        const mealsPaid = row.meals_paid ? JSON.parse(String(row.meals_paid)) : {};
        const isMarked = !!mealsMarked[recurringItemId];
        const isPaid = !!(mealsPaid[recurringItemId]?.paid || mealsPaid[recurringItemId] === true);
        if (isMarked && !isPaid) {
          eligibleEntries.push({ id: String(row.id), date, mealsMarked, mealsPaid });
        }
      }

      if (eligibleEntries.length === 0) {
        return sendJson(res, 400, { success: false, error: 'No unpaid meal records found through the selected Paid Till date' });
      }

      const unpaidStartDate = eligibleEntries[0].date;
      const mealCount = eligibleEntries.length;
      const now = new Date().toISOString();
      const todayDateStr = now.slice(0, 10);
      const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const priceHistory = itemRow.price_history ? JSON.parse(String(itemRow.price_history)) : [];
      let totalAmount = 0;
      for (const entry of eligibleEntries) {
        let price = Number(itemRow.price_per_occurrence) || 0;
        if (Array.isArray(priceHistory) && priceHistory.length > 0) {
          const sorted = [...priceHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
          const applicable = sorted.find((p) => p.effectiveFrom <= entry.date);
          if (applicable && typeof applicable.price === 'number') price = applicable.price;
        }
        totalAmount += price;
      }

      const statements = [];
      for (const entry of eligibleEntries) {
        const updatedMealsPaid = { ...entry.mealsPaid, [recurringItemId]: { paid: true, paymentId, paidAt: now } };
        statements.push({
          sql: 'UPDATE meal_tracker SET meals_paid = ?, updated_at = ? WHERE id = ? AND user_id = ?',
          args: [JSON.stringify(updatedMealsPaid), now, entry.id, userId],
        });
      }

      statements.push({
        sql: `INSERT INTO payments (id, recurring_item_id, start_date, paid_till_date, meal_count, total_amount, payment_date, notes, created_at, updated_at, user_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [paymentId, recurringItemId, unpaidStartDate, paidTillDate, mealCount, totalAmount, todayDateStr, notes, now, now, userId],
      });

      await db.batch(statements, 'write');

      const newPayment = { id: paymentId, recurringItemId, startDate: unpaidStartDate, paidTillDate, mealCount, totalAmount, paymentDate: todayDateStr, notes, createdAt: now, updatedAt: now };
      broadcastEvent(userId, 'MEAL_PAID', newPayment);
      return sendJson(res, 200, { success: true, data: newPayment });
    } catch (err) {
      if (err.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { success: false, error: 'Payload too large' });
      if (err.message === 'INVALID_JSON') return sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      console.error('Error in /payments/mark-paid:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to record meal payment' });
    }
  }

  // DELETE /payments/:id
  const deletePaymentMatch = path.match(/^\/payments\/([a-zA-Z0-9_-]{1,100})$/);
  if (deletePaymentMatch && method === 'DELETE') {
    try {
      const paymentId = deletePaymentMatch[1];
      const payRes = await db.execute({
        sql: 'SELECT * FROM payments WHERE id = ? AND user_id = ?',
        args: [paymentId, userId],
      });
      const paymentRow = payRes.rows[0];
      if (!paymentRow) return sendJson(res, 404, { success: false, error: 'Payment record not found' });

      const recId = String(paymentRow.recurring_item_id);
      const startDate = String(paymentRow.start_date);
      const paidTillDate = String(paymentRow.paid_till_date);

      const mealRes = await db.execute({
        sql: 'SELECT * FROM meal_tracker WHERE date >= ? AND date <= ? AND user_id = ?',
        args: [startDate, paidTillDate, userId],
      });

      const now = new Date().toISOString();
      const statements = [];

      for (const row of mealRes.rows) {
        const mealsPaid = row.meals_paid ? JSON.parse(String(row.meals_paid)) : {};
        if (recId in mealsPaid) {
          delete mealsPaid[recId];
          statements.push({
            sql: 'UPDATE meal_tracker SET meals_paid = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            args: [JSON.stringify(mealsPaid), now, String(row.id), userId],
          });
        }
      }

      statements.push({ sql: 'DELETE FROM payments WHERE id = ? AND user_id = ?', args: [paymentId, userId] });

      await db.batch(statements, 'write');

      broadcastEvent(userId, 'PAYMENT_DELETED', { id: paymentId });
      return sendJson(res, 200, { success: true, data: { id: paymentId } });
    } catch (err) {
      console.error('Error deleting payment:', err);
      return sendJson(res, 500, { success: false, error: 'Failed to revert payment record' });
    }
  }

  // POST /maintenance
  if (path === '/maintenance' && method === 'POST') {
    try {
      const results = await runDatabaseMaintenance();
      broadcastEvent(userId, 'MAINTENANCE_COMPLETED', results);
      return sendJson(res, 200, { success: true, data: results });
    } catch (err) {
      console.error('Maintenance error:', err);
      return sendJson(res, 500, { success: false, error: 'Database maintenance encountered an issue' });
    }
  }

  if (next) {
    next();
  } else {
    sendJson(res, 404, { error: 'Not Found' });
  }
}
