import React, { useMemo } from 'react';
import { getCalendarGrid } from '../utils/dateHelpers';
import { formatCurrency } from '../constants/currencies';
import { Plus, Check, ShoppingBag } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const Calendar = ({
  selectedMonth,
  selectedDate,
  onSelectDate,
  dailyStatsMap = {},
  recurringItems = [],
  currency = 'INR',
  onOpenAddExpenseForDate,
}) => {
  const gridCells = useMemo(() => {
    return getCalendarGrid(selectedMonth);
  }, [selectedMonth]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden flex flex-col w-full shadow-2xs">
      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-850/80">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`py-2.5 sm:py-3 text-center text-xs font-semibold tracking-wider uppercase ${
              idx === 0 || idx === 6
                ? 'text-neutral-400 dark:text-neutral-500'
                : 'text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-px bg-neutral-200/70 dark:bg-neutral-800 flex-1">
        {gridCells.map((cell) => {
          const stats = dailyStatsMap[cell.dateStr] || {
            dailyMealTotal: 0,
            dailyMiscTotal: 0,
            dailyOverallTotal: 0,
            markedItems: [],
            expenses: [],
            mealCount: 0,
            expenseCount: 0,
          };

          const isSelected = selectedDate === cell.dateStr;
          const hasMeals = stats.mealCount > 0;
          const hasExpenses = stats.expenseCount > 0;
          const hasActivity = hasMeals || hasExpenses;

          let cellBgClass = 'bg-white dark:bg-neutral-900';
          if (!cell.isCurrentMonth) {
            cellBgClass = 'bg-neutral-50/50 dark:bg-neutral-950/40 text-neutral-400 dark:text-neutral-600';
          } else if (isSelected) {
            cellBgClass = 'bg-blue-50/50 dark:bg-blue-950/20';
          }

          let borderState = '';
          if (isSelected) {
            borderState = 'ring-1.5 ring-blue-500 z-10';
          }

          const mealCountLabel = stats.mealCount === 1 ? '1 meal' : `${stats.mealCount} meals`;

          return (
            <div
              key={cell.dateStr}
              tabIndex={0}
              role="button"
              aria-label={`Select date ${cell.dateStr}`}
              onClick={() => onSelectDate(cell.dateStr)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDate(cell.dateStr);
                }
              }}
              className={`min-h-[96px] sm:min-h-[110px] xl:min-h-[120px] 2xl:min-h-[130px] p-2 sm:p-2.5 cursor-pointer transition-colors duration-100 flex flex-col justify-between group relative select-none ${cellBgClass} ${borderState} hover:bg-neutral-50 dark:hover:bg-neutral-850 focus-visible:ring-1 focus-visible:ring-blue-500 focus:outline-none`}
            >
              {/* Header Row: Date Number on Left, Daily Total on Right */}
              <div className="flex items-center justify-between gap-1 leading-none">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      cell.isToday
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                        : isSelected
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : cell.isCurrentMonth
                        ? 'text-neutral-800 dark:text-neutral-200'
                        : 'text-neutral-400 dark:text-neutral-600'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.isToday && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-1.5 py-0.2 rounded">
                      TODAY
                    </span>
                  )}
                </div>

                {/* Daily Total Amount (Upper Right) */}
                {hasActivity ? (
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100/80 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                    {formatCurrency(stats.dailyOverallTotal, currency)}
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddExpenseForDate(cell.dateStr);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-medium text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-0.5"
                    title="Add expense"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {/* Middle Section: Marked Meal Tags & Misc Expenses */}
              <div className="my-1.5 flex flex-col gap-1 min-w-0">
                
                {/* 1. Marked Meals Tags (Paid vs Unpaid badges) */}
                {hasMeals ? (
                  <div className="flex flex-wrap gap-1 items-center">
                    {stats.markedItems.map((item) => (
                      <span
                        key={item.id}
                        title={`${item.name} (${formatCurrency(item.price, currency)}) - ${item.isPaid ? 'Paid' : 'Unpaid'}`}
                        className={`inline-flex items-center gap-1 h-[23px] px-1.5 rounded-md text-[11px] font-medium truncate max-w-full ${
                          item.isPaid
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/70'
                        }`}
                      >
                        <span className="text-xs shrink-0">{item.icon || '🍽️'}</span>
                        <span className="truncate">{item.name}</span>
                        {item.isPaid ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Paid" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unpaid" />
                        )}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* 2. Misc Expenses Tag (Subtle Amber) */}
                {hasExpenses ? (
                  <div className="flex items-center gap-1 h-[23px] px-2 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 truncate">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate">
                      {stats.expenseCount === 1 ? '1 misc' : `${stats.expenseCount} misc`} · {formatCurrency(stats.dailyMiscTotal, currency)}
                    </span>
                  </div>
                ) : null}

              </div>

              {/* Bottom Footer Row */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pt-0.5">
                <span className="truncate">
                  {hasMeals ? mealCountLabel : ''}
                </span>

                {hasActivity && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddExpenseForDate(cell.dateStr);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5"
                    title="Add expense for this date"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
