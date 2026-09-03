import React from 'react';
import { 
  Wallet, 
  CalendarCheck, 
  Utensils, 
  ShoppingBag, 
  TrendingUp 
} from 'lucide-react';
import { formatCurrency } from '../constants/currencies';

export const SummaryCards = ({ stats, currency = 'INR' }) => {
  const {
    monthlyOverallTotal = 0,
    mealDaysCount = 0,
    monthlyMealTotal = 0,
    monthlyMiscTotal = 0,
    averageDailyExpense = 0,
    daysInMonth = 30,
    totalMealsMarkedCount = 0,
  } = stats || {};

  const mealPercentage = monthlyOverallTotal > 0 
    ? Math.round((monthlyMealTotal / monthlyOverallTotal) * 100) 
    : 0;
  const miscPercentage = monthlyOverallTotal > 0 
    ? Math.round((monthlyMiscTotal / monthlyOverallTotal) * 100) 
    : 0;

  const portionsLabel = totalMealsMarkedCount === 1 ? '1 meal marked' : `${totalMealsMarkedCount} meals marked`;

  const cards = [
    {
      id: 'total',
      title: 'TOTAL EXPENSES',
      value: formatCurrency(monthlyOverallTotal, currency),
      subtitle: `${daysInMonth} days in month`,
      icon: <Wallet className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />,
    },
    {
      id: 'meal-days',
      title: 'MEAL DAYS',
      value: `${mealDaysCount} / ${daysInMonth}`,
      subtitle: portionsLabel,
      icon: <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      id: 'meal-total',
      title: 'MEAL EXPENSES',
      value: formatCurrency(monthlyMealTotal, currency),
      subtitle: `${mealPercentage}% of total`,
      icon: <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      id: 'misc-total',
      title: 'MISC EXPENSES',
      value: formatCurrency(monthlyMiscTotal, currency),
      subtitle: `${miscPercentage}% of total`,
      icon: <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    },
    {
      id: 'avg-daily',
      title: 'AVG DAILY EXPENSE',
      value: formatCurrency(averageDailyExpense, currency),
      subtitle: 'Per calendar day',
      icon: <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    },
  ];

  return (
    <section className="mb-6 w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 xl:gap-5">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-4 sm:p-5 flex flex-col justify-between h-[106px] sm:h-[112px] shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase truncate">
                {card.title}
              </span>
              <div className="p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-850 shrink-0">
                {card.icon}
              </div>
            </div>

            <div>
              <div className="text-[22px] sm:text-[26px] font-bold tracking-tight text-neutral-900 dark:text-white leading-tight truncate">
                {card.value}
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 truncate">
                {card.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
