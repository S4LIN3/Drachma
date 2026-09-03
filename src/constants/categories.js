export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: 'Utensils', color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { id: 'transportation', label: 'Transportation', icon: 'Car', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag', color: 'purple', bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { id: 'bills', label: 'Bills & Utilities', icon: 'Receipt', color: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { id: 'entertainment', label: 'Entertainment', icon: 'Film', color: 'rose', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { id: 'personal', label: 'Personal Care', icon: 'Heart', color: 'pink', bg: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800' },
  { id: 'household', label: 'Household', icon: 'Home', color: 'cyan', bg: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  { id: 'other', label: 'Other', icon: 'MoreHorizontal', color: 'slate', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
];

export const getCategoryMeta = (categoryId) => {
  return EXPENSE_CATEGORIES.find(c => c.id === categoryId) || EXPENSE_CATEGORIES[7];
};
