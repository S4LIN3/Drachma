/**
 * Authentication helpers: JWT generation/verification, bcrypt hashing.
 * Never logs passwords or hashes.
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../.env') });
loadEnv(); // also load process.cwd() fallback

const SALT_ROUNDS = 12;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || 'drachma-secret-fallback-jwt-key-2026-secure-32chars!';
  return secret;
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
