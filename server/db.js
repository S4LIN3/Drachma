import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration:
// 1. TURSO_DATABASE_URL + TURSO_AUTH_TOKEN -> Cloud Turso Serverless Database (Vercel)
// 2. Local development -> Local SQLite file
const localDbPath = path.join(__dirname, 'expenses.db');

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${localDbPath}`,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

let isInitialized = false;

// Initialize Database Schema asynchronously
export async function initDatabase() {
  if (isInitialized) return;

  try {
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
          updated_at TEXT
        );`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS meal_tracker (
          id TEXT PRIMARY KEY,
          date TEXT UNIQUE NOT NULL,
          month TEXT NOT NULL,
          meals_marked TEXT NOT NULL,
          notes TEXT DEFAULT '',
          created_at TEXT,
          updated_at TEXT
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
          updated_at TEXT
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
          UNIQUE(month, category)
        );`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT
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
          updated_at TEXT
        );`,
        args: [],
      },
    ], 'write');

    // Safe migration: Add attachment column if expenses table existed previously without it
    try {
      await db.execute('ALTER TABLE expenses ADD COLUMN attachment TEXT DEFAULT ""');
    } catch (e) {
      // Column already exists or table freshly created
    }

    // Safe migration: Add meals_paid column if meal_tracker table existed previously without it
    try {
      await db.execute('ALTER TABLE meal_tracker ADD COLUMN meals_paid TEXT DEFAULT "{}"');
    } catch (e) {
      // Column already exists or table freshly created
    }

    // Default recurring templates if empty
    const countRes = await db.execute('SELECT COUNT(*) as count FROM recurring_items');
    const count = Number(countRes.rows[0]?.count || 0);

    if (count === 0) {
      const now = new Date().toISOString();
      const defaultTemplates = [
        {
          id: 'rec-lunch-default',
          name: 'Lunch',
          price_per_occurrence: 100,
          frequency: 'daily',
          start_date: '2026-01-01',
          end_date: null,
          is_active: 1,
          icon: '🍽️',
          description: 'Standard Daily Lunch',
          price_history: JSON.stringify([{ effectiveFrom: '2026-01-01', price: 100 }]),
          created_at: now,
          updated_at: now,
        },
        {
          id: 'rec-dinner-default',
          name: 'Dinner',
          price_per_occurrence: 80,
          frequency: 'daily',
          start_date: '2026-01-01',
          end_date: null,
          is_active: 1,
          icon: '🍛',
          description: 'Standard Daily Dinner',
          price_history: JSON.stringify([{ effectiveFrom: '2026-01-01', price: 80 }]),
          created_at: now,
          updated_at: now,
        },
        {
          id: 'rec-tea-default',
          name: 'Tea & Snacks',
          price_per_occurrence: 25,
          frequency: 'daily',
          start_date: '2026-01-01',
          end_date: null,
          is_active: 1,
          icon: '☕',
          description: 'Evening Tea and Light Snacks',
          price_history: JSON.stringify([{ effectiveFrom: '2026-01-01', price: 25 }]),
          created_at: now,
          updated_at: now,
        },
      ];

      const statements = defaultTemplates.map((item) => ({
        sql: `INSERT INTO recurring_items (id, name, price_per_occurrence, frequency, start_date, end_date, is_active, icon, description, price_history, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.name,
          item.price_per_occurrence,
          item.frequency,
          item.start_date,
          item.end_date,
          item.is_active,
          item.icon,
          item.description,
          item.price_history,
          item.created_at,
          item.updated_at,
        ],
      }));
      await db.batch(statements, 'write');
    }

    // Default settings if empty
    const settingsCountRes = await db.execute('SELECT COUNT(*) as count FROM settings');
    const settingsCount = Number(settingsCountRes.rows[0]?.count || 0);

    if (settingsCount === 0) {
      const now = new Date().toISOString();
      const defaultSettings = [
        { key: 'theme', value: 'light' },
        { key: 'currency', value: 'INR' },
        { key: 'notificationsEnabled', value: 'true' },
      ];
      const settingsStatements = defaultSettings.map((s) => ({
        sql: 'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        args: [s.key, s.value, now],
      }));
      await db.batch(settingsStatements, 'write');
    }

    isInitialized = true;
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
}

// Helper Queries for Full Data Synchronization
export async function getAllData() {
  await initDatabase();

  const [recRes, mealRes, expRes, budgetRes, setRes, payRes] = await Promise.all([
    db.execute('SELECT * FROM recurring_items'),
    db.execute('SELECT * FROM meal_tracker ORDER BY date ASC'),
    db.execute('SELECT * FROM expenses ORDER BY date DESC'),
    db.execute('SELECT * FROM budgets'),
    db.execute('SELECT * FROM settings'),
    db.execute('SELECT * FROM payments ORDER BY payment_date DESC, created_at DESC'),
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
    priceHistory: r.price_history ? JSON.parse(String(r.price_history)) : [],
    createdAt: r.created_at ? String(r.created_at) : null,
    updatedAt: r.updated_at ? String(r.updated_at) : null,
  }));

  const mealTracker = mealRes.rows.map((m) => ({
    id: String(m.id),
    date: String(m.date),
    month: String(m.month),
    mealsMarked: m.meals_marked ? JSON.parse(String(m.meals_marked)) : {},
    mealsPaid: m.meals_paid ? JSON.parse(String(m.meals_paid)) : {},
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
