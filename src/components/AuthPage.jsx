/**
 * AuthPage — Login and Registration page.
 * Matches the app's existing visual language (neutral/slate palette, rounded-xl, shadow).
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export function AuthPage({ onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setApiError('');
  };

  function validate() {
    const errs = {};
    if (mode === 'register' && !form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (mode === 'register' && form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      let result;
      if (mode === 'login') {
        result = await login({ email: form.email.trim().toLowerCase(), password: form.password });
      } else {
        result = await register({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password });
      }

      if (result.success) {
        onSuccess?.();
      } else {
        setApiError(result.error || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setErrors({});
    setApiError('');
    setForm({ name: '', email: '', password: '', confirmPassword: '' });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB] dark:bg-[#0F1012] px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-base shadow-sm">
            ₹
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
              Expense Tracker
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Monthly Meal &amp; Daily Finance
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl p-6">

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-6">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === m
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* API error */}
            {apiError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            {/* Name (register only) */}
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={update('name')}
                  placeholder="Your name"
                  aria-invalid={!!errors.name}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.name ? 'border-red-400 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400`}
                />
                {errors.name && <p className="text-red-500 text-[11px] mt-1">{errors.name}</p>}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  errors.email ? 'border-red-400 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-700'
                } bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400`}
              />
              {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                  aria-invalid={!!errors.password}
                  className={`w-full px-3 py-2 pr-9 text-sm rounded-lg border ${
                    errors.password ? 'border-red-400 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-[11px] mt-1">{errors.password}</p>}
            </div>

            {/* Confirm password (register) */}
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Confirm Password
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  placeholder="Repeat password"
                  aria-invalid={!!errors.confirmPassword}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    errors.confirmPassword ? 'border-red-400 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-700'
                  } bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400`}
                />
                {errors.confirmPassword && <p className="text-red-500 text-[11px] mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
