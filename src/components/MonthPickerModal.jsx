import React, { useState, useEffect } from 'react';
import { parseMonthKey, getCurrentMonthKey } from '../utils/dateHelpers';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthPickerModal = ({
  isOpen,
  currentSelectedMonth,
  onSelectMonth,
  onClose,
}) => {
  const { year: currentYear, monthIndex: currentMonthIdx } = parseMonthKey(currentSelectedMonth);
  const [targetYear, setTargetYear] = useState(currentYear);

  useEffect(() => {
    if (isOpen) {
      setTargetYear(currentYear);
    }
  }, [isOpen, currentYear]);

  if (!isOpen) return null;

  const todayMonthKey = getCurrentMonthKey();
  const { year: todayYear, monthIndex: todayMonthIdx } = parseMonthKey(todayMonthKey);

  const handlePick = (monthIdx) => {
    const mStr = String(monthIdx + 1).padStart(2, '0');
    onSelectMonth(`${targetYear}-${mStr}`);
    onClose();
  };

  const handleCurrentMonth = () => {
    onSelectMonth(todayMonthKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in-scale">
      <div 
        role="dialog" 
        aria-modal="true" 
        className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-xs w-full p-4 text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <h3 className="font-semibold text-xs text-neutral-900 dark:text-white">Choose Month</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Year Selector */}
        <div className="flex items-center justify-between my-3 px-1">
          <button
            onClick={() => setTargetYear(prev => prev - 1)}
            className="p-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-bold">
            {targetYear}
          </span>
          <button
            onClick={() => setTargetYear(prev => prev + 1)}
            className="p-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 12-Month Grid */}
        <div className="grid grid-cols-3 gap-1.5 my-1">
          {MONTH_NAMES.map((name, idx) => {
            const isSelected = targetYear === currentYear && idx === currentMonthIdx;
            const isTodayMonth = targetYear === todayYear && idx === todayMonthIdx;

            return (
              <button
                key={name}
                onClick={() => handlePick(idx)}
                className={`py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : isTodayMonth
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <button
            onClick={handleCurrentMonth}
            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Current Month
          </button>
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs text-neutral-500 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
