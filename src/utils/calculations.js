import { parseMonthKey, getDaysInMonth, getCalendarGrid } from './dateHelpers';

/**
 * Resolves the effective price for a recurring item on a specific date,
 * respecting historical price changes.
 */
export const getItemPriceForDate = (item, dateStr) => {
  if (!item) return 0;
  
  if (Array.isArray(item.priceHistory) && item.priceHistory.length > 0) {
    // Sort descending by effectiveFrom
    const sorted = [...item.priceHistory].sort((a, b) => 
      b.effectiveFrom.localeCompare(a.effectiveFrom)
    );
    const applicable = sorted.find(p => p.effectiveFrom <= dateStr);
    if (applicable && typeof applicable.price === 'number') {
      return applicable.price;
    }
  }
  
  return Number(item.pricePerOccurrence) || 0;
};

/**
 * Checks if a recurring item is active and valid for a specific date.
 * Allows checking/marking previous days.
 */
export const isItemActiveOnDate = (item, dateStr) => {
  if (!item || item.isActive === false) return false;
  if (item.endDate && dateStr > item.endDate) return false;
  return true;
};

/**
 * Calculates daily meal, miscellaneous, and overall totals for a single date.
 */
export const calculateDailyTotals = (dateStr, mealTrackerEntries = [], expenses = [], recurringItems = []) => {
  if (!dateStr) {
    return {
      date: '',
      dailyMealTotal: 0,
      dailyMiscTotal: 0,
      dailyOverallTotal: 0,
      markedItems: [],
      expenses: [],
      notes: '',
      mealCount: 0,
      expenseCount: 0,
      hasActivity: false,
    };
  }

  const itemMap = new Map(recurringItems.map(item => [item.id, item]));
  
  // Find meal record for this date
  const mealRecord = mealTrackerEntries.find(entry => entry.date === dateStr);
  let dailyMealTotal = 0;
  const markedItemsDetails = [];
  
  if (mealRecord && mealRecord.mealsMarked) {
    for (const [itemId, isMarked] of Object.entries(mealRecord.mealsMarked)) {
      if (isMarked) {
        const item = itemMap.get(itemId);
        if (item && isItemActiveOnDate(item, dateStr)) {
          const price = getItemPriceForDate(item, dateStr);
          dailyMealTotal += price;
          markedItemsDetails.push({
            id: item.id,
            name: item.name,
            icon: item.icon || '🍽️',
            price,
          });
        }
      }
    }
  }
  
  // Calculate misc expenses for this date
  const dayExpenses = expenses.filter(exp => exp.date === dateStr);
  const dailyMiscTotal = dayExpenses.reduce((sum, exp) => sum + (Number(exp.totalAmount) || 0), 0);
  const dailyOverallTotal = dailyMealTotal + dailyMiscTotal;
  
  return {
    date: dateStr,
    dailyMealTotal,
    dailyMiscTotal,
    dailyOverallTotal,
    markedItems: markedItemsDetails,
    expenses: dayExpenses,
    notes: mealRecord?.notes || '',
    mealCount: markedItemsDetails.length,
    expenseCount: dayExpenses.length,
    hasActivity: markedItemsDetails.length > 0 || dayExpenses.length > 0,
  };
};

/**
 * Calculates all aggregated monthly metrics:
 * - monthlyMealTotal
 * - monthlyMiscTotal
 * - monthlyOverallTotal
 * - averageDailyExpense
 * - mealDaysCount
 * - totalMealsMarkedCount
 * - categoryBreakdown
 * - dailyMap (covers current month and all grid cells)
 */
export const calculateMonthlyTotals = (monthKey, mealTrackerEntries = [], expenses = [], recurringItems = []) => {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const daysInMonth = getDaysInMonth(year, monthIndex);
  
  const curMonthStr = String(monthIndex + 1).padStart(2, '0');
  const monthPrefix = `${year}-${curMonthStr}`;
  
  // Filter relevant records for the month
  const monthMealEntries = mealTrackerEntries.filter(entry => 
    entry.month === monthKey || (entry.date && entry.date.startsWith(monthPrefix))
  );
  
  const monthExpenses = expenses.filter(exp => 
    exp.month === monthKey || (exp.date && exp.date.startsWith(monthPrefix))
  );
  
  const itemMap = new Map(recurringItems.map(item => [item.id, item]));
  
  let monthlyMealTotal = 0;
  let mealDaysCount = 0;
  let totalMealsMarkedCount = 0;
  const mealTypeTotals = {};
  
  // Track unique days with at least one meal marked
  for (const entry of monthMealEntries) {
    let dayHasMeal = false;
    if (entry.mealsMarked) {
      for (const [itemId, isMarked] of Object.entries(entry.mealsMarked)) {
        if (isMarked) {
          const item = itemMap.get(itemId);
          if (item && isItemActiveOnDate(item, entry.date)) {
            const price = getItemPriceForDate(item, entry.date);
            monthlyMealTotal += price;
            totalMealsMarkedCount += 1;
            dayHasMeal = true;
            
            mealTypeTotals[item.name] = (mealTypeTotals[item.name] || 0) + price;
          }
        }
      }
    }
    if (dayHasMeal) {
      mealDaysCount += 1;
    }
  }
  
  // Calculate misc expenses & category breakdown
  let monthlyMiscTotal = 0;
  const categoryTotals = {};
  
  for (const exp of monthExpenses) {
    const amount = Number(exp.totalAmount) || (Number(exp.quantity || 1) * Number(exp.unitPrice || 0));
    monthlyMiscTotal += amount;
    
    const cat = exp.category || 'other';
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { amount: 0, count: 0 };
    }
    categoryTotals[cat].amount += amount;
    categoryTotals[cat].count += 1;
  }
  
  const monthlyOverallTotal = monthlyMealTotal + monthlyMiscTotal;
  const averageDailyExpense = daysInMonth > 0 ? (monthlyOverallTotal / daysInMonth) : 0;
  
  // Generate daily map for all cells in the calendar grid
  const dailyMap = {};
  const grid = getCalendarGrid(monthKey);
  for (const cell of grid) {
    dailyMap[cell.dateStr] = calculateDailyTotals(cell.dateStr, mealTrackerEntries, expenses, recurringItems);
  }
  
  // Category percentages
  const categoryBreakdown = Object.entries(categoryTotals).map(([categoryId, data]) => ({
    categoryId,
    amount: data.amount,
    count: data.count,
    percentage: monthlyMiscTotal > 0 ? Math.round((data.amount / monthlyMiscTotal) * 100) : 0,
  })).sort((a, b) => b.amount - a.amount);
  
  return {
    monthKey,
    daysInMonth,
    monthlyMealTotal,
    monthlyMiscTotal,
    monthlyOverallTotal,
    averageDailyExpense: Number(averageDailyExpense.toFixed(2)),
    mealDaysCount,
    totalMealsMarkedCount,
    mealTypeTotals,
    categoryBreakdown,
    dailyMap,
    expensesCount: monthExpenses.length,
  };
};
