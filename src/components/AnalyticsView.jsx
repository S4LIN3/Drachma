import React from 'react';
import { formatCurrency } from '../constants/currencies';
import { getCategoryMeta } from '../constants/categories';
import { formatDateDisplay } from '../utils/dateHelpers';
import { 
  BarChart3, 
  PieChart, 
  Utensils, 
  ShoppingBag, 
  TrendingUp, 
  Calendar,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

export const AnalyticsView = ({
  monthlyStats,
  currency = 'INR',
  onSelectDate,
  onExportExcel,
  onExportPDF,
}) => {
  const {
    monthlyOverallTotal = 0,
    monthlyMealTotal = 0,
    monthlyMiscTotal = 0,
    mealDaysCount = 0,
    daysInMonth = 30,
    categoryBreakdown = [],
    mealTypeTotals = {},
    dailyMap = {},
  } = monthlyStats || {};

  const dailyEntries = Object.entries(dailyMap).map(([dateStr, data]) => ({
    dateStr,
    dayNumber: parseInt(dateStr.split('-')[2], 10),
    mealTotal: data.dailyMealTotal,
    miscTotal: data.dailyMiscTotal,
    overallTotal: data.dailyOverallTotal,
  }));

  const maxDayExpense = Math.max(...dailyEntries.map(d => d.overallTotal), 1);
  const highestSpendDay = [...dailyEntries].sort((a, b) => b.overallTotal - a.overallTotal)[0];

  const mealRatio = monthlyOverallTotal > 0 ? (monthlyMealTotal / monthlyOverallTotal) * 100 : 0;
  const miscRatio = monthlyOverallTotal > 0 ? (monthlyMiscTotal / monthlyOverallTotal) * 100 : 0;

  return (
    <div className="space-y-5">
      
      {/* Top Header & Export Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
            Monthly Expense Analytics
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Breakdown of recurring meals vs discretionary expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
          )}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-red-600" />
              <span>PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Composition */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Expense Split
          </span>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                Meals ({Math.round(mealRatio)}%)
              </span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {formatCurrency(monthlyMealTotal, currency)}
              </span>
            </div>
            <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
              <div style={{ width: `${mealRatio}%` }} className="bg-emerald-500 h-full" />
              <div style={{ width: `${miscRatio}%` }} className="bg-amber-500 h-full" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                Miscellaneous ({Math.round(miscRatio)}%)
              </span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {formatCurrency(monthlyMiscTotal, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Peak Day */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Highest Spend Day
          </span>
          {highestSpendDay && highestSpendDay.overallTotal > 0 ? (
            <div>
              <div className="text-xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(highestSpendDay.overallTotal, currency)}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {formatDateDisplay(highestSpendDay.dateStr, 'medium')}
              </p>
              <button
                onClick={() => onSelectDate(highestSpendDay.dateStr)}
                className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                View day details →
              </button>
            </div>
          ) : (
            <p className="text-xs text-neutral-400">No recorded expenses</p>
          )}
        </div>

        {/* Adherence */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Meal Tracking Days
          </span>
          <div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {mealDaysCount} / {daysInMonth} Days
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {Math.round((mealDaysCount / (daysInMonth || 1)) * 100)}% active days this month
            </p>
          </div>
        </div>

      </div>

      {/* 2. Daily Timeline Bar Chart */}
      <div className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-xl border border-neutral-200/90 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
            Daily Expense Timeline
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
              <span>Meals</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
              <span>Misc</span>
            </span>
          </div>
        </div>

        <div className="h-40 flex items-end gap-1 border-b border-neutral-200 dark:border-neutral-700 pb-1">
          {dailyEntries.map((day) => {
            const heightPercent = maxDayExpense > 0 ? Math.min(100, (day.overallTotal / maxDayExpense) * 100) : 0;
            const mealHeightPercent = day.overallTotal > 0 ? (day.mealTotal / day.overallTotal) * 100 : 0;
            const miscHeightPercent = day.overallTotal > 0 ? (day.miscTotal / day.overallTotal) * 100 : 0;

            return (
              <div
                key={day.dateStr}
                onClick={() => onSelectDate(day.dateStr)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
              >
                <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 z-20 bg-neutral-900 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap">
                  {day.dayNumber}: {formatCurrency(day.overallTotal, currency)}
                </div>

                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full rounded-t-xs min-h-[2px] flex flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-800 group-hover:opacity-80"
                >
                  <div style={{ height: `${mealHeightPercent}%` }} className="bg-emerald-500 w-full" />
                  <div style={{ height: `${miscHeightPercent}%` }} className="bg-amber-500 w-full" />
                </div>

                <span className="text-[9px] text-neutral-400 mt-1">
                  {day.dayNumber % 3 === 1 ? day.dayNumber : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Category Breakdown & Meal Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Miscellaneous Categories
            </h3>
            <span className="text-xs text-neutral-500">
              Total: {formatCurrency(monthlyMiscTotal, currency)}
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-neutral-400 py-3 text-center">
              No miscellaneous expenses recorded.
            </p>
          ) : (
            <div className="space-y-2.5">
              {categoryBreakdown.map((cat) => {
                const meta = getCategoryMeta(cat.categoryId);
                return (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {meta.label} <span className="text-neutral-400">({cat.count})</span>
                      </span>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(cat.amount, currency)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div style={{ width: `${cat.percentage}%` }} className="bg-amber-500 h-full rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Recurring Meals Summary
            </h3>
            <span className="text-xs text-neutral-500">
              Total: {formatCurrency(monthlyMealTotal, currency)}
            </span>
          </div>

          {Object.keys(mealTypeTotals).length === 0 ? (
            <p className="text-xs text-neutral-400 py-3 text-center">
              No meals marked this month.
            </p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(mealTypeTotals).map(([name, amount]) => {
                const percentage = monthlyMealTotal > 0 ? Math.round((amount / monthlyMealTotal) * 100) : 0;
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {name}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(amount, currency)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div style={{ width: `${percentage}%` }} className="bg-emerald-500 h-full rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
