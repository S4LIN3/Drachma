/**
 * Data Migration Tool: Turso / SQLite -> Supabase PostgreSQL
 * 
 * Transfers all tables and rows from an existing Turso or local SQLite database
 * into your Supabase database.
 * 
 * Usage:
 *   node scripts/migrate-turso-to-supabase.js
 * 
 * Prerequisites:
 *   - .env with DATABASE_URL (Supabase Connection Pooler or Direct connection)
 *   - Optional: TURSO_DATABASE_URL + TURSO_AUTH_TOKEN if copying from remote Turso
 *               (If omitted, reads from local server/expenses.db)
 */

import { createClient as createLibsqlClient } from '@libsql/client';
import pg from 'pg';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../.env') });
loadEnv();

const { Pool } = pg;

const targetDbUrl =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL;

if (!targetDbUrl) {
  console.error('❌ Error: DATABASE_URL or SUPABASE_DB_URL is missing in .env.');
  console.error('Please configure your Supabase PostgreSQL connection string in .env first.');
  process.exit(1);
}

const localDbPath = path.join(__dirname, '../server/expenses.db');
const sourceClient = createLibsqlClient({
  url: process.env.TURSO_DATABASE_URL || `file:${localDbPath}`,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

const targetPool = new Pool({
  connectionString: targetDbUrl,
  ssl: targetDbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

const TABLES = [
  'users',
  'recurring_items',
  'meal_tracker',
  'expenses',
  'budgets',
  'settings',
  'payments',
];

async function migrateData() {
  console.log('────────────────────────────────────────────────────────');
  console.log('📦 Transferring Data: Turso/SQLite ➔ Supabase PostgreSQL');
  console.log('────────────────────────────────────────────────────────');
  console.log(`Source: ${process.env.TURSO_DATABASE_URL || 'Local server/expenses.db'}`);
  console.log(`Target: ${targetDbUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log('────────────────────────────────────────────────────────');

  const client = await targetPool.connect();

  try {
    for (const table of TABLES) {
      process.stdout.write(`⏳ Migrating [${table}]... `);

      let sourceRows = [];
      try {
        const res = await sourceClient.execute(`SELECT * FROM ${table}`);
        sourceRows = res.rows || [];
      } catch (err) {
        console.log(`⚠️ skipped (table not found in source: ${err.message})`);
        continue;
      }

      if (sourceRows.length === 0) {
        console.log(`0 rows (empty)`);
        continue;
      }

      let insertedCount = 0;
      for (const row of sourceRows) {
        const columns = Object.keys(row);
        const values = Object.values(row);

        const colNames = columns.join(', ');
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `
          INSERT INTO ${table} (${colNames})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        try {
          await client.query(sql, values);
          insertedCount++;
        } catch (err) {
          // Continue with next row
        }
      }

      console.log(`✅ ${insertedCount}/${sourceRows.length} rows transferred`);
    }

    console.log('────────────────────────────────────────────────────────');
    console.log('🎉 Data migration to Supabase completed successfully!');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
  } finally {
    client.release();
    await targetPool.end();
  }
}

migrateData();
