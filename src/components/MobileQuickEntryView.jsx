import React, { useState } from 'react';
import { 
  formatDateDisplay, 
  getDayOfWeekName, 
  getTodayDateStr 
} from '../utils/dateHelpers';
import { formatCurrency } from '../constants/currencies';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { 
  Check, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Utensils, 
  ShoppingBag, 
  LayoutDashboard,
  Moon,
  Sun
} from 'lucide-react';

const QUICK_PRESETS = [
  { label: 'Tea / Coffee', category: 'food', amount: '20' },
  { label: 'Snacks', category: 'food', amount: '40' },
  { label: 'Auto / Bus', category: 'transport', amount: '50' },
  { label: 'Groceries', category: 'groceries', amount: '150' },
];

export const MobileQuickEntryView = ({
  selectedDate,
  onSelectDate,
  dailyStats,
  recurringItems = [],
  currency = 'INR',
  onToggleMeal,
  onAddExpense,
  onDeleteExpense,
  onSwitchToDashboard,
  theme,
  onToggleTheme,
}) => {
  const isToday = selectedDate === getTodayDateStr();

  // Quick Inline Expense Form State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');

  const {
    dailyMealTotal = 0,
    dailyMiscTotal = 0,
    dailyOverallTotal = 0,
    markedItems = [],
    expenses = [],
  } = dailyStats || {};

  const markedItemIds = new Set(markedItems.map(m => m.id));

  const activeRecurringItems = recurringItems.filter(item => {
    if (item.isActive === false) return false;
    if (item.endDate && selectedDate > item.endDate) return false;
    return true;
  });

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onSelectDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onSelectDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    onSelectDate(getTodayDateStr());
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!desc.trim() || isNaN(numAmount) || numAmount <= 0) return;

    onAddExpense({
      date: selectedDate,
      description: desc.trim(),
      category: category,
      unitPrice: numAmount,
      quantity: 1,
      totalAmount: numAmount,
    });

    setDesc('');
    setAmount('');
  };

  const applyPreset = (preset) => {
    setDesc(preset.label);
    setCategory(preset.category);
    setAmount(preset.amount);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] dark:bg-[#0F1012] text-neutral-900 dark:text-neutral-100 flex flex-col max-w-lg mx-auto pb-8">
      
      {/* 1. Mobile App Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            ₹
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Quick Expense Entry</h1>
            <p className="text-[10px] text-neutral-500 font-medium">PWA Mobile Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Switch to Detailed Dashboard */}
          <button
            onClick={onSwitchToDashboard}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
            title="Switch to full dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Full View</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 2. Date Navigation Bar */}
      <div className="px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
        <button
          onClick={handlePrevDay}
          className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95"
          aria-label="Previous Day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {formatDateDisplay(selectedDate, 'short')}
            </span>
            {isToday && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
                Today
              </span>
            )}
          </div>
          <span className="text-[11px] text-neutral-500">
            {getDayOfWeekName(selectedDate)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!isToday && (
            <button
              onClick={handleToday}
              className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
              title="Jump to Today"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95"
            aria-label="Next Day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. Daily Live Summary Banner */}
      <div className="p-4">
        <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-4 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold opacity-75 uppercase tracking-wider">
              {isToday ? "Today's Spending" : 'Daily Total'}
            </span>
            <div className="text-2xl font-black tracking-tight mt-0.5">
              {formatCurrency(dailyOverallTotal, currency)}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              Meals {formatCurrency(dailyMealTotal, currency)} • Misc {formatCurrency(dailyMiscTotal, currency)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/10 dark:bg-neutral-900/10 flex items-center justify-center text-xl">
            💳
          </div>
        </div>
      </div>

      {/* 4. One-Tap Meals Checklist */}
      <div className="px-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mark Daily Meals</span>
          </div>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(dailyMealTotal, currency)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {activeRecurringItems.map((item) => {
            const isMarked = markedItemIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleMeal(selectedDate, item.id)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all active:scale-[0.98] ${
                  isMarked
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-2xs'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                      isMarked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                    }`}
                  >
                    {isMarked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-lg">{item.icon || '🍽️'}</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {item.name}
                  </span>
                </div>

                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {formatCurrency(item.pricePerOccurrence, currency)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Quick Expense Entry Form */}
      <div className="p-4 mt-2">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              <span>Quick Expense Entry</span>
            </div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {formatCurrency(dailyMiscTotal, currency)}
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                {preset.label} (₹{preset.amount})
              </button>
            ))}
          </div>

          {/* Inline Form */}
          <form onSubmit={handleQuickAdd} className="space-y-2.5 pt-1">
            <div className="grid grid-cols-5 gap-2">
              <input
                type="text"
                placeholder="Item (e.g. Coffee, Bus)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="col-span-3 p-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <div className="col-span-2 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-bold">₹</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-6 pr-2.5 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 p-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 6. Today's Expenses List */}
      {expenses.length > 0 && (
        <div className="px-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Recorded for this day ({expenses.length})
          </h3>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden shadow-2xs">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-neutral-900 dark:text-white block truncate">
                    {exp.description}
                  </span>
                  <span className="text-[10px] text-neutral-400 capitalize">
                    {exp.category}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(exp.totalAmount, currency)}
                  </span>
                  <button
                    onClick={() => onDeleteExpense(exp.id)}
                    className="p-1 text-neutral-400 hover:text-red-600 rounded"
                    aria-label="Delete expense"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
