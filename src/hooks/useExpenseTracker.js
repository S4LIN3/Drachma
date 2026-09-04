import { useState, useEffect, useMemo, useCallback } from 'react';
import { loadStoredData, saveStoredData, clearAllData, exportDataAsJSON } from '../utils/storage';
import { getCurrentMonthKey, getAdjacentMonthKey, getTodayDateStr } from '../utils/dateHelpers';
import { calculateMonthlyTotals, calculateDailyTotals } from '../utils/calculations';
import { 
  fetchDbData, 
  dbToggleMeal, 
  dbSaveMealNotes, 
  dbSaveExpense, 
  dbDeleteExpense, 
  dbSaveRecurringItem, 
  dbToggleRecurringActive, 
  dbDeleteRecurringItem, 
  dbSaveSettings, 
  dbClearAll, 
  subscribeToDbSync 
} from '../utils/dbApi';

export const useExpenseTracker = (addToast) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [recurringItems, setRecurringItems] = useState([]);
  const [mealTracker, setMealTracker] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({
    theme: 'light',
    currency: 'INR',
    notificationsEnabled: true,
  });

  // Reload data from Database helper
  const reloadFromDb = useCallback(async () => {
    try {
      const dbData = await fetchDbData();
      if (dbData) {
        if (Array.isArray(dbData.recurringItems)) setRecurringItems(dbData.recurringItems);
        if (Array.isArray(dbData.mealTracker)) setMealTracker(dbData.mealTracker);
        if (Array.isArray(dbData.expenses)) setExpenses(dbData.expenses);
        if (dbData.settings && Object.keys(dbData.settings).length > 0) {
          setSettings(prev => ({ ...prev, ...dbData.settings }));
        }
      }
    } catch (err) {
      // Offline fallback: load from localStorage
      console.warn('Backend DB not reachable, using offline cache:', err.message);
      const localData = loadStoredData();
      setRecurringItems(localData.recurringItems || []);
      setMealTracker(localData.mealTracker || []);
      setExpenses(localData.expenses || []);
      if (localData.settings) setSettings(localData.settings);
    }
  }, []);

  // Initial load from SQLite Database + Real-time Sync Subscription & PWA Auto-Refresh
  useEffect(() => {
    let isMounted = true;

    async function init() {
      await reloadFromDb();
      if (isMounted) setIsLoaded(true);
    }

    init();

    // Subscribe to Real-Time SSE Server updates and BroadcastChannel
    const unsubscribe = subscribeToDbSync(() => {
      reloadFromDb();
    });

    // Auto re-fetch when PWA/app comes to foreground or tab gains focus
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        reloadFromDb();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Periodic polling fallback (every 8 seconds when app is active)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        reloadFromDb();
      }
    }, 8000);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(pollInterval);
    };
  }, [reloadFromDb]);

  // Sync theme changes with DOM
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (settings.theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  // Cache latest state in localStorage for offline resilience
  useEffect(() => {
    if (isLoaded) {
      saveStoredData(recurringItems, mealTracker, expenses, settings, selectedMonth);
    }
  }, [recurringItems, mealTracker, expenses, settings, selectedMonth, isLoaded]);

  // Real-time calculated monthly summary
  const monthlyStats = useMemo(() => {
    return calculateMonthlyTotals(selectedMonth, mealTracker, expenses, recurringItems);
  }, [selectedMonth, mealTracker, expenses, recurringItems]);

  // Real-time calculated selected date details
  const selectedDateStats = useMemo(() => {
    return calculateDailyTotals(selectedDate, mealTracker, expenses, recurringItems);
  }, [selectedDate, mealTracker, expenses, recurringItems]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth(prev => getAdjacentMonthKey(prev, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth(prev => getAdjacentMonthKey(prev, 1));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    const cur = getCurrentMonthKey();
    setSelectedMonth(cur);
    setSelectedDate(getTodayDateStr());
  }, []);

  // Meal Tracking (Calendar marking) -> Persisted to SQLite DB
  const toggleMealMark = useCallback((dateStr, recurringItemId) => {
    const monthKey = dateStr.slice(0, 7);
    
    // 1. Optimistic UI update
    setMealTracker(prev => {
      const existingIndex = prev.findIndex(entry => entry.date === dateStr);
      
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const currentMark = !!existing.mealsMarked?.[recurringItemId];
        const updatedMeals = {
          ...(existing.mealsMarked || {}),
          [recurringItemId]: !currentMark,
        };
        
        const hasAnyMealMarked = Object.values(updatedMeals).some(Boolean);
        if (!hasAnyMealMarked && !existing.notes) {
          return prev.filter((_, idx) => idx !== existingIndex);
        }
        
        const updatedList = [...prev];
        updatedList[existingIndex] = {
          ...existing,
          mealsMarked: updatedMeals,
          updatedAt: new Date().toISOString(),
        };
        return updatedList;
      } else {
        const newRecord = {
          id: `meal-track-${dateStr}-${Date.now()}`,
          date: dateStr,
          month: monthKey,
          mealsMarked: { [recurringItemId]: true },
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return [...prev, newRecord];
      }
    });

    // 2. Persist to SQLite DB
    dbToggleMeal(dateStr, recurringItemId).catch(err => {
      console.error('Failed to sync meal toggle to DB:', err);
    });
  }, []);

  const setDayMealNotes = useCallback((dateStr, notes) => {
    const monthKey = dateStr.slice(0, 7);
    
    // 1. Optimistic UI update
    setMealTracker(prev => {
      const existingIndex = prev.findIndex(entry => entry.date === dateStr);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const updatedList = [...prev];
        updatedList[existingIndex] = {
          ...existing,
          notes,
          updatedAt: new Date().toISOString(),
        };
        return updatedList;
      } else if (notes) {
        return [...prev, {
          id: `meal-track-${dateStr}-${Date.now()}`,
          date: dateStr,
          month: monthKey,
          mealsMarked: {},
          notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      }
      return prev;
    });

    // 2. Persist to SQLite DB
    dbSaveMealNotes(dateStr, notes).catch(err => {
      console.error('Failed to sync notes to DB:', err);
    });
  }, []);

  // Recurring Items CRUD -> Persisted to SQLite DB
  const addRecurringItem = useCallback((itemData) => {
    const newItem = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: itemData.name.trim(),
      pricePerOccurrence: Number(itemData.pricePerOccurrence),
      frequency: itemData.frequency || 'daily',
      startDate: itemData.startDate || getTodayDateStr(),
      endDate: itemData.endDate || null,
      isActive: itemData.isActive !== false,
      icon: itemData.icon || '🍽️',
      description: itemData.description?.trim() || '',
      priceHistory: [
        { effectiveFrom: itemData.startDate || getTodayDateStr(), price: Number(itemData.pricePerOccurrence) }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRecurringItems(prev => [...prev, newItem]);
    if (addToast) addToast(`Recurring item "${newItem.name}" saved`, 'success');

    // Persist to DB
    dbSaveRecurringItem(newItem).catch(err => {
      console.error('Failed to save recurring item to DB:', err);
    });

    return newItem;
  }, [addToast]);

  const updateRecurringItem = useCallback((itemId, updatedData) => {
    let savedObj = null;

    setRecurringItems(prev => {
      return prev.map(item => {
        if (item.id !== itemId) return item;
        
        const oldPrice = item.pricePerOccurrence;
        const newPrice = Number(updatedData.pricePerOccurrence);
        let updatedHistory = Array.isArray(item.priceHistory) ? [...item.priceHistory] : [];
        
        if (oldPrice !== newPrice) {
          const effectiveDate = getTodayDateStr();
          const existingHistoryIdx = updatedHistory.findIndex(h => h.effectiveFrom === effectiveDate);
          if (existingHistoryIdx >= 0) {
            updatedHistory[existingHistoryIdx].price = newPrice;
          } else {
            updatedHistory.push({
              effectiveFrom: effectiveDate,
              price: newPrice,
            });
          }
        }

        savedObj = {
          ...item,
          ...updatedData,
          pricePerOccurrence: newPrice,
          priceHistory: updatedHistory,
          updatedAt: new Date().toISOString(),
        };

        return savedObj;
      });
    });

    if (savedObj) {
      dbSaveRecurringItem(savedObj).catch(err => {
        console.error('Failed to update recurring item in DB:', err);
      });
    }

    if (addToast) addToast('Recurring item updated', 'success');
  }, [addToast]);

  const toggleRecurringItemActive = useCallback((itemId) => {
    setRecurringItems(prev => {
      return prev.map(item => {
        if (item.id !== itemId) return item;
        const newActiveState = !item.isActive;
        if (addToast) {
          addToast(`"${item.name}" ${newActiveState ? 'activated' : 'paused'}`, 'info');
        }
        return {
          ...item,
          isActive: newActiveState,
          updatedAt: new Date().toISOString(),
        };
      });
    });

    dbToggleRecurringActive(itemId).catch(err => {
      console.error('Failed to toggle recurring item in DB:', err);
    });
  }, [addToast]);

  const deleteRecurringItem = useCallback((itemId) => {
    let deletedName = '';
    setRecurringItems(prev => {
      const target = prev.find(i => i.id === itemId);
      deletedName = target ? target.name : 'Item';
      return prev.filter(i => i.id !== itemId);
    });

    setMealTracker(prev => {
      return prev.map(entry => {
        if (!entry.mealsMarked || !(itemId in entry.mealsMarked)) return entry;
        const updatedMarks = { ...entry.mealsMarked };
        delete updatedMarks[itemId];
        return {
          ...entry,
          mealsMarked: updatedMarks,
          updatedAt: new Date().toISOString(),
        };
      }).filter(entry => Object.values(entry.mealsMarked).some(Boolean) || !!entry.notes);
    });

    dbDeleteRecurringItem(itemId).catch(err => {
      console.error('Failed to delete recurring item in DB:', err);
    });

    if (addToast) addToast(`"${deletedName}" deleted`, 'info');
  }, [addToast]);

  // Expenses CRUD -> Persisted to SQLite DB
  const addExpense = useCallback((expenseData) => {
    const unitPrice = Number(expenseData.unitPrice) || 0;
    const quantity = Number(expenseData.quantity) || 1;
    const totalAmount = unitPrice * quantity;
    const dateStr = expenseData.date || getTodayDateStr();
    const monthKey = dateStr.slice(0, 7);

    const newExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      date: dateStr,
      month: monthKey,
      description: expenseData.description.trim(),
      category: expenseData.category || 'other',
      unitPrice,
      quantity,
      totalAmount,
      notes: expenseData.notes?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setExpenses(prev => [newExpense, ...prev]);
    if (addToast) addToast(`Added ${newExpense.description} (${unitPrice * quantity})`, 'success');

    // Persist to DB
    dbSaveExpense(newExpense).catch(err => {
      console.error('Failed to save expense to DB:', err);
    });

    return newExpense;
  }, [addToast]);

  const updateExpense = useCallback((expenseId, updatedData) => {
    const unitPrice = Number(updatedData.unitPrice) || 0;
    const quantity = Number(updatedData.quantity) || 1;
    const totalAmount = unitPrice * quantity;
    const dateStr = updatedData.date || getTodayDateStr();
    const monthKey = dateStr.slice(0, 7);

    const updatedExpense = {
      id: expenseId,
      ...updatedData,
      date: dateStr,
      month: monthKey,
      unitPrice,
      quantity,
      totalAmount,
      updatedAt: new Date().toISOString(),
    };

    setExpenses(prev => {
      return prev.map(exp => (exp.id === expenseId ? updatedExpense : exp));
    });

    dbSaveExpense(updatedExpense).catch(err => {
      console.error('Failed to update expense in DB:', err);
    });

    if (addToast) addToast('Expense updated', 'success');
  }, [addToast]);

  const deleteExpense = useCallback((expenseId) => {
    setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    dbDeleteExpense(expenseId).catch(err => {
      console.error('Failed to delete expense in DB:', err);
    });
    if (addToast) addToast('Expense deleted', 'info');
  }, [addToast]);

  // Settings & Data Management
  const updateSettings = useCallback((newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    dbSaveSettings(merged).catch(err => {
      console.error('Failed to save settings in DB:', err);
    });
    if (addToast) addToast('Preferences saved', 'success');
  }, [settings, addToast]);

  const exportData = useCallback(() => {
    exportDataAsJSON(recurringItems, mealTracker, expenses, settings);
    if (addToast) addToast('Backup downloaded successfully', 'success');
  }, [recurringItems, mealTracker, expenses, settings, addToast]);

  const importData = useCallback(async (importedJson, mode = 'replace') => {
    try {
      if (mode === 'replace') {
        await dbClearAll();
      }

      for (const item of importedJson.recurringItems || []) {
        await dbSaveRecurringItem(item);
      }
      for (const exp of importedJson.expenses || []) {
        await dbSaveExpense(exp);
      }
      if (importedJson.settings) {
        await dbSaveSettings(importedJson.settings);
      }

      await reloadFromDb();
      if (addToast) addToast('Data imported and synced to database', 'success');
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      if (addToast) addToast('Failed to import data', 'error');
      return false;
    }
  }, [addToast, reloadFromDb]);

  const clearData = useCallback(async () => {
    try {
      await dbClearAll();
      clearAllData();
      setRecurringItems([]);
      setMealTracker([]);
      setExpenses([]);
      if (addToast) addToast('All database records cleared', 'info');
    } catch (err) {
      console.error('Clear data error:', err);
    }
  }, [addToast]);

  return {
    isLoaded,
    selectedMonth,
    setSelectedMonth,
    selectedDate,
    setSelectedDate,
    recurringItems,
    mealTracker,
    expenses,
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
    updateSettings,
    exportData,
    importData,
    clearData,
  };
};
