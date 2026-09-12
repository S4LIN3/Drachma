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
          const isPaid = !!(mealRecord?.mealsPaid?.[item.id]?.paid || mealRecord?.mealsPaid?.[item.id] === true);
          dailyMealTotal += price;
          markedItemsDetails.push({
            id: item.id,
            name: item.name,
            icon: item.icon || '🍽️',
            price,
            isPaid,
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
 * Calculates budget adherence & daily pacing recommendations for a month.
 */
export const calculateBudgetStats = (monthKey, monthlyOverallTotal, categoryBreakdown = [], budgets = []) => {
  const monthBudgets = budgets.filter((b) => b.month === monthKey);
  const overallBudgetObj = monthBudgets.find((b) => b.category === 'overall');
  const overallBudget = overallBudgetObj ? Number(overallBudgetObj.amount) : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isCurrentMonth = todayStr.startsWith(monthKey);
  let remainingDays = 1;

  if (isCurrentMonth) {
    const todayNum = new Date().getDate();
    const { year, monthIndex } = parseMonthKey(monthKey);
    const daysInMonth = getDaysInMonth(year, monthIndex);
    remainingDays = Math.max(1, daysInMonth - todayNum + 1);
  }

  const remainingBudget = Math.max(0, overallBudget - monthlyOverallTotal);
  const safeDailyLimit = overallBudget > 0 ? Number((remainingBudget / remainingDays).toFixed(2)) : 0;
  const budgetPercentage = overallBudget > 0 ? Math.min(100, Math.round((monthlyOverallTotal / overallBudget) * 100)) : 0;

  let status = 'none'; // 'on_track' | 'warning' | 'exceeded' | 'none'
  if (overallBudget > 0) {
    if (monthlyOverallTotal > overallBudget) {
      status = 'exceeded';
    } else if (budgetPercentage >= 80) {
      status = 'warning';
    } else {
      status = 'on_track';
    }
  }

  return {
    overallBudget,
    remainingBudget,
    safeDailyLimit,
    budgetPercentage,
    status,
    remainingDays,
    isCurrentMonth,
  };
};

/**
 * Calculates all aggregated monthly metrics & budget pacing.
 */
export const calculateMonthlyTotals = (monthKey, mealTrackerEntries = [], expenses = [], recurringItems = [], budgets = []) => {
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
  let paidMealTotal = 0;
  let unpaidMealTotal = 0;
  let mealDaysCount = 0;
  let totalMealsMarkedCount = 0;
  let paidMealsCount = 0;
  let unpaidMealsCount = 0;
  const mealTypeTotals = {};
  
  for (const entry of monthMealEntries) {
    let dayHasMeal = false;
    if (entry.mealsMarked) {
      for (const [itemId, isMarked] of Object.entries(entry.mealsMarked)) {
        if (isMarked) {
          const item = itemMap.get(itemId);
          if (item && isItemActiveOnDate(item, entry.date)) {
            const price = getItemPriceForDate(item, entry.date);
            const isPaid = !!(entry.mealsPaid?.[itemId]?.paid || entry.mealsPaid?.[itemId] === true);

            monthlyMealTotal += price;
            totalMealsMarkedCount += 1;
            dayHasMeal = true;

            if (isPaid) {
              paidMealTotal += price;
              paidMealsCount += 1;
            } else {
              unpaidMealTotal += price;
              unpaidMealsCount += 1;
            }
            
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

  // Budget Pacing Analysis
  const budgetStats = calculateBudgetStats(monthKey, monthlyOverallTotal, categoryBreakdown, budgets);
  
  return {
    monthKey,
    daysInMonth,
    monthlyMealTotal,
    paidMealTotal,
    unpaidMealTotal,
    paidMealsCount,
    unpaidMealsCount,
    monthlyMiscTotal,
    monthlyOverallTotal,
    averageDailyExpense: Number(averageDailyExpense.toFixed(2)),
    mealDaysCount,
    totalMealsMarkedCount,
    mealTypeTotals,
    categoryBreakdown,
    dailyMap,
    expensesCount: monthExpenses.length,
    budgetStats,
  };
};

/**
 * Calculates unpaid meals count and total amount for a recurring item up to a specific paidTillDate.
 * Enforces historical pricing per date.
 */
export const calculateUnpaidMealsAndAmount = (recurringItemId, paidTillDate, mealTracker = [], recurringItems = []) => {
  if (!recurringItemId || !paidTillDate) {
    return { unpaidStartDate: null, paidTillDate, eligibleMeals: [], totalAmount: 0, mealCount: 0 };
  }

  const item = recurringItems.find((i) => i.id === recurringItemId);

  // Find all entries with marked and unpaid meals for this item
  const unpaidEntries = mealTracker
    .filter((entry) => {
      const isMarked = !!entry.mealsMarked?.[recurringItemId];
      const isPaid = !!(entry.mealsPaid?.[recurringItemId]?.paid || entry.mealsPaid?.[recurringItemId] === true);
      return isMarked && !isPaid;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (unpaidEntries.length === 0) {
    return { unpaidStartDate: null, paidTillDate, eligibleMeals: [], totalAmount: 0, mealCount: 0 };
  }

  const eligibleMeals = unpaidEntries.filter((e) => e.date <= paidTillDate);

  if (eligibleMeals.length === 0) {
    return { unpaidStartDate: null, paidTillDate, eligibleMeals: [], totalAmount: 0, mealCount: 0 };
  }

  const unpaidStartDate = eligibleMeals[0].date;
  const totalAmount = eligibleMeals.reduce((sum, entry) => {
    const price = getItemPriceForDate(item, entry.date);
    return sum + price;
  }, 0);

  return {
    unpaidStartDate,
    paidTillDate,
    eligibleMeals,
    totalAmount,
    mealCount: eligibleMeals.length,
  };
};

/**
 * Calculates the latest date through which all marked meals for a recurring item are continuously paid.
 */
export const getPaidTillDate = (recurringItemId, mealTracker = []) => {
  if (!recurringItemId) return null;

  const markedEntries = mealTracker
    .filter((entry) => !!entry.mealsMarked?.[recurringItemId])
    .sort((a, b) => a.date.localeCompare(b.date));

  if (markedEntries.length === 0) return null;

  let latestPaidDate = null;
  for (const entry of markedEntries) {
    const isPaid = !!(entry.mealsPaid?.[recurringItemId]?.paid || entry.mealsPaid?.[recurringItemId] === true);
    if (isPaid) {
      latestPaidDate = entry.date;
    } else {
      break; // Stop at first unpaid meal
    }
  }

  return latestPaidDate;
};
