/**
 * Authentication helpers: JWT generation/verification, bcrypt hashing.
 * Never logs passwords or hashes.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../.env') });
loadEnv(); // also load process.cwd() fallback

const SALT_ROUNDS = 12;

let ephemeralDevSecret = null;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is missing or too short (min 16 chars required) in production mode. Set JWT_SECRET in your environment.'
    );
  }

  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
    console.warn(
      '[Security Warning] JWT_SECRET is not defined in .env. Generated an ephemeral secret for this session.'
    );
  }
  return ephemeralDevSecret;
}

/**
 * Hash a plaintext password securely.
 */
export async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a stored hash.
 */
export async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Sign a JWT for the given user payload.
 * Token expires in 30 days by default.
 */
export function signToken(payload, expiresIn = '30d') {
  return jwt.sign(payload, getJwtSecret(), { expiresIn, algorithm: 'HS256' });
}

/**
 * Verify and decode a JWT.
 * Returns the decoded payload or null if invalid/expired.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

/**
 * Extract and validate JWT from request Authorization header.
 * Returns decoded user payload or null.
 */
export function extractUserFromRequest(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  return verifyToken(token);
}
