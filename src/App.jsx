import React, { useState, useEffect } from 'react';
import { useToast } from './hooks/useToast';
import { useExpenseTracker } from './hooks/useExpenseTracker';
import { exportMonthToExcel, exportMonthToPDF } from './utils/exportReports';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { SmartQuickInputBar } from './components/SmartQuickInputBar';
import { BudgetingModal } from './components/BudgetingModal';
import { ReceiptLightboxModal } from './components/ReceiptLightboxModal';
import { LunchPaymentModal } from './components/Modals/LunchPaymentModal';
import { Calendar } from './components/Calendar';
import { DailyPanel } from './components/DailyPanel';
import { MobileQuickEntryView } from './components/MobileQuickEntryView';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { RecurringItemsPanel } from './components/RecurringItemsPanel';
import { MonthPickerModal } from './components/MonthPickerModal';
import { AnalyticsView } from './components/AnalyticsView';
import { ExpenseListView } from './components/ExpenseListView';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmationModal } from './components/Modals/ConfirmationModal';
import { ToastNotification } from './components/Modals/ToastNotification';

export function App() {
  const { toasts, addToast, removeToast } = useToast();
  
  const {
    isLoaded,
    selectedMonth,
    setSelectedMonth,
    selectedDate,
    setSelectedDate,
    recurringItems,
    mealTracker,
    expenses,
    budgets,
    payments,
    settings,
    monthlyStats,
    selectedDateStats,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    toggleMealMark,
    setDayMealNotes,
    addRecurringItem,
    updateRecurringItem,
    toggleRecurringItemActive,
    deleteRecurringItem,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteMultipleExpenses,
    batchUpdateCategory,
    saveBudget,
    markMealsAsPaid,
    deletePayment,
    updateSettings,
    exportData,
    importData,
    clearData,
  } = useExpenseTracker(addToast);

  // UI view state
  const [activeView, setActiveView] = useState('calendar'); // 'calendar' | 'list' | 'analytics'
  const [isMobileQuickMode, setIsMobileQuickMode] = useState(false);

  // Detect PWA standalone mode or small mobile viewport on initial load
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isSmallScreen = window.innerWidth < 640;
    if (isStandalone || isSmallScreen) {
      setIsMobileQuickMode(true);
    }
  }, []);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseFormTargetDate, setExpenseFormTargetDate] = useState(null);

  const [isRecurringPanelOpen, setIsRecurringPanelOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isMobileDailyModalOpen, setIsMobileDailyModalOpen] = useState(false);
  const [isLunchPaymentModalOpen, setIsLunchPaymentModalOpen] = useState(false);
  const [selectedPaymentItemId, setSelectedPaymentItemId] = useState(null);

  // Lightbox modal state for receipts
  const [lightboxImage, setLightboxImage] = useState(null);

  const handleOpenMarkAsPaid = (recurringItemId = null) => {
    setSelectedPaymentItemId(recurringItemId);
    setIsLunchPaymentModalOpen(true);
  };

  // Confirmation Modal state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    onConfirm: () => {},
  });

  const handleExportExcel = () => {
    try {
      exportMonthToExcel({
        selectedMonth,
        monthlyStats,
        mealTracker,
        expenses,
        recurringItems,
        currency: settings.currency || 'INR',
      });
      addToast('Excel report downloaded', 'success');
    } catch (err) {
      console.error('Failed to export Excel:', err);
      addToast('Failed to export Excel report', 'error');
    }
  };

  const handleExportPDF = () => {
    try {
      exportMonthToPDF({
        selectedMonth,
        monthlyStats,
        mealTracker,
        expenses,
        recurringItems,
        currency: settings.currency || 'INR',
      });
      addToast('PDF report downloaded', 'success');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      addToast('Failed to export PDF report', 'error');
    }
  };

  const handleOpenAddExpense = (targetDate = null) => {
    setEditingExpense(null);
    setExpenseFormTargetDate(targetDate || selectedDate);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseFormTargetDate(expense.date);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (expenseData) => {
    if (editingExpense) {
      updateExpense(editingExpense.id, expenseData);
    } else {
      addExpense(expenseData);
    }
  };

  const handleDeleteExpenseRequest = (expenseId) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense record?',
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        deleteExpense(expenseId);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteMultipleExpensesRequest = (expenseIds = []) => {
    setConfirmConfig({
      isOpen: true,
      title: `Delete ${expenseIds.length} Expenses`,
      message: `Are you sure you want to delete ${expenseIds.length} selected expense records?`,
      confirmText: 'Delete All Selected',
      isDestructive: true,
      onConfirm: () => {
        deleteMultipleExpenses(expenseIds);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteRecurringItemRequest = (item) => {
    setConfirmConfig({
      isOpen: true,
      title: `Delete "${item.name}"`,
      message: `Are you sure you want to delete "${item.name}"? Calendar markings will be removed.`,
      confirmText: 'Delete Item',
      isDestructive: true,
      onConfirm: () => {
        deleteRecurringItem(item.id);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleClearAllRequest = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Erase All Records',
      message: 'Permanently delete all meal logs and expense records?',
      confirmText: 'Clear Everything',
      isDestructive: true,
      onConfirm: () => {
        clearData();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setIsSettingsOpen(false);
      },
    });
  };

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    const dateMonth = dateStr.slice(0, 7);
    if (dateMonth !== selectedMonth) {
      setSelectedMonth(dateMonth);
    }
    if (window.innerWidth < 1280) {
      setIsMobileDailyModalOpen(true);
    }
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB] dark:bg-[#0F1012]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-neutral-400 border-t-neutral-800 dark:border-t-white rounded-full animate-spin" />
          <p className="text-xs font-medium text-neutral-500">Loading Expense Tracker...</p>
        </div>
      </div>
    );
  }

  // Dedicated Mobile PWA Quick Entry View
  if (isMobileQuickMode) {
    return (
      <>
        <MobileQuickEntryView
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          dailyStats={selectedDateStats}
          recurringItems={recurringItems}
          currency={settings.currency || 'INR'}
          onToggleMeal={toggleMealMark}
          onAddExpense={addExpense}
          onDeleteExpense={handleDeleteExpenseRequest}
          onSwitchToDashboard={() => setIsMobileQuickMode(false)}
          theme={settings.theme}
          onToggleTheme={toggleTheme}
        />

        <ConfirmationModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          isDestructive={confirmConfig.isDestructive}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        />

        <ToastNotification
          toasts={toasts}
          onDismiss={removeToast}
        />
      </>
    );
  }

  // Full Web Dashboard View
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFB] dark:bg-[#0F1012] text-neutral-900 dark:text-neutral-100 antialiased">
      
      {/* 1. Header */}
      <Header
        selectedMonth={selectedMonth}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onCurrentMonth={goToCurrentMonth}
        onOpenMonthPicker={() => setIsMonthPickerOpen(true)}
        onOpenAddExpense={() => handleOpenAddExpense()}
        onOpenRecurringPanel={() => setIsRecurringPanelOpen(true)}
        onOpenMarkAsPaid={(itemId) => handleOpenMarkAsPaid(itemId)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        theme={settings.theme}
        onToggleTheme={toggleTheme}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onExportJSON={exportData}
        onToggleMobileQuickMode={() => setIsMobileQuickMode(true)}
      />

      {/* Main Full-Screen Dynamic Container */}
      <main className="w-full px-4 sm:px-8 xl:px-12 py-6 flex-1 flex flex-col space-y-5">
        
        {/* Smart Quick Input Bar (Natural Language Parsing) */}
        <SmartQuickInputBar
          onAddExpense={addExpense}
          currency={settings.currency || 'INR'}
          addToast={addToast}
        />

        {/* 2. KPI Summary Cards with Budgeting Goal */}
        <SummaryCards
          stats={monthlyStats}
          currency={settings.currency || 'INR'}
          onOpenBudgetingModal={() => setIsBudgetModalOpen(true)}
        />

        {/* 3. Main Views */}
        {activeView === 'calendar' && (
          <div className="flex flex-col xl:flex-row gap-6 items-start flex-1 w-full">
            
            {/* Calendar Grid */}
            <div className="flex-1 min-w-0 w-full h-full flex flex-col">
              <Calendar
                selectedMonth={selectedMonth}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                dailyStatsMap={monthlyStats.dailyMap || {}}
                recurringItems={recurringItems}
                currency={settings.currency || 'INR'}
                onOpenAddExpenseForDate={(dateStr) => handleOpenAddExpense(dateStr)}
              />
            </div>

            {/* Sidebar Selected-Day Detail Panel */}
            <div className="hidden xl:block w-[340px] 2xl:w-[380px] shrink-0 sticky top-24">
              <DailyPanel
                selectedDate={selectedDate}
                dailyStats={selectedDateStats}
                recurringItems={recurringItems}
                currency={settings.currency || 'INR'}
                onToggleMeal={toggleMealMark}
                onOpenAddExpense={(dateStr) => handleOpenAddExpense(dateStr)}
                onEditExpense={handleOpenEditExpense}
                onDeleteExpense={handleDeleteExpenseRequest}
                onSaveNotes={setDayMealNotes}
              />
            </div>

          </div>
        )}

        {activeView === 'list' && (
          <ExpenseListView
            expenses={expenses}
            selectedMonth={selectedMonth}
            currency={settings.currency || 'INR'}
            onOpenAddExpense={() => handleOpenAddExpense()}
            onEditExpense={handleOpenEditExpense}
            onDeleteExpense={handleDeleteExpenseRequest}
            onDeleteMultipleExpenses={handleDeleteMultipleExpensesRequest}
            onBatchUpdateCategory={batchUpdateCategory}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            onOpenLightbox={(imgSrc) => setLightboxImage(imgSrc)}
            onSelectDate={(dateStr) => {
              setSelectedDate(dateStr);
              setActiveView('calendar');
            }}
          />
        )}

        {activeView === 'analytics' && (
          <AnalyticsView
            monthlyStats={monthlyStats}
            currency={settings.currency || 'INR'}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            onSelectDate={(dateStr) => {
              setSelectedDate(dateStr);
              setActiveView('calendar');
            }}
          />
        )}

      </main>

      {/* Mobile Selected-Day Modal */}
      {isMobileDailyModalOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in-scale">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col">
            <DailyPanel
              selectedDate={selectedDate}
              dailyStats={selectedDateStats}
              recurringItems={recurringItems}
              currency={settings.currency || 'INR'}
              onToggleMeal={toggleMealMark}
              onOpenAddExpense={(dateStr) => handleOpenAddExpense(dateStr)}
              onEditExpense={handleOpenEditExpense}
              onDeleteExpense={handleDeleteExpenseRequest}
              onSaveNotes={setDayMealNotes}
              onClose={() => setIsMobileDailyModalOpen(false)}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        initialDate={expenseFormTargetDate || selectedDate}
        editingExpense={editingExpense}
        currency={settings.currency || 'INR'}
        onSave={handleSaveExpense}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      <BudgetingModal
        isOpen={isBudgetModalOpen}
        selectedMonth={selectedMonth}
        monthlyStats={monthlyStats}
        budgets={budgets}
        currency={settings.currency || 'INR'}
        onSaveBudget={saveBudget}
        onClose={() => setIsBudgetModalOpen(false)}
      />

      <ReceiptLightboxModal
        isOpen={!!lightboxImage}
        imageSrc={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      <RecurringItemsPanel
        isOpen={isRecurringPanelOpen}
        recurringItems={recurringItems}
        mealTracker={mealTracker}
        currency={settings.currency || 'INR'}
        onClose={() => setIsRecurringPanelOpen(false)}
        onAdd={addRecurringItem}
        onUpdate={updateRecurringItem}
        onToggleActive={toggleRecurringItemActive}
        onDeleteRequest={handleDeleteRecurringItemRequest}
        onOpenMarkAsPaid={(itemId) => handleOpenMarkAsPaid(itemId)}
      />

      <LunchPaymentModal
        isOpen={isLunchPaymentModalOpen}
        recurringItems={recurringItems}
        mealTracker={mealTracker}
        payments={payments}
        currency={settings.currency || 'INR'}
        defaultItemId={selectedPaymentItemId}
        onClose={() => setIsLunchPaymentModalOpen(false)}
        onMarkAsPaid={markMealsAsPaid}
        onDeletePayment={deletePayment}
      />

      <MonthPickerModal
        isOpen={isMonthPickerOpen}
        currentSelectedMonth={selectedMonth}
        onSelectMonth={(newMonthKey) => setSelectedMonth(newMonthKey)}
        onClose={() => setIsMonthPickerOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        onExportJSON={exportData}
        onImportData={importData}
        onRequestClearAll={handleClearAllRequest}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <ToastNotification
        toasts={toasts}
        onDismiss={removeToast}
      />

    </div>
  );
}
