import { EXPENSE_CATEGORIES } from '../constants/categories';

export const validateRecurringItem = (item) => {
  const errors = {};
  
  if (!item.name || typeof item.name !== 'string' || item.name.trim().length < 2) {
    errors.name = 'Item name is required and must be at least 2 characters (max 50).';
  } else if (item.name.trim().length > 50) {
    errors.name = 'Item name cannot exceed 50 characters.';
  }
  
  const price = Number(item.pricePerOccurrence);
  if (isNaN(price) || price <= 0) {
    errors.pricePerOccurrence = 'Price per occurrence must be a positive number greater than 0.';
  }
  
  const validFrequencies = ['daily', 'weekly', 'monthly', 'custom'];
  if (!item.frequency || !validFrequencies.includes(item.frequency)) {
    errors.frequency = 'Please select a valid frequency (Daily, Weekly, Monthly, or Custom).';
  }
  
  if (item.frequency === 'custom') {
    if (!item.customFrequency?.interval || Number(item.customFrequency.interval) <= 0) {
      errors.customInterval = 'Custom interval must be a positive number.';
    }
    if (!item.customFrequency?.unit || !['day', 'week', 'month'].includes(item.customFrequency.unit)) {
      errors.customUnit = 'Custom unit must be day, week, or month.';
    }
  }
  
  if (!item.startDate) {
    errors.startDate = 'Start date is required.';
  }
  
  if (item.endDate && item.startDate && item.endDate < item.startDate) {
    errors.endDate = 'End date cannot be earlier than start date.';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateExpense = (expense) => {
  const errors = {};
  
  if (!expense.date) {
    errors.date = 'Expense date is required.';
  }
  
  if (!expense.description || typeof expense.description !== 'string' || expense.description.trim().length < 2) {
    errors.description = 'Description is required and must be at least 2 characters (max 100).';
  } else if (expense.description.trim().length > 100) {
    errors.description = 'Description cannot exceed 100 characters.';
  }
  
  const validCategories = EXPENSE_CATEGORIES.map(c => c.id);
  if (!expense.category || !validCategories.includes(expense.category)) {
    errors.category = 'Please select a valid expense category.';
  }
  
  const unitPrice = Number(expense.unitPrice);
  if (isNaN(unitPrice) || unitPrice <= 0) {
    errors.unitPrice = 'Price must be a positive number greater than 0.';
  }
  
  const quantity = Number(expense.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    errors.quantity = 'Quantity must be at least 1.';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateImportData = (data) => {
  if (!data || typeof data !== 'object') {
    return { isValid: false, message: 'Invalid JSON file: Root object missing.' };
  }
  
  if (!Array.isArray(data.recurringItems) && !Array.isArray(data.mealTracker) && !Array.isArray(data.expenses)) {
    return { isValid: false, message: 'Invalid data format: Missing tracker collections.' };
  }
  
  return {
    isValid: true,
    summary: {
      recurringItemsCount: Array.isArray(data.recurringItems) ? data.recurringItems.length : 0,
      mealTrackerCount: Array.isArray(data.mealTracker) ? data.mealTracker.length : 0,
      expensesCount: Array.isArray(data.expenses) ? data.expenses.length : 0,
    }
  };
};
