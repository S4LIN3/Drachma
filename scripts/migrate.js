/**
 * Database Migration & Schema Sync Script
 * 
 * Runs all database schema updates, multi-user isolation columns,
 * composite index migrations, and data ownership assignment.
 * 
 * Works with:
 * - Local SQLite database (`server/expenses.db`)
 * - Remote Turso / libSQL Database (`libsql://...`)
 * 
 * Usage:
 *   node scripts/migrate.js
 *   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/migrate.js
 */

import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, db, runDatabaseMaintenance, DEFAULT_USER_ID } from '../server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../.env') });
loadEnv();

async function runMigration() {
  console.log('────────────────────────────────────────────────────────');
  console.log('🚀 Drachma Database Migration & Verification');
  console.log('────────────────────────────────────────────────────────');

  const dbUrl = process.env.TURSO_DATABASE_URL || 'Local SQLite';
  const isRemote = !!process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.startsWith('libsql://');

  console.log(`📡 Database Target: ${isRemote ? 'Remote Turso Cloud' : 'Local SQLite'}`);
  console.log(`🔗 URL: ${dbUrl.startsWith('libsql://') ? dbUrl.split('@')[0] : dbUrl}`);
  console.log('────────────────────────────────────────────────────────');

  try {
    console.log('⏳ Running schema migration and table setup...');
    await initDatabase();

    console.log('✅ Schema migration executed successfully.');
    console.log('⏳ Running database integrity verification...');

    const maintenance = await runDatabaseMaintenance();

    console.log('────────────────────────────────────────────────────────');
    console.log('📊 Migration Summary & Database Health:');
    console.log(`   • Integrity Check: ${maintenance.integrityCheck}`);
    console.log(`   • Users:           ${maintenance.recordsCount.users ?? 0}`);
    console.log(`   • Expenses:        ${maintenance.recordsCount.expenses ?? 0}`);
    console.log(`   • Meal Days:       ${maintenance.recordsCount.mealTrackerDays ?? 0}`);
    console.log(`   • Payments:        ${maintenance.recordsCount.payments ?? 0}`);
    console.log(`   • Budgets:         ${maintenance.recordsCount.budgets ?? 0}`);
    console.log(`   • Recurring Items: ${maintenance.recordsCount.recurringItems ?? 0}`);
    console.log('────────────────────────────────────────────────────────');
    console.log('🔑 Default Migrated User Account:');
    console.log('   • Email:    admin@drachma.local');
    console.log('   • Password: ChangeMe2026!');
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
