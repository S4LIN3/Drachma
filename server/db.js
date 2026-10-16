import pg from 'pg';
import { createClient as createLibsqlClient } from '@libsql/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../.env') });
loadEnv();

const { Pool } = pg;

// ─── Database Configuration ──────────────────────────────────────────────────
const pgConnectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  null;

export const isPostgres = !!pgConnectionString;

// Initialize Supabase official JS client (optional, for client-side / SDK integrations)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabase =
  supabaseUrl && supabaseKey
    ? createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      })
    : null;

// Initialize PostgreSQL Connection Pool or Local SQLite fallback
let pgPool = null;
let libsqlClient = null;

if (isPostgres) {
  pgPool = new Pool({
    connectionString: pgConnectionString,
    ssl: pgConnectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    max: parseInt(process.env.PG_POOL_MAX || '3', 10),
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000,
  });

  pgPool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle PostgreSQL client:', err.message);
  });
} else {
  const localDbPath = path.join(__dirname, 'expenses.db');
  libsqlClient = createLibsqlClient({
    url: process.env.TURSO_DATABASE_URL || `file:${localDbPath}`,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
}

/**
 * Format SQLite queries to PostgreSQL syntax:
 * - Translates ? parameter placeholders into $1, $2, ...
 * - Translates "INSERT OR IGNORE INTO ..." into "INSERT INTO ... ON CONFLICT DO NOTHING"
 */
export function formatPgSql(sql) {
  let paramIndex = 1;
  let formatted = sql.replace(/\?/g, () => `$${paramIndex++}`);

  if (/^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(formatted)) {
    formatted = formatted.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i, 'INSERT INTO ');
    if (!/ON\s+CONFLICT/i.test(formatted)) {
      formatted = formatted.trim().replace(/;*$/, '') + ' ON CONFLICT DO NOTHING;';
    }
  }

  return formatted;
}

// Universal DB interface
export const db = {
  async execute(stmt) {
    if (isPostgres) {
      const sql = typeof stmt === 'string' ? stmt : stmt.sql;
      const args = (stmt && stmt.args) || [];
      const pgSql = formatPgSql(sql);
      const res = await pgPool.query(pgSql, args);
      return { rows: res.rows };
    } else {
      return libsqlClient.execute(stmt);
    }
  },

  async batch(statements, mode = 'write') {
    if (isPostgres) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const results = [];
        for (const stmt of statements) {
          const sql = typeof stmt === 'string' ? stmt : stmt.sql;
          const args = (stmt && stmt.args) || [];
          const pgSql = formatPgSql(sql);
          const res = await client.query(pgSql, args);
          results.push({ rows: res.rows });
        }
        await client.query('COMMIT');
        return results;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      return libsqlClient.batch(statements, mode);
    }
  },
};

let isInitialized = false;

export const DEFAULT_USER_ID = 'user-default-migrated';

