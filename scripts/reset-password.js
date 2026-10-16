/**
 * Password Reset Utility for Drachma
 *
 * Sets a new password for any registered user directly in Supabase or local SQLite.
 *
 * Usage:
 *   node scripts/reset-password.js <email> <new_password>
 *
 * Example:
 *   node scripts/reset-password.js salmanul.farisy@drachma.com MyNewPassword123
 */

import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../.env') });
loadEnv();

const args = process.argv.slice(2);
const email = (args[0] || '').trim().toLowerCase();
const newPassword = args[1] || '';

if (!email || !newPassword) {
  console.log('Usage:');
  console.log('  node scripts/reset-password.js <email> <new_password>');
  console.log('Example:');
  console.log('  node scripts/reset-password.js salmanul.farisy@drachma.com NewPass123!');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error('❌ Password must be at least 8 characters long.');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

async function main() {
  console.log(`🔍 Looking for user with email: ${email}`);

  const { data: users, error: findError } = await supabase
    .from('users')
    .select('id, name, email')
    .ilike('email', email);

  if (findError) {
    console.error('❌ Database query failed:', findError.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.error(`❌ No user found with email: ${email}`);
    process.exit(1);
  }

  const user = users[0];
  console.log(`👤 Found user: ${user.name} (${user.id})`);

  console.log('🔐 Hashing new password...');
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('users')
    .update({
      password_hash: passwordHash,
      updated_at: now,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Failed to update password:', updateError.message);
    process.exit(1);
  }

  console.log('────────────────────────────────────────────────────────');
  console.log(`✅ Success! Password for ${user.email} has been updated.`);
  console.log(`You can now log in at your production URL with your new password.`);
  console.log('────────────────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
