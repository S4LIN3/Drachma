import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'expenses.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize Database Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_items (
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
    );

    CREATE TABLE IF NOT EXISTS meal_tracker (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      month TEXT NOT NULL,
      meals_marked TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      month TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      total_amount REAL NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  // Default recurring templates if empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM recurring_items');
  const { count } = countStmt.get();

  if (count === 0) {
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO recurring_items (id, name, price_per_occurrence, frequency, start_date, end_date, is_active, icon, description, price_history, created_at, updated_at)
      VALUES (@id, @name, @price_per_occurrence, @frequency, @start_date, @end_date, @is_active, @icon, @description, @price_history, @created_at, @updated_at)
    `);

    const insertMany = db.transaction((items) => {
      for (const item of items) insertStmt.run(item);
    });

    insertMany(defaultTemplates);
  }

  // Default settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (settingsCount === 0) {
    const defaultSettings = [
      { key: 'theme', value: 'light' },
      { key: 'currency', value: 'INR' },
      { key: 'notificationsEnabled', value: 'true' },
    ];
    const insertSetting = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
    for (const s of defaultSettings) {
      insertSetting.run(s.key, s.value, new Date().toISOString());
    }
  }
}

// Helper Queries
export function getAllData() {
  const recurringItemsRows = db.prepare('SELECT * FROM recurring_items').all();
  const recurringItems = recurringItemsRows.map(r => ({
    id: r.id,
    name: r.name,
    pricePerOccurrence: r.price_per_occurrence,
    frequency: r.frequency,
    startDate: r.start_date,
    endDate: r.end_date,
    isActive: r.is_active === 1,
    icon: r.icon,
    description: r.description,
    priceHistory: r.price_history ? JSON.parse(r.price_history) : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const mealTrackerRows = db.prepare('SELECT * FROM meal_tracker ORDER BY date ASC').all();
  const mealTracker = mealTrackerRows.map(m => ({
    id: m.id,
    date: m.date,
    month: m.month,
    mealsMarked: m.meals_marked ? JSON.parse(m.meals_marked) : {},
    notes: m.notes || '',
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }));

  const expensesRows = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  const expenses = expensesRows.map(e => ({
    id: e.id,
    date: e.date,
    month: e.month,
    description: e.description,
    category: e.category,
    unitPrice: e.unit_price,
    quantity: e.quantity,
    totalAmount: e.total_amount,
    notes: e.notes || '',
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }));

  const settingsRows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const s of settingsRows) {
    settings[s.key] = s.value === 'true' ? true : s.value === 'false' ? false : s.value;
  }

  return { recurringItems, mealTracker, expenses, settings };
}
