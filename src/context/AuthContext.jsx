/**
 * AuthContext — centralized JWT authentication state for the React app.
 * Stores token in localStorage. Provides login/logout/register/updateProfile.
 * Clears all state on logout to prevent cross-user data leakage.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AUTH_TOKEN_KEY = 'drachma_auth_token';
const AUTH_USER_KEY = 'drachma_auth_user';
const API_BASE = '/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Persist token and user
  const persistAuth = useCallback((newToken, newUser) => {
    if (newToken && newUser) {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  // On mount, verify token is still valid by calling /auth/me
  useEffect(() => {
    let cancelled = false;

    async function verifyToken() {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            setToken(storedToken);
            setUser(json.data);
          }
        } else {
          // Token expired or invalid
          if (!cancelled) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        // Network error — keep cached user for offline resilience
        if (!cancelled) {
          const cached = localStorage.getItem(AUTH_USER_KEY);
          if (!cached) {
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    verifyToken();
    return () => { cancelled = true; };
  }, []);

  /**
   * Register a new account.
   * Returns { success, error }.
   */
  const register = useCallback(async ({ name, email, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Registration failed' };
      }
      persistAuth(json.data.token, json.data.user);
      console.log('[Auth] Registered and logged in');
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [persistAuth]);

  /**
   * Login with email + password.
   * Returns { success, error }.
   */
  const login = useCallback(async ({ email, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Login failed' };
      }
      persistAuth(json.data.token, json.data.user);
      console.log('[Auth] Logged in');
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [persistAuth]);

  /**
   * Logout: clear auth state and all cached app data.
   */
  const logout = useCallback(() => {
    persistAuth(null, null);
    // Clear any offline cache to prevent cross-user leakage
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('drachma_')) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
    console.log('[Auth] Logged out');
  }, [persistAuth]);

  /**
   * Update user profile (name/email/password).
   * Returns { success, error, data }.
   */
  const updateProfile = useCallback(async (updates) => {
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Update failed' };
      }
      // Update local user state
      const updatedUser = json.data;
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true, data: updatedUser };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [token]);

  /**
   * Return auth headers for API calls.
   */
  const getAuthHeaders = useCallback((extra = {}) => {
    const headers = { ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
      updateProfile,
      getAuthHeaders,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
