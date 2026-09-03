import React, { useState, useEffect } from 'react';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../constants/currencies';
import { validateExpense } from '../utils/validation';
import { getTodayDateStr } from '../utils/dateHelpers';
import { X, ShoppingBag } from 'lucide-react';

export const ExpenseFormModal = ({
  isOpen,
  initialDate,
  editingExpense = null,
  currency = 'INR',
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    date: initialDate || getTodayDateStr(),
    description: '',
    category: 'food',
    unitPrice: '',
    quantity: 1,
    notes: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        date: editingExpense.date || initialDate || getTodayDateStr(),
        description: editingExpense.description || '',
        category: editingExpense.category || 'food',
        unitPrice: editingExpense.unitPrice || '',
        quantity: editingExpense.quantity || 1,
        notes: editingExpense.notes || '',
      });
    } else {
      setFormData({
        date: initialDate || getTodayDateStr(),
        description: '',
        category: 'food',
        unitPrice: '',
        quantity: 1,
        notes: '',
      });
    }
    setErrors({});
  }, [editingExpense, initialDate, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unitPriceNum = Number(formData.unitPrice) || 0;
  const quantityNum = Number(formData.quantity) || 1;
  const computedTotal = unitPriceNum * quantityNum;

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateExpense(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    onSave({
      ...formData,
      unitPrice: unitPriceNum,
      quantity: quantityNum,
      totalAmount: computedTotal,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in-scale">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-form-title"
        className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-md w-full overflow-hidden text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-850/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-neutral-500" />
            <h3 id="expense-form-title" className="text-sm font-semibold">
              {editingExpense ? 'Edit Expense' : 'Add Miscellaneous Expense'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs">
          
          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            {errors.date && <p className="mt-0.5 text-red-500 text-[11px]">{errors.date}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              What did you buy? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Coffee, Bus ticket, Groceries"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              autoFocus
            />
            {errors.description && <p className="mt-0.5 text-red-500 text-[11px]">{errors.description}</p>}
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price & Quantity Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Unit Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="40"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              {errors.unitPrice && <p className="mt-0.5 text-red-500 text-[11px]">{errors.unitPrice}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Computed Total Box */}
          <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <span className="text-neutral-500 font-medium">Computed Total</span>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {formatCurrency(computedTotal, currency)}
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Optional notes or details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              {editingExpense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
