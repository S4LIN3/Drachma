-- ============================================================================
-- Drachma Database Schema for Supabase (PostgreSQL)
-- ============================================================================
-- Run this script in the Supabase Dashboard -> SQL Editor (or via psql)
-- It creates all required tables, constraints, indexes, and RLS policies.
-- ============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Recurring Items Table
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

-- 3. Meal Tracker Table
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

-- 4. Expenses Table
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

-- 5. Budgets Table
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

-- 6. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT,
  user_id TEXT,
  CONSTRAINT uq_settings_key_user UNIQUE (key, user_id)
);

-- 7. Payments Table
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

-- ============================================================================
-- Performance Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_meal_tracker_date ON meal_tracker(date);
CREATE INDEX IF NOT EXISTS idx_meal_tracker_month ON meal_tracker(month);
CREATE INDEX IF NOT EXISTS idx_meal_tracker_user ON meal_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_tracker_user_date ON meal_tracker(user_id, date);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);

CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_items(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_recurring ON payments(recurring_item_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Supabase Row Level Security (RLS) Configuration
-- Enable RLS on all tables to secure direct client access while permitting
-- the server backend (using SUPABASE_SERVICE_ROLE_KEY or direct DB pooler) full access.
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow Service Role to perform all operations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_users') THEN
    CREATE POLICY service_role_all_users ON users FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_recurring') THEN
    CREATE POLICY service_role_all_recurring ON recurring_items FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_meal_tracker') THEN
    CREATE POLICY service_role_all_meal_tracker ON meal_tracker FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_expenses') THEN
    CREATE POLICY service_role_all_expenses ON expenses FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_budgets') THEN
    CREATE POLICY service_role_all_budgets ON budgets FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_settings') THEN
    CREATE POLICY service_role_all_settings ON settings FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_payments') THEN
    CREATE POLICY service_role_all_payments ON payments FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
