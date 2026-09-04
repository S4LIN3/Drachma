const STORAGE_KEYS = {
  RECURRING_ITEMS: 'expense_tracker_recurring_items_v2',
  MEAL_TRACKER: 'expense_tracker_meal_records_v2',
  EXPENSES: 'expense_tracker_misc_expenses_v2',
  SETTINGS: 'expense_tracker_user_settings_v2',
  LAST_SELECTED_MONTH: 'expense_tracker_last_month_v2',
  INITIALIZED_FLAG: 'expense_tracker_initialized_v2',
};

const DEFAULT_RECURRING_ITEMS = [
  {
    id: 'rec-lunch-default',
    name: 'Lunch',
    pricePerOccurrence: 100,
    frequency: 'daily',
    startDate: '2020-01-01',
    endDate: null,
    isActive: true,
    icon: '🍽️',
    description: 'Daily lunch / canteen',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priceHistory: [{ effectiveFrom: '2020-01-01', price: 100 }]
  },
  {
    id: 'rec-dinner-default',
    name: 'Dinner',
    pricePerOccurrence: 80,
    frequency: 'daily',
    startDate: '2020-01-01',
    endDate: null,
    isActive: true,
    icon: '🥘',
    description: 'Daily dinner / mess',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priceHistory: [{ effectiveFrom: '2020-01-01', price: 80 }]
  },
  {
    id: 'rec-tea-default',
    name: 'Tea & Snacks',
    pricePerOccurrence: 25,
    frequency: 'daily',
    startDate: '2020-01-01',
    endDate: null,
    isActive: true,
    icon: '☕',
    description: 'Evening tea & light refreshment',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priceHistory: [{ effectiveFrom: '2020-01-01', price: 25 }]
  }
];

export const loadStoredData = () => {
  try {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED_FLAG);
    
    if (!isInitialized) {
      const initial = {
        recurringItems: DEFAULT_RECURRING_ITEMS,
        mealTracker: [],
        expenses: [],
        settings: { theme: 'light', currency: 'INR', notificationsEnabled: true },
      };
      saveStoredData(initial.recurringItems, initial.mealTracker, initial.expenses, initial.settings);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED_FLAG, 'true');
      return initial;
    }
    
    const recurringItemsStr = localStorage.getItem(STORAGE_KEYS.RECURRING_ITEMS);
    const mealTrackerStr = localStorage.getItem(STORAGE_KEYS.MEAL_TRACKER);
    const expensesStr = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const lastMonthStr = localStorage.getItem(STORAGE_KEYS.LAST_SELECTED_MONTH);
    
    let recurringItems = recurringItemsStr ? JSON.parse(recurringItemsStr) : [];
    if (!recurringItems || recurringItems.length === 0) {
      recurringItems = DEFAULT_RECURRING_ITEMS;
    }

    const mealTracker = mealTrackerStr ? JSON.parse(mealTrackerStr) : [];
    const expenses = expensesStr ? JSON.parse(expensesStr) : [];
    const settings = settingsStr ? JSON.parse(settingsStr) : {
      theme: 'light',
      currency: 'INR',
      notificationsEnabled: true,
    };
    
    return {
      recurringItems,
      mealTracker,
      expenses,
      settings,
      lastSelectedMonth: lastMonthStr || null,
    };
  } catch (error) {
    console.error('Failed to load from local storage:', error);
    return {
      recurringItems: DEFAULT_RECURRING_ITEMS,
      mealTracker: [],
      expenses: [],
      settings: { theme: 'light', currency: 'INR', notificationsEnabled: true },
      lastSelectedMonth: null,
    };
  }
};

export const saveStoredData = (recurringItems, mealTracker, expenses, settings, lastSelectedMonth) => {
  try {
    if (recurringItems !== undefined) {
      localStorage.setItem(STORAGE_KEYS.RECURRING_ITEMS, JSON.stringify(recurringItems));
    }
    if (mealTracker !== undefined) {
      localStorage.setItem(STORAGE_KEYS.MEAL_TRACKER, JSON.stringify(mealTracker));
    }
    if (expenses !== undefined) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    }
    if (settings !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
    if (lastSelectedMonth !== undefined) {
      localStorage.setItem(STORAGE_KEYS.LAST_SELECTED_MONTH, lastSelectedMonth);
    }
    return true;
  } catch (error) {
    console.error('Failed to save to local storage (Storage might be full):', error);
    return false;
  }
};

export const clearAllData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_FLAG, 'true');
    saveStoredData(DEFAULT_RECURRING_ITEMS, [], [], { theme: 'light', currency: 'INR', notificationsEnabled: true });
    return true;
  } catch (err) {
    console.error('Error clearing data:', err);
    return false;
  }
};

export const exportDataAsJSON = (recurringItems, mealTracker, expenses, settings) => {
  const exportPayload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    recurringItems: recurringItems || [],
    mealTracker: mealTracker || [],
    expenses: expenses || [],
    settings: settings || { theme: 'light', currency: 'INR' },
    metadata: {
      totalRecords: (recurringItems?.length || 0) + (mealTracker?.length || 0) + (expenses?.length || 0),
      exportedBy: 'Monthly Meal & Daily Expense Tracker',
    }
  };
  
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportPayload, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `expense_tracker_backup_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};
