/**
 * UserProfileModal — lets the authenticated user view and update their profile.
 * Matches the app's existing modal design (same border, shadow, typography).
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Mail, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function UserProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, logout } = useAuth();

  const [tab, setTab] = useState('profile'); // 'profile' | 'password'
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const update = (setter) => (field) => (e) => {
    setter((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
    setSuccess('');
  };

  async function handleProfileSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await updateProfile({ name: form.name.trim(), email: form.email.trim().toLowerCase() });
      if (result.success) {
        setSuccess('Profile updated successfully');
      } else {
        setError(result.error || 'Update failed');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (!pwdForm.currentPassword) { setError('Current password required'); return; }
    if (pwdForm.newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { setError('Passwords do not match'); return; }

    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await updateProfile({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      if (result.success) {
        setSuccess('Password changed successfully');
        setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(result.error || 'Password change failed');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in-scale">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-md w-full flex flex-col text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-850/50">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-semibold">My Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User badge */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{user?.name}</p>
            <p className="text-xs text-neutral-500">{user?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5">
          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            {['profile', 'password'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700'
                }`}
              >
                {t === 'profile' ? 'Profile' : 'Password'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {tab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={update(setForm)('name')}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={update(setForm)('email')}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Saving...</span></> : 'Save Changes'}
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handlePasswordSave} className="space-y-3">
              {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
                <div key={field}>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                    {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                    <input
                      type="password"
                      value={pwdForm[field]}
                      onChange={update(setPwdForm)(field)}
                      placeholder={field === 'newPassword' ? 'At least 8 characters' : ''}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </div>
              ))}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Updating...</span></> : 'Change Password'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-850/50">
          <button
            onClick={() => { logout(); onClose(); }}
            className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
          >
            Sign Out
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
