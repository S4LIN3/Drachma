import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../constants/currencies';
import { EXPENSE_CATEGORIES, getCategoryMeta } from '../constants/categories';
import { formatDateDisplay } from '../utils/dateHelpers';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ShoppingBag,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

export const ExpenseListView = ({
  expenses = [],
  selectedMonth,
  currency = 'INR',
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
  onSelectDate,
  onExportExcel,
  onExportPDF,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  const monthPrefix = selectedMonth;
  const filtered = useMemo(() => {
    return expenses
      .filter((exp) => {
        const matchesMonth = exp.month === selectedMonth || (exp.date && exp.date.startsWith(monthPrefix));
        if (!matchesMonth) return false;

        const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
        if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
        if (sortBy === 'amount-desc') return (b.totalAmount || 0) - (a.totalAmount || 0);
        if (sortBy === 'amount-asc') return (a.totalAmount || 0) - (b.totalAmount || 0);
        return 0;
      });
  }, [expenses, selectedMonth, monthPrefix, searchTerm, selectedCategory, sortBy]);

  const filteredTotal = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  }, [filtered]);

  const countLabel = filtered.length === 1 ? '1 transaction' : `${filtered.length} transactions`;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/90 dark:border-neutral-800 p-5 space-y-4">
      
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>

          {/* Excel Export */}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              title="Export as Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>
          )}

          {/* PDF Export */}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              title="Export as PDF"
            >
              <FileText className="w-4 h-4 text-red-600" />
            </button>
          )}

          <button
            onClick={() => onOpenAddExpense()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Summary Filter Count Banner */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-0.5">
        <span>Showing {countLabel}</span>
        <span className="font-semibold text-neutral-900 dark:text-white">
          Subtotal: {formatCurrency(filteredTotal, currency)}
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border border-neutral-200/80 dark:border-neutral-800 rounded-lg">
        {filtered.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              No matching expenses found for this month
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-850/60 text-neutral-500 uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Price × Qty</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((exp) => {
                const categoryMeta = getCategoryMeta(exp.category);
                return (
                  <tr
                    key={exp.id}
                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-850/40 transition-colors group"
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => onSelectDate(exp.date)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {formatDateDisplay(exp.date, 'short')}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {exp.description}
                      </span>
                      {exp.notes && (
                        <span className="text-neutral-400 italic ml-2">
                          ({exp.notes})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                        {categoryMeta.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-neutral-500 whitespace-nowrap">
                      {formatCurrency(exp.unitPrice, currency)} {exp.quantity > 1 ? `× ${exp.quantity}` : ''}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(exp.totalAmount, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditExpense(exp)}
                          className="p-1 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};
