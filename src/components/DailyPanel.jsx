import React, { useState, useEffect } from 'react';
import { 
  formatDateDisplay, 
  getDayOfWeekName, 
  getTodayDateStr 
} from '../utils/dateHelpers';
import { formatCurrency } from '../constants/currencies';
import { getCategoryMeta } from '../constants/categories';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  FileText
} from 'lucide-react';

export const DailyPanel = ({
  selectedDate,
  dailyStats,
  recurringItems = [],
  currency = 'INR',
  onToggleMeal,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
  onSaveNotes,
  onClose,
  isModal = false,
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState(dailyStats?.notes || '');

  useEffect(() => {
    setTempNotes(dailyStats?.notes || '');
    setIsEditingNotes(false);
  }, [selectedDate, dailyStats?.notes]);

  const activeRecurringItems = recurringItems.filter(item => {
    if (item.isActive === false) return false;
    if (item.endDate && selectedDate > item.endDate) return false;
    return true;
  });

  const {
    dailyMealTotal = 0,
    dailyMiscTotal = 0,
    dailyOverallTotal = 0,
    markedItems = [],
    expenses = [],
  } = dailyStats || {};

  const markedItemIds = new Set(markedItems.map(m => m.id));
  const isToday = selectedDate === getTodayDateStr();

  const handleNotesSubmit = (e) => {
    e.preventDefault();
    onSaveNotes(selectedDate, tempNotes);
    setIsEditingNotes(false);
  };

  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xs flex flex-col w-full ${isModal ? 'max-w-md max-h-[85vh]' : 'h-full max-h-[calc(100vh-140px)]'}`}>
      
      {/* 1. Header: Date & Day */}
      <div className="p-4 sm:p-5 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-850/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-none">
              {formatDateDisplay(selectedDate, 'short')}
            </h2>
            {isToday && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-1.5 py-0.5 rounded">
                TODAY
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
            {getDayOfWeekName(selectedDate)}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Scrollable Body */}
      <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 text-xs">
        
        {/* SECTION 1: TODAY'S MEALS */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Today's Meals
            </h3>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
              {formatCurrency(dailyMealTotal, currency)}
            </span>
          </div>

          {activeRecurringItems.length === 0 ? (
            <div className="py-4 text-center text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
              No meal templates configured.
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeRecurringItems.map((item) => {
                const markedDetail = markedItems.find(m => m.id === item.id);
                const isMarked = !!markedDetail;
                const isPaid = markedDetail?.isPaid;

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isMarked}
                    onClick={() => onToggleMeal(selectedDate, item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors select-none text-left ${
                      isMarked
                        ? isPaid
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                          : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 shadow-2xs'
                        : 'bg-white dark:bg-neutral-850/40 border-neutral-200/70 dark:border-neutral-800 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                          isMarked
                            ? isPaid
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-amber-500 border-amber-500 text-white'
                            : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800'
                        }`}
                      >
                        {isMarked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-sm shrink-0">{item.icon || '🍽️'}</span>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isMarked && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isPaid
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {isPaid ? '🟢 Paid' : '🟡 Unpaid'}
                        </span>
                      )}
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(item.pricePerOccurrence, currency)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* SECTION 2: DAILY EXPENSES */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Daily Expenses
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded">
                {formatCurrency(dailyMiscTotal, currency)}
              </span>
              <button
                onClick={() => onOpenAddExpense(selectedDate)}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="py-4 text-center border border-dashed border-neutral-200/90 dark:border-neutral-800 rounded-xl space-y-1">
              <p className="text-neutral-400 text-xs">No expenses yet</p>
              <button
                onClick={() => onOpenAddExpense(selectedDate)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add expense
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden">
              {expenses.map((exp) => {
                const categoryMeta = getCategoryMeta(exp.category);
                return (
                  <div
                    key={exp.id}
                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
                          {categoryMeta.label}
                        </span>
                        <span className="text-xs font-medium text-neutral-900 dark:text-white truncate">
                          · {exp.description}
                        </span>
                      </div>
                      {exp.quantity > 1 && (
                        <div className="text-[10px] text-neutral-400">
                          {exp.quantity} × {formatCurrency(exp.unitPrice, currency)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(exp.totalAmount, currency)}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                        <button
                          onClick={() => onEditExpense(exp)}
                          className="p-1 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* SECTION 3: DAY NOTES */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Day Notes
            </h3>
            {!isEditingNotes && dailyStats?.notes && (
              <button
                onClick={() => {
                  setTempNotes(dailyStats.notes);
                  setIsEditingNotes(true);
                }}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <form onSubmit={handleNotesSubmit} className="space-y-2">
              <textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="Add note for this date..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(false)}
                  className="px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          ) : dailyStats?.notes ? (
            <p className="text-xs italic text-neutral-600 dark:text-neutral-300 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
              "{dailyStats.notes}"
            </p>
          ) : (
            <button
              onClick={() => {
                setTempNotes('');
                setIsEditingNotes(true);
              }}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              + Add note for this date
            </button>
          )}
        </div>

      </div>

      {/* 3. Footer: Prominent Daily Total */}
      <div className="p-4 sm:p-5 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-850/60 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
          <span>Meals {formatCurrency(dailyMealTotal, currency)} + Misc {formatCurrency(dailyMiscTotal, currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            Daily Total
          </span>
          <span className="text-2xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(dailyOverallTotal, currency)}
          </span>
        </div>
      </div>

    </div>
  );
};
