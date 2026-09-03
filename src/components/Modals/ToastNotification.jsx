import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastNotification = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let bg = 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700';
        let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;

        if (toast.type === 'success') {
          bg = 'bg-white dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 border-emerald-500/30 shadow-emerald-500/10';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
        } else if (toast.type === 'error') {
          bg = 'bg-white dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 border-red-500/30 shadow-red-500/10';
          icon = <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />;
        } else if (toast.type === 'info') {
          bg = 'bg-white dark:bg-neutral-850 text-neutral-900 dark:text-neutral-100 border-blue-500/30 shadow-blue-500/10';
          icon = <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-fade-in-scale ${bg}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {icon}
              <p className="text-sm font-medium leading-tight truncate">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
