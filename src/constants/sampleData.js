export const getSampleInitialData = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonthKey = `${year}-${monthStr}`;

  const recurringItems = [
    {
      id: 'rec-lunch-001',
      name: 'Lunch',
      pricePerOccurrence: 100,
      frequency: 'daily',
      startDate: `${year}-01-01`,
      endDate: null,
      isActive: true,
      icon: '🍽️',
      description: 'Office lunch subscription / canteen',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priceHistory: [
        { effectiveFrom: `${year}-01-01`, price: 100 }
      ]
    },
    {
      id: 'rec-dinner-002',
      name: 'Dinner',
      pricePerOccurrence: 80,
      frequency: 'daily',
      startDate: `${year}-01-01`,
      endDate: null,
      isActive: true,
      icon: '🥘',
      description: 'Dinner delivery / mess',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priceHistory: [
        { effectiveFrom: `${year}-01-01`, price: 80 }
      ]
    },
    {
      id: 'rec-tea-003',
      name: 'Tea & Snacks',
      pricePerOccurrence: 25,
      frequency: 'daily',
      startDate: `${year}-01-01`,
      endDate: null,
      isActive: true,
      icon: '☕',
      description: 'Evening tea & light refreshment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priceHistory: [
        { effectiveFrom: `${year}-01-01`, price: 25 }
      ]
    }
  ];

  // Generate realistic meal tracker entries for the current month
  const mealTracker = [];
  const expenses = [];

  // Generate sample entries for the past few days up to current day
  const currentDay = Math.min(Math.max(now.getDate(), 5), 28);

  for (let day = 1; day <= currentDay; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentMonthKey}-${dayStr}`;
    const dayOfWeek = new Date(year, now.getMonth(), day).getDay();

    // Skip some weekends for variety
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const lunchMarked = isWeekend ? Math.random() > 0.4 : Math.random() > 0.15;
    const dinnerMarked = Math.random() > 0.25;
    const teaMarked = !isWeekend && Math.random() > 0.3;

    if (lunchMarked || dinnerMarked || teaMarked) {
      mealTracker.push({
        id: `meal-track-${dateStr}`,
        date: dateStr,
        month: currentMonthKey,
        mealsMarked: {
          'rec-lunch-001': lunchMarked,
          'rec-dinner-002': dinnerMarked,
          'rec-tea-003': teaMarked,
        },
        notes: day % 7 === 0 ? 'Weekly review meal' : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Add misc expenses on some days
    if (day === 2) {
      expenses.push({
        id: `exp-${dateStr}-1`,
        date: dateStr,
        month: currentMonthKey,
        description: 'Morning Coffee & Croissant',
        category: 'food',
        unitPrice: 65,
        quantity: 1,
        totalAmount: 65,
        notes: 'Cafe near office',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (day === 5) {
      expenses.push({
        id: `exp-${dateStr}-1`,
        date: dateStr,
        month: currentMonthKey,
        description: 'Metro Transit Card Recharge',
        category: 'transportation',
        unitPrice: 500,
        quantity: 1,
        totalAmount: 500,
        notes: 'Monthly pass',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (day === 8) {
      expenses.push({
        id: `exp-${dateStr}-1`,
        date: dateStr,
        month: currentMonthKey,
        description: 'Grocery Essentials & Milk',
        category: 'household',
        unitPrice: 340,
        quantity: 1,
        totalAmount: 340,
        notes: 'Supermarket visit',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (day === 12) {
      expenses.push({
        id: `exp-${dateStr}-1`,
        date: dateStr,
        month: currentMonthKey,
        description: 'Movie Tickets',
        category: 'entertainment',
        unitPrice: 220,
        quantity: 2,
        totalAmount: 440,
        notes: 'Weekend show',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (day === 15) {
      expenses.push({
        id: `exp-${dateStr}-1`,
        date: dateStr,
        month: currentMonthKey,
        description: 'Internet & WiFi Bill',
        category: 'bills',
        unitPrice: 899,
        quantity: 1,
        totalAmount: 899,
        notes: 'Monthly high-speed fiber',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return {
    version: '1.0',
    recurringItems,
    mealTracker,
    expenses,
    settings: {
      theme: 'light',
      currency: 'INR',
      notificationsEnabled: true,
    },
    metadata: {
      totalRecords: recurringItems.length + mealTracker.length + expenses.length,
      dateRange: `${currentMonthKey}-01 to ${currentMonthKey}-${currentDay}`,
      exportedAt: new Date().toISOString()
    }
  };
};
