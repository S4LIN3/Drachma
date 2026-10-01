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
  FileSpreadsheet,
  FileText,
  Database,
  Smartphone,
  Receipt,
  User,
  LogOut,
  CalendarRange,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { formatMonthTitle } from '../utils/dateHelpers';
import { useAuth } from '../context/AuthContext';

export const Header = ({
  selectedMonth,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onOpenMonthPicker,
  onOpenAddExpense,
  onOpenRecurringPanel,
  onOpenMarkAsPaid,
  onOpenSettings,
  activeView,
  setActiveView,
  theme,
  onToggleTheme,
  onExportExcel,
  onExportPDF,
  onExportJSON,
  onToggleMobileQuickMode,
  onOpenProfile,
  onOpenYearlyReport,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const moreRef = useRef(null);
  const userMenuRef = useRef(null);
  const { user, logout } = useAuth();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setIsMoreOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* ── LEFT: Brand + Compact Month Navigator ── */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 select-none">
                ₹
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white leading-none">
                  Expense Tracker
                </h1>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 hidden xl:block leading-none mt-0.5">
                  Meal &amp; Daily Finance
                </p>
              </div>
            </div>

            {/* Compact Month Navigation */}
            <div className="flex items-center bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700/70 rounded-lg p-0.5 text-xs">
              <button
                onClick={onPreviousMonth}
                className="p-1 rounded text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-colors"
                title="Previous Month"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onOpenMonthPicker}
                className="px-2 py-0.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
                title="Change Month & Year"
              >
                {formatMonthTitle(selectedMonth)}
              </button>

              <button
                onClick={onNextMonth}
                className="p-1 rounded text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-colors"
                title="Next Month"
                aria-label="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-3.5 bg-neutral-200 dark:bg-neutral-700 mx-0.5 hidden xs:block" />

              <button
                onClick={onCurrentMonth}
                className="hidden xs:block px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-700 rounded transition-colors"
                title="Jump to Current Month"
              >
                Today
              </button>
            </div>
          </div>

          {/* ── CENTER: Main View Navigation Tabs ── */}
          <nav className="hidden md:flex items-center bg-neutral-100/80 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 text-xs font-medium">
            <button
              onClick={() => setActiveView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === 'calendar'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === 'list'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Expenses</span>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeView === 'analytics'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </nav>

          {/* ── RIGHT: Secondary Menu, Primary CTA, Utilities, Profile ── */}
          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Mobile View Switcher (when md nav is hidden) */}
            <div className="flex md:hidden items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setActiveView('calendar')}
                className={`p-1.5 rounded ${activeView === 'calendar' ? 'bg-white dark:bg-neutral-700 text-blue-600 shadow-xs' : 'text-neutral-500'}`}
                title="Calendar View"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveView('list')}
                className={`p-1.5 rounded ${activeView === 'list' ? 'bg-white dark:bg-neutral-700 text-blue-600 shadow-xs' : 'text-neutral-500'}`}
                title="Expenses View"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`p-1.5 rounded ${activeView === 'analytics' ? 'bg-white dark:bg-neutral-700 text-blue-600 shadow-xs' : 'text-neutral-500'}`}
                title="Analytics View"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Secondary Actions "More ▾" Dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  isMoreOpen
                    ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
                title="More Tools & Actions"
                aria-expanded={isMoreOpen}
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-neutral-500 sm:hidden" />
                <span className="hidden sm:inline">More</span>
                <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMoreOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl py-1.5 z-50 text-xs animate-fade-in-scale">
                  
                  {/* Section 1: Meals & Billing */}
                  <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Meals &amp; Payments
                  </div>

                  {onOpenMarkAsPaid && (
                    <button
                      onClick={() => {
                        onOpenMarkAsPaid();
                        setIsMoreOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="flex-1 font-medium">Mark as Paid</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onOpenRecurringPanel();
                      setIsMoreOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="flex-1 font-medium">Meals Config</span>
                  </button>

                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                  {/* Section 2: Reports & Exports */}
                  <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Reports &amp; Export
                  </div>

                  {onOpenYearlyReport && (
                    <button
                      onClick={() => {
                        onOpenYearlyReport();
                        setIsMoreOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      <CalendarRange className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span className="flex-1 font-medium">Yearly Report</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onExportExcel();
                      setIsMoreOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="flex-1">Export Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => {
                      onExportPDF();
                      setIsMoreOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="flex-1">Export PDF (.pdf)</span>
                  </button>

                  <button
                    onClick={() => {
                      onExportJSON();
                      setIsMoreOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="flex-1">JSON Backup</span>
                  </button>

                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                  {/* Section 3: Modes */}
                  <button
                    onClick={() => {
                      onToggleMobileQuickMode();
                      setIsMoreOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="flex-1">Quick Entry Mode</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── PRIMARY CTA: + Add Expense ── */}
            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs shrink-0"
              title="Add New Expense"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add Expense</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Account Avatar & Dropdown */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1 p-0.5 rounded-full hover:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-700 transition-all cursor-pointer"
                  title={`Signed in as ${user.name || user.email}`}
                  aria-label="User account menu"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs select-none">
                    {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl py-1.5 z-50 text-xs animate-fade-in-scale">
                    {/* User info summary */}
                    <div className="px-3.5 py-2 border-b border-neutral-100 dark:border-neutral-800">
                      <p className="font-semibold text-neutral-900 dark:text-white text-xs truncate">
                        {user.name || 'User'}
                      </p>
                      <p className="text-neutral-400 dark:text-neutral-500 text-[11px] truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onOpenProfile?.();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      <span>My Profile</span>
                    </button>

                    {onOpenYearlyReport && (
                      <button
                        onClick={() => {
                          onOpenYearlyReport();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-700 dark:text-neutral-300 transition-colors"
                      >
                        <CalendarRange className="w-3.5 h-3.5 text-violet-500" />
                        <span>Yearly Report</span>
                      </button>
                    )}

                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 text-red-600 dark:text-red-400 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
