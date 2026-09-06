import React, { useState } from 'react';
import { formatCurrency } from '../constants/currencies';
import { X, Target, DollarSign, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export const BudgetingModal = ({
  isOpen,
  selectedMonth,
  monthlyStats,
  budgets = [],
  currency = 'INR',
  onSaveBudget,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentBudgetObj = budgets.find(
    (b) => b.month === selectedMonth && b.category === 'overall'
  );
  const initialAmount = currentBudgetObj ? String(currentBudgetObj.amount) : '';

  const [budgetAmount, setBudgetAmount] = useState(initialAmount);

  const { monthlyOverallTotal = 0, budgetStats = {} } = monthlyStats || {};
  const { status, remainingBudget, safeDailyLimit, budgetPercentage } = budgetStats;

  const handleSave = (e) => {
    e.preventDefault();
    const numericVal = parseFloat(budgetAmount);
    if (!isNaN(numericVal) && numericVal >= 0) {
      onSaveBudget({
        month: selectedMonth,
        category: 'overall',
        amount: numericVal,
      });
      onClose();
    }
  };

  const PRESETS = [5000, 10000, 15000, 25000, 50000];

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
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold">Monthly Budget Goal — {selectedMonth}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          
          {/* Target Amount Input */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
              Monthly Budget Target Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold">
                {formatCurrency(0, currency).replace(/[\d.,\s]/g, '') || '₹'}
              </span>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 15000"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-medium text-neutral-400 block mb-1.5">Quick Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBudgetAmount(String(preset))}
                  className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium transition-colors"
                >
                  {formatCurrency(preset, currency)}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Adherence & Safe Daily Pacing Preview */}
          {parseFloat(budgetAmount) > 0 && (
            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Spent So Far:</span>
                <span className="font-semibold">{formatCurrency(monthlyOverallTotal, currency)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Remaining Budget:</span>
                <span className={`font-semibold ${remainingBudget > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(remainingBudget, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 pt-2">
                <span className="text-neutral-500 font-medium">Safe Daily Spending Limit:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  {formatCurrency(safeDailyLimit, currency)} / day
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200/80 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            >
              Save Goal
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
