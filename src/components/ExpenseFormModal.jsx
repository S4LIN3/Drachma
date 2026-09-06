import React, { useState, useEffect, useRef } from 'react';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../constants/currencies';
import { validateExpense } from '../utils/validation';
import { getTodayDateStr } from '../utils/dateHelpers';
import { X, ShoppingBag, Camera, Trash2, Image as ImageIcon } from 'lucide-react';

export const ExpenseFormModal = ({
  isOpen,
  initialDate,
  editingExpense = null,
  currency = 'INR',
  onSave,
  onClose,
}) => {
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    date: initialDate || getTodayDateStr(),
    description: '',
    category: 'food',
    unitPrice: '',
    quantity: 1,
    notes: '',
    attachment: '',
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
        attachment: editingExpense.attachment || '',
      });
    } else {
      setFormData({
        date: initialDate || getTodayDateStr(),
        description: '',
        category: 'food',
        unitPrice: '',
        quantity: 1,
        notes: '',
        attachment: '',
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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setFormData((prev) => ({ ...prev, attachment: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

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
        className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100"
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
          
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

          {/* Receipt Attachment Upload */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Receipt Attachment (Optional Photo)
            </label>
            {formData.attachment ? (
              <div className="relative rounded-lg border border-neutral-200 dark:border-neutral-700 p-2 bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <img src={formData.attachment} alt="Receipt preview" className="w-10 h-10 object-cover rounded" />
                  <span className="text-[11px] text-neutral-500 truncate">Receipt attached</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, attachment: '' })}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-2.5 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-lg text-neutral-500 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Attach / Capture Receipt Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}
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
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200/80 dark:border-neutral-800">
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
