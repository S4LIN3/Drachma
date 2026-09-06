import React from 'react';
import { 
  Wallet, 
  CalendarCheck, 
  Utensils, 
  ShoppingBag, 
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '../constants/currencies';

export const SummaryCards = ({ stats, currency = 'INR', onOpenBudgetingModal }) => {
  const {
    monthlyOverallTotal = 0,
    mealDaysCount = 0,
    monthlyMealTotal = 0,
    monthlyMiscTotal = 0,
    averageDailyExpense = 0,
    daysInMonth = 30,
    totalMealsMarkedCount = 0,
    budgetStats = {},
  } = stats || {};

  const { overallBudget = 0, remainingBudget = 0, safeDailyLimit = 0, budgetPercentage = 0, status = 'none' } = budgetStats;

  const mealPercentage = monthlyOverallTotal > 0 
    ? Math.round((monthlyMealTotal / monthlyOverallTotal) * 100) 
    : 0;
  const miscPercentage = monthlyOverallTotal > 0 
    ? Math.round((monthlyMiscTotal / monthlyOverallTotal) * 100) 
    : 0;

  const portionsLabel = totalMealsMarkedCount === 1 ? '1 meal marked' : `${totalMealsMarkedCount} meals marked`;

  const getBudgetStatusBadge = () => {
    if (status === 'exceeded') {
      return { label: 'Exceeded', color: 'text-red-600 dark:text-red-400', icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" /> };
    }
    if (status === 'warning') {
      return { label: 'Warning', color: 'text-amber-600 dark:text-amber-400', icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> };
    }
    if (status === 'on_track') {
      return { label: 'On Track', color: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> };
    }
    return { label: 'Set Goal', color: 'text-neutral-400', icon: <Target className="w-3.5 h-3.5 text-neutral-400" /> };
  };

  const badge = getBudgetStatusBadge();

  const cards = [
    {
      id: 'total',
      title: 'TOTAL EXPENSES',
      value: formatCurrency(monthlyOverallTotal, currency),
      subtitle: `${daysInMonth} days in month`,
      icon: <Wallet className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />,
    },
    {
      id: 'budget-goal',
      title: 'MONTHLY BUDGET',
      value: overallBudget > 0 ? formatCurrency(overallBudget, currency) : 'Not Set',
      subtitle: overallBudget > 0 ? `${budgetPercentage}% spent (${formatCurrency(remainingBudget, currency)} left)` : 'Click to set target',
      icon: <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      onClick: onOpenBudgetingModal,
      badge: overallBudget > 0 ? (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${badge.color}`}>
          {badge.icon} {badge.label}
        </span>
      ) : null,
    },
    {
      id: 'safe-daily',
      title: 'SAFE DAILY SPEND',
      value: overallBudget > 0 ? formatCurrency(safeDailyLimit, currency) : formatCurrency(averageDailyExpense, currency),
      subtitle: overallBudget > 0 ? 'Target per remaining day' : 'Avg daily spend',
      icon: <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    },
    {
      id: 'meal-total',
      title: 'MEAL EXPENSES',
      value: formatCurrency(monthlyMealTotal, currency),
      subtitle: `${mealPercentage}% of total (${mealDaysCount} days)`,
      icon: <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      id: 'misc-total',
      title: 'MISC EXPENSES',
      value: formatCurrency(monthlyMiscTotal, currency),
      subtitle: `${miscPercentage}% of total`,
      icon: <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    },
  ];

  return (
    <section className="mb-6 w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 xl:gap-5">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={card.onClick}
            className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-4 sm:p-5 flex flex-col justify-between h-[112px] sm:h-[118px] shadow-2xs transition-all ${
              card.onClick ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-md' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase truncate">
                {card.title}
              </span>
              <div className="p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-850 shrink-0 flex items-center gap-1">
                {card.icon}
              </div>
            </div>

            <div>
              <div className="text-[20px] sm:text-[24px] font-bold tracking-tight text-neutral-900 dark:text-white leading-tight truncate flex items-center justify-between">
                <span>{card.value}</span>
                {card.badge}
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
