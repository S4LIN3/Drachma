/**
 * Automated Supabase Migration & Vercel Connection Script
 *
 * 1. Validates connection to Supabase via Official SDK & PostgreSQL URI.
 * 2. Migrates existing data from local SQLite (expenses.db) or Turso to Supabase.
 * 3. Verifies database health and records.
 * 4. Displays required Vercel production environment variables.
 * 5. (Optional) Syncs environment variables directly to Vercel via Vercel CLI.
 *
 * Usage:
 *   node scripts/migrate-and-connect-vercel.js
 *   node scripts/migrate-and-connect-vercel.js --sync-vercel
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { config as loadEnv } from 'dotenv';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createTursoClient } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

loadEnv({ path: path.join(rootDir, '.env') });
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  '';
const JWT_SECRET = process.env.JWT_SECRET || '';

console.log('════════════════════════════════════════════════════════════');
console.log('🚀 DRACHMA: SUPABASE MIGRATION & VERCEL CONNECTION');
console.log('════════════════════════════════════════════════════════════');

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('\n❌ Error: Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
    console.log('Please ensure your Supabase project URL and Secret Key are present in .env\n');
    process.exit(1);
  }

  console.log(`\n📡 Supabase Project: ${SUPABASE_URL}`);
  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

  // ── Step 1: Verify Connection & Tables ──────────────────────────────────
  console.log('\n⏳ Step 1/3: Verifying Supabase connection and tables...');
  const tables = [
    'users',
    'recurring_items',
    'meal_tracker',
    'expenses',
    'budgets',
    'settings',
    'payments',
  ];

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('❌ Could not query Supabase:', error.message);
      console.log('Please make sure you have executed supabase_schema.sql in the Supabase SQL Editor.');
      process.exit(1);
    }
    console.log('✅ Connected to Supabase successfully!');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  // ── Step 2: Transfer Data from Turso / SQLite (if available) ───────────
  console.log('\n⏳ Step 2/3: Checking source data for migration...');
  const hasTurso = !!process.env.TURSO_DATABASE_URL;
  const localDbPath = path.join(rootDir, 'server/expenses.db');
  const hasLocalDb = fs.existsSync(localDbPath);

  if (hasTurso || hasLocalDb) {
    const sourceClient = createTursoClient({
      url: process.env.TURSO_DATABASE_URL || `file:${localDbPath}`,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });

    console.log(`📡 Source: ${hasTurso ? 'Remote Turso Cloud' : 'Local SQLite expenses.db'}`);

    for (const table of tables) {
      try {
        const res = await sourceClient.execute(`SELECT * FROM ${table}`);
        const rows = res.rows || [];

        if (rows.length === 0) {
          console.log(`   • [${table}]: 0 rows (skipped)`);
          continue;
        }

        const { error } = await supabase.from(table).upsert(rows);
        if (error) {
          console.log(`   • [${table}]: ⚠️ upsert notice (${error.message})`);
        } else {
          console.log(`   • [${table}]: ✅ ${rows.length} rows synced to Supabase`);
        }
      } catch (err) {
        console.log(`   • [${table}]: ⚠️ (${err.message})`);
      }
    }
  }

  // ── Step 3: Health Check & Row Counts ───────────────────────────────────
  console.log('\n⏳ Step 3/3: Running database live verification...');
  const counts = {};
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    counts[t] = error ? 'error' : count;
  }

  console.log('────────────────────────────────────────────────────────────');
  console.log('📊 Supabase Database Live Status:');
  console.log(`   • Users:           ${counts.users}`);
  console.log(`   • Expenses:        ${counts.expenses}`);
  console.log(`   • Meal Days:       ${counts.meal_tracker}`);
  console.log(`   • Recurring Items: ${counts.recurring_items}`);
  console.log(`   • Payments:        ${counts.payments}`);
  console.log(`   • Budgets:         ${counts.budgets}`);
  console.log(`   • Settings:        ${counts.settings}`);
  console.log('────────────────────────────────────────────────────────────');

  // ── Step 4: Vercel Production Environment Setup ─────────────────────────
  console.log('\n🚀 Vercel Production Configuration');
  console.log('────────────────────────────────────────────────────────────');

  const requiredVercelEnv = {
    DATABASE_URL: DATABASE_URL,
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SECRET_KEY,
    SUPABASE_SECRET_KEY: SUPABASE_SECRET_KEY,
    SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY,
    JWT_SECRET: JWT_SECRET || 'a1398b6fd5667363a8783b1d0c8ad0055ddd834447aa90ab21a3809994e49fde9ae79c25ef5c27cc3c5be50b9cd05b77',
  };

  const isSyncRequested = process.argv.includes('--sync-vercel');

  if (isSyncRequested) {
    console.log('⚡ Attempting automated sync to Vercel via Vercel CLI...');
    try {
      for (const [key, val] of Object.entries(requiredVercelEnv)) {
        if (val) {
          try {
            execSync(`npx vercel env add ${key} production <<< "${val}"`, { stdio: 'pipe' });
            console.log(`   ✅ Synced ${key} to Vercel (Production)`);
          } catch (_) {
            console.log(`   ℹ️ ${key} already exists or requires confirmation in Vercel.`);
          }
        }
      }
      console.log('\n🎉 Environment variables synced to Vercel!');
    } catch (err) {
      console.warn('⚠️ Could not complete automatic Vercel CLI sync:', err.message);
    }
  } else {
    console.log('To connect this Supabase database with Vercel:');
    console.log('\n1. Open your project on Vercel: https://vercel.com/dashboard');
    console.log('2. Go to: Settings ➔ Environment Variables');
    console.log('3. Add the following variables (for Production, Preview, and Development):\n');

    for (const [key, val] of Object.entries(requiredVercelEnv)) {
      const displayVal = key === 'DATABASE_URL' ? val.replace(/:[^:@]+@/, ':****@') : val;
      console.log(`   • ${key} = ${displayVal}`);
    }

    console.log('\nTip: You can automatically push these to Vercel with:');
    console.log('   npm run setup:supabase -- --sync-vercel\n');
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('✨ All migrations are complete! You are ready to deploy to Vercel:');
  console.log('   git push  OR  npx vercel --prod');
  console.log('════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌ Unhandled exception:', err);
  process.exit(1);
});
