import React, { useState } from 'react';
import { parseNaturalLanguageExpense } from '../utils/naturalLanguageParser';
import { formatCurrency } from '../constants/currencies';
import { getCategoryMeta } from '../constants/categories';
import { Sparkles, Plus, Check } from 'lucide-react';

export const SmartQuickInputBar = ({ onAddExpense, currency = 'INR', addToast }) => {
  const [inputText, setInputText] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    if (val.trim().length >= 2) {
      const parsed = parseNaturalLanguageExpense(val);
      setParsedPreview(parsed);
    } else {
      setParsedPreview(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!parsedPreview || parsedPreview.unitPrice <= 0) {
      if (addToast) addToast('Please enter an amount (e.g. "Coffee 80")', 'warning');
      return;
    }

    onAddExpense(parsedPreview);
    setInputText('');
    setParsedPreview(null);
  };

  const categoryMeta = parsedPreview ? getCategoryMeta(parsedPreview.category) : null;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/90 dark:border-neutral-800 p-3 shadow-xs space-y-2">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Quick entry (e.g., 'Coffee 80', 'Spent 350 on taxi yesterday')..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-neutral-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={!parsedPreview || parsedPreview.unitPrice <= 0}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </form>

      {/* Real-time Parsed Preview Chip */}
      {parsedPreview && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] bg-emerald-50/60 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-900/50 animate-fade-in-scale">
          <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Parsed:</span>
          </span>

          <span className="font-bold text-neutral-900 dark:text-white">
            {parsedPreview.description}
          </span>

          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(parsedPreview.unitPrice, currency)}
          </span>

          {categoryMeta && (
            <span className={`px-2 py-0.5 rounded-md font-medium border text-[10px] ${categoryMeta.bg}`}>
              {categoryMeta.label}
            </span>
          )}

          <span className="text-neutral-400">
            ({parsedPreview.date})
          </span>
        </div>
      )}
    </div>
  );
};
