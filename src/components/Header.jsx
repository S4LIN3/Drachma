import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings, 
  UtensilsCrossed, 
  BarChart3, 
  Moon, 
  Sun,
  ListOrdered,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Database,
  Smartphone
} from 'lucide-react';
import { formatMonthTitle } from '../utils/dateHelpers';

export const Header = ({
  selectedMonth,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onOpenMonthPicker,
  onOpenAddExpense,
  onOpenRecurringPanel,
  onOpenSettings,
  activeView,
  setActiveView,
  theme,
  onToggleTheme,
  onExportExcel,
  onExportPDF,
  onExportJSON,
  onToggleMobileQuickMode,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-neutral-900 border-b border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
      <div className="w-full px-4 sm:px-8 xl:px-12">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-3 sm:gap-4">
          
          {/* LEFT: Brand & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              ₹
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                Expense Tracker
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Monthly Meal & Daily Finance
              </p>
            </div>
          </div>

          {/* CENTER: Month Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 bg-neutral-50/80 dark:bg-neutral-850">
            <button
              onClick={onPreviousMonth}
              className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenMonthPicker}
              className="px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Change Month & Year"
            >
              {formatMonthTitle(selectedMonth)}
            </button>

            <button
              onClick={onNextMonth}
              className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

            <button
              onClick={onCurrentMonth}
              className="px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          {/* RIGHT: Navigation Tabs & Utility Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Quick Mobile PWA View Toggle */}
            <button
              onClick={onToggleMobileQuickMode}
              className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors"
              title="Switch to Mobile Quick Entry Mode"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quick Entry</span>
            </button>

            {/* View Switcher Tabs */}
            <nav className="hidden md:flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/90 rounded-xl border border-neutral-200/80 dark:border-neutral-800 text-xs font-medium">
              <button
                onClick={() => setActiveView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeView === 'calendar'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Calendar
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeView === 'list'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Expenses
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeView === 'analytics'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </button>
            </nav>

            {/* Meals Config */}
            <button
              onClick={onOpenRecurringPanel}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              title="Configure recurring meal templates"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Meals Config</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                title="Export report"
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl py-1.5 z-50 text-xs animate-fade-in-scale">
                  <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Export Monthly Report
                  </div>
                  <button
                    onClick={() => {
                      onExportExcel();
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportPDF();
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-600" />
                    <span>PDF Document</span>
                  </button>
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                  <button
                    onClick={() => {
                      onExportJSON();
                      setIsExportOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300"
                  >
                    <Database className="w-3.5 h-3.5 text-neutral-500" />
                    <span>JSON Backup</span>
                  </button>
                </div>
              )}
            </div>

            {/* Primary Action CTA: Add Expense */}
            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Expense</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
