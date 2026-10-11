/**
 * Database Migration & Schema Sync Script
 * 
 * Runs all database schema updates, multi-user isolation columns,
 * composite index migrations, and data ownership assignment.
 * 
 * Works with:
 * - Supabase PostgreSQL (`DATABASE_URL="postgres://..."` or `SUPABASE_DB_URL`)
 * - Local SQLite fallback (`server/expenses.db`)
 * 
 * Usage:
 *   node scripts/migrate.js
 */

import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, db, runDatabaseMaintenance, isPostgres } from '../server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../.env') });
loadEnv();

async function runMigration() {
  console.log('────────────────────────────────────────────────────────');
  console.log('🚀 Drachma Database Migration & Verification');
  console.log('────────────────────────────────────────────────────────');

  const targetName = isPostgres ? 'Supabase PostgreSQL' : 'Local SQLite Fallback';
  const connString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL ||
    'Local expenses.db';

  console.log(`📡 Database Target: ${targetName}`);
  console.log(`🔗 Endpoint:        ${connString.replace(/:[^:@]+@/, ':****@')}`);
  console.log('────────────────────────────────────────────────────────');

  try {
    console.log('⏳ Running schema migration and table setup...');
    await initDatabase();

    console.log('✅ Schema migration executed successfully.');
    console.log('⏳ Running database integrity verification...');

    const maintenance = await runDatabaseMaintenance();

    console.log('────────────────────────────────────────────────────────');
    console.log('📊 Migration Summary & Database Health:');
    console.log(`   • Engine:          ${maintenance.engine}`);
    console.log(`   • Integrity Check: ${maintenance.integrityCheck}`);
    console.log(`   • Users:           ${maintenance.recordsCount.users ?? 0}`);
    console.log(`   • Expenses:        ${maintenance.recordsCount.expenses ?? 0}`);
    console.log(`   • Meal Days:       ${maintenance.recordsCount.mealTrackerDays ?? 0}`);
    console.log(`   • Payments:        ${maintenance.recordsCount.payments ?? 0}`);
    console.log(`   • Budgets:         ${maintenance.recordsCount.budgets ?? 0}`);
    console.log(`   • Recurring Items: ${maintenance.recordsCount.recurringItems ?? 0}`);
    console.log('────────────────────────────────────────────────────────');
    console.log('🔐 Authentication & Access:');
    console.log('   • User registration enabled');
    console.log('   • Optional Admin: Configure ADMIN_EMAIL & ADMIN_PASSWORD in .env');
    console.log('────────────────────────────────────────────────────────');
    console.log('✨ All migrations and data mappings are complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed with error:');
    console.error(err);
    process.exit(1);
  }
}

runMigration();