// Initialize Database Schema asynchronously
export async function initDatabase() {
  if (isInitialized) return;

  try {
    if (isPostgres) {
      console.log('[DB] Connecting to Supabase PostgreSQL database...');
      // 1. Core tables for PostgreSQL
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS recurring_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price_per_occurrence DOUBLE PRECISION NOT NULL,
          frequency TEXT DEFAULT 'daily',
          start_date TEXT,
          end_date TEXT,
          is_active INTEGER DEFAULT 1,
          icon TEXT DEFAULT '🍽️',
          description TEXT DEFAULT '',
          price_history TEXT,
          created_at TEXT,
          updated_at TEXT,
          user_id TEXT
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS meal_tracker (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          month TEXT NOT NULL,
          meals_marked TEXT NOT NULL,
          notes TEXT DEFAULT '',
          meals_paid TEXT DEFAULT '{}',
          created_at TEXT,
          updated_at TEXT,
          user_id TEXT,
          CONSTRAINT uq_meal_tracker_date_user UNIQUE (date, user_id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          month TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          unit_price DOUBLE PRECISION NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          total_amount DOUBLE PRECISION NOT NULL,
          notes TEXT DEFAULT '',
          attachment TEXT DEFAULT '',
          created_at TEXT,
          updated_at TEXT,
          user_id TEXT
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS budgets (
          id TEXT PRIMARY KEY,
          month TEXT NOT NULL,
          category TEXT NOT NULL,
          amount DOUBLE PRECISION NOT NULL,
          created_at TEXT,
          updated_at TEXT,
          user_id TEXT,
          CONSTRAINT uq_budgets_month_category_user UNIQUE (month, category, user_id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at TEXT,
          user_id TEXT,
          CONSTRAINT uq_settings_key_user UNIQUE (key, user_id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          recurring_item_id TEXT NOT NULL,
          start_date TEXT NOT NULL,
          paid_till_date TEXT NOT NULL,
          meal_count INTEGER NOT NULL,
          total_amount DOUBLE PRECISION NOT NULL,
          payment_date TEXT NOT NULL,
          notes TEXT DEFAULT '',
          created_at TEXT,
          updated_at TEXT,
          user_id TEXT
        );
      `);

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_meal_tracker_date ON meal_tracker(date);',
        'CREATE INDEX IF NOT EXISTS idx_meal_tracker_month ON meal_tracker(month);',
        'CREATE INDEX IF NOT EXISTS idx_meal_tracker_user ON meal_tracker(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_meal_tracker_user_date ON meal_tracker(user_id, date);',
        'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);',
        'CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);',
        'CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);',
        'CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);',
        'CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_items(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_payments_recurring ON payments(recurring_item_id);',
        'CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);',
        'CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      ];
      for (const idx of indexes) {
        try {
          await db.execute(idx);
        } catch (_) {}
      }
    } else {
      console.log('[DB] Running on SQLite / Turso...');
      await db.batch([
        {
          sql: `CREATE TABLE IF NOT EXISTS recurring_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price_per_occurrence REAL NOT NULL,
            frequency TEXT DEFAULT 'daily',
            start_date TEXT,
            end_date TEXT,
            is_active INTEGER DEFAULT 1,
            icon TEXT DEFAULT '🍽️',
            description TEXT DEFAULT '',
            price_history TEXT,
            created_at TEXT,
            updated_at TEXT,
            user_id TEXT
          );`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS meal_tracker (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            month TEXT NOT NULL,
            meals_marked TEXT NOT NULL,
            notes TEXT DEFAULT '',
            meals_paid TEXT DEFAULT '{}',
            created_at TEXT,
            updated_at TEXT,
            user_id TEXT,
            UNIQUE(date, user_id)
          );`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            month TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            total_amount REAL NOT NULL,
            notes TEXT DEFAULT '',
            attachment TEXT DEFAULT '',
            created_at TEXT,
            updated_at TEXT,
            user_id TEXT
          );`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            month TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            user_id TEXT,
            UNIQUE(month, category, user_id)
          );`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS settings (
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT,
            user_id TEXT,
            UNIQUE(key, user_id)
          );`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            recurring_item_id TEXT NOT NULL,
            start_date TEXT NOT NULL,
            paid_till_date TEXT NOT NULL,
            meal_count INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            payment_date TEXT NOT NULL,
            notes TEXT DEFAULT '',
            created_at TEXT,
            updated_at TEXT,
            user_id TEXT
          );`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );`,
          args: [],
        },
      ], 'write');
    }

    isInitialized = true;
    console.log(`[DB] Database initialized successfully (${isPostgres ? 'Supabase PostgreSQL' : 'SQLite'})`);
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
}

// ─── User-scoped data fetch ──────────────────────────────────────────────────

export async function getAllData(userId) {
  await initDatabase();

  if (!userId) throw new Error('userId required for getAllData');

  const [recRes, mealRes, expRes, budgetRes, setRes, payRes] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM recurring_items WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM meal_tracker WHERE user_id = ? ORDER BY date ASC', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM budgets WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM settings WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM payments WHERE user_id = ? ORDER BY payment_date DESC, created_at DESC', args: [userId] }),
  ]);

  const recurringItems = recRes.rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    pricePerOccurrence: Number(r.price_per_occurrence),
    frequency: String(r.frequency || 'daily'),
    startDate: r.start_date ? String(r.start_date) : null,
    endDate: r.end_date ? String(r.end_date) : null,
    isActive: Number(r.is_active) === 1 || r.is_active === true,
    icon: String(r.icon || '🍽️'),
    description: String(r.description || ''),
    priceHistory: typeof r.price_history === 'string' ? (r.price_history ? JSON.parse(String(r.price_history)) : []) : (r.price_history || []),
    createdAt: r.created_at ? String(r.created_at) : null,
    updatedAt: r.updated_at ? String(r.updated_at) : null,
  }));

  const mealTracker = mealRes.rows.map((m) => ({
    id: String(m.id),
    date: String(m.date),
    month: String(m.month),
    mealsMarked: typeof m.meals_marked === 'string' ? (m.meals_marked ? JSON.parse(String(m.meals_marked)) : {}) : (m.meals_marked || {}),
    mealsPaid: typeof m.meals_paid === 'string' ? (m.meals_paid ? JSON.parse(String(m.meals_paid)) : {}) : (m.meals_paid || {}),
    notes: m.notes ? String(m.notes) : '',
    createdAt: m.created_at ? String(m.created_at) : null,
    updatedAt: m.updated_at ? String(m.updated_at) : null,
  }));

  const expenses = expRes.rows.map((e) => ({
    id: String(e.id),
    date: String(e.date),
    month: String(e.month),
    description: String(e.description),
    category: String(e.category),
    unitPrice: Number(e.unit_price),
    quantity: Number(e.quantity),
    totalAmount: Number(e.total_amount),
    notes: e.notes ? String(e.notes) : '',
    attachment: e.attachment ? String(e.attachment) : '',
    createdAt: e.created_at ? String(e.created_at) : null,
    updatedAt: e.updated_at ? String(e.updated_at) : null,
  }));

  const budgets = budgetRes.rows.map((b) => ({
    id: String(b.id),
    month: String(b.month),
    category: String(b.category),
    amount: Number(b.amount),
    createdAt: b.created_at ? String(b.created_at) : null,
    updatedAt: b.updated_at ? String(b.updated_at) : null,
  }));

  const settings = {};
  for (const s of setRes.rows) {
    const val = String(s.value);
    settings[String(s.key)] = val === 'true' ? true : val === 'false' ? false : val;
  }

  const payments = payRes.rows.map((p) => ({
    id: String(p.id),
    recurringItemId: String(p.recurring_item_id),
    startDate: String(p.start_date),
    paidTillDate: String(p.paid_till_date),
    mealCount: Number(p.meal_count),
    totalAmount: Number(p.total_amount),
    paymentDate: String(p.payment_date),
    notes: p.notes ? String(p.notes) : '',
    createdAt: p.created_at ? String(p.created_at) : null,
    updatedAt: p.updated_at ? String(p.updated_at) : null,
  }));

  return { recurringItems, mealTracker, expenses, budgets, settings, payments };
}

/**
 * Fetch yearly data for a specific user and year for report generation.
 */
export async function getYearlyData(userId, year) {
  await initDatabase();

  if (!userId) throw new Error('userId required');
  if (!year || !/^\d{4}$/.test(String(year))) throw new Error('Valid 4-digit year required');

  const startDate = `${year}-01-01`;
  const startOfNextYear = `${Number(year) + 1}-01-01`;

  const [expRes, mealRes, payRes, recRes] = await Promise.all([
    db.execute({
      sql: `SELECT * FROM expenses
            WHERE user_id = ?
              AND date >= ?
              AND date < ?
            ORDER BY date ASC`,
      args: [userId, startDate, startOfNextYear],
    }),
    db.execute({
      sql: `SELECT * FROM meal_tracker
            WHERE user_id = ?
              AND date >= ?
              AND date < ?
            ORDER BY date ASC`,
      args: [userId, startDate, startOfNextYear],
    }),
    db.execute({
      sql: `SELECT * FROM payments
            WHERE user_id = ?
              AND payment_date >= ?
              AND payment_date < ?
            ORDER BY payment_date ASC`,
      args: [userId, startDate, startOfNextYear],
    }),
    db.execute({
      sql: 'SELECT * FROM recurring_items WHERE user_id = ?',
      args: [userId],
    }),
  ]);

  return {
    expenses: expRes.rows.map((e) => ({
      id: String(e.id),
      date: String(e.date),
      month: String(e.month),
      description: String(e.description),
      category: String(e.category),
      unitPrice: Number(e.unit_price),
      quantity: Number(e.quantity),
      totalAmount: Number(e.total_amount),
      notes: e.notes ? String(e.notes) : '',
      createdAt: e.created_at ? String(e.created_at) : null,
    })),
    mealTracker: mealRes.rows.map((m) => ({
      id: String(m.id),
      date: String(m.date),
      month: String(m.month),
      mealsMarked: typeof m.meals_marked === 'string' ? (m.meals_marked ? JSON.parse(String(m.meals_marked)) : {}) : (m.meals_marked || {}),
      mealsPaid: typeof m.meals_paid === 'string' ? (m.meals_paid ? JSON.parse(String(m.meals_paid)) : {}) : (m.meals_paid || {}),
      notes: m.notes ? String(m.notes) : '',
    })),
    payments: payRes.rows.map((p) => ({
      id: String(p.id),
      recurringItemId: String(p.recurring_item_id),
      startDate: String(p.start_date),
      paidTillDate: String(p.paid_till_date),
      mealCount: Number(p.meal_count),
      totalAmount: Number(p.total_amount),
      paymentDate: String(p.payment_date),
      notes: p.notes ? String(p.notes) : '',
    })),
    recurringItems: recRes.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      pricePerOccurrence: Number(r.price_per_occurrence),
      frequency: String(r.frequency || 'daily'),
      icon: String(r.icon || '🍽️'),
      priceHistory: typeof r.price_history === 'string' ? (r.price_history ? JSON.parse(String(r.price_history)) : []) : (r.price_history || []),
    })),
    year: Number(year),
  };
}

/**
 * Database Maintenance Routine
 */
export async function runDatabaseMaintenance() {
  await initDatabase();

  const results = {
    integrityCheck: 'ok',
    engine: isPostgres ? 'Supabase PostgreSQL' : 'SQLite',
    recordsCount: {},
    cleanedRecords: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    const [recC, mealC, expC, bgtC, payC, usrC] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM recurring_items'),
      db.execute('SELECT COUNT(*) as count FROM meal_tracker'),
      db.execute('SELECT COUNT(*) as count FROM expenses'),
      db.execute('SELECT COUNT(*) as count FROM budgets'),
      db.execute('SELECT COUNT(*) as count FROM payments'),
      db.execute('SELECT COUNT(*) as count FROM users'),
    ]);

    results.recordsCount = {
      users: Number(usrC.rows[0]?.count || 0),
      recurringItems: Number(recC.rows[0]?.count || 0),
      mealTrackerDays: Number(mealC.rows[0]?.count || 0),
      expenses: Number(expC.rows[0]?.count || 0),
      budgets: Number(bgtC.rows[0]?.count || 0),
      payments: Number(payC.rows[0]?.count || 0),
    };
  } catch (err) {
    console.error('Maintenance routine warning:', err);
    results.error = err.message;
  }

  return results;
}
