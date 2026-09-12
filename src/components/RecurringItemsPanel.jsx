import React, { useState } from 'react';
import { formatCurrency } from '../constants/currencies';
import { validateRecurringItem } from '../utils/validation';
import { getTodayDateStr, formatDateDisplay } from '../utils/dateHelpers';
import { getPaidTillDate } from '../utils/calculations';
import { 
  X, 
  Plus, 
  UtensilsCrossed, 
  Edit3, 
  Trash2, 
  Power,
  Receipt
} from 'lucide-react';

const COMMON_ICONS = ['🍽️', '🥘', '☕', '🥪', '🥗', '🍕', '🍲', '🥛', '🍎', '🍜'];

export const RecurringItemsPanel = ({
  isOpen,
  recurringItems = [],
  mealTracker = [],
  currency = 'INR',
  onClose,
  onAdd,
  onUpdate,
  onToggleActive,
  onDeleteRequest,
  onOpenMarkAsPaid,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formState, setFormState] = useState({
    name: '',
    pricePerOccurrence: '',
    frequency: 'daily',
    startDate: getTodayDateStr(),
    endDate: '',
    isActive: true,
    icon: '🍽️',
    description: '',
  });

  const [formErrors, setFormErrors] = useState({});

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormState({
      name: '',
      pricePerOccurrence: '',
      frequency: 'daily',
      startDate: getTodayDateStr(),
      endDate: '',
      isActive: true,
      icon: '🍽️',
      description: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormState({
      name: item.name,
      pricePerOccurrence: item.pricePerOccurrence,
      frequency: item.frequency || 'daily',
      startDate: item.startDate || getTodayDateStr(),
      endDate: item.endDate || '',
      isActive: item.isActive !== false,
      icon: item.icon || '🍽️',
      description: item.description || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const validation = validateRecurringItem(formState);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    if (editingItem) {
      onUpdate(editingItem.id, {
        ...formState,
        pricePerOccurrence: Number(formState.pricePerOccurrence),
        endDate: formState.endDate || null,
      });
    } else {
      onAdd({
        ...formState,
        pricePerOccurrence: Number(formState.pricePerOccurrence),
        endDate: formState.endDate || null,
      });
    }

    setIsFormOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-fade-in-scale">
      <div className="bg-white dark:bg-neutral-900 h-full w-full max-w-md shadow-xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col text-neutral-900 dark:text-neutral-100 animate-slide-in-right">
        
        {/* Header */}
        <div className="p-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-850/50">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold leading-none">Recurring Meal Templates</h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Configure templates & manage meal payments
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
          
          {isFormOpen ? (
            /* Add/Edit Sub-Form */
            <form onSubmit={handleFormSubmit} className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-850/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold">
                  {editingItem ? 'Edit Meal Template' : 'New Meal Template'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-[11px] text-neutral-500 hover:underline"
                >
                  Cancel
                </button>
              </div>

              {/* Icon selection */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Meal Icon
                </label>
                <div className="flex flex-wrap gap-1">
                  {COMMON_ICONS.map((icon) => (
                    <button
                      type="button"
                      key={icon}
                      onClick={() => setFormState({ ...formState, icon })}
                      className={`text-base p-1.5 rounded-md border transition-all ${
                        formState.icon === icon
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60'
                          : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch, Dinner, Morning Tea"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                {formErrors.name && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.name}</p>}
              </div>

              {/* Price */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Price Per Occurrence <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="100"
                  value={formState.pricePerOccurrence}
                  onChange={(e) => setFormState({ ...formState, pricePerOccurrence: e.target.value })}
                  className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1 font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  {editingItem ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={handleOpenAdd}
              className="w-full py-2 px-3 rounded-lg border border-dashed border-emerald-500/50 hover:border-emerald-500 bg-emerald-50/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Recurring Meal Template</span>
            </button>
          )}

          {/* List of Recurring Items */}
          <div className="space-y-2.5">
            {recurringItems.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-400">
                No templates configured.
              </div>
            ) : (
              recurringItems.map((item) => {
                const isActive = item.isActive !== false;
                const paidTillDate = getPaidTillDate(item.id, mealTracker);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-colors space-y-2.5 ${
                      isActive
                        ? 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700'
                        : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl p-1.5 rounded-md bg-neutral-50 dark:bg-neutral-800">
                          {item.icon || '🍽️'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-neutral-900 dark:text-white truncate">
                              {item.name}
                            </h4>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
                              }`}
                            >
                              {isActive ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {formatCurrency(item.pricePerOccurrence, currency)} / occurrence
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onToggleActive(item.id)}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          title={isActive ? 'Pause' : 'Activate'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRequest(item)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Paid Till Banner & Mark as Paid Action */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-750 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {paidTillDate ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <span>Paid Till:</span>
                            <span className="bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800">
                              {formatDateDisplay(paidTillDate, 'short')}
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">No meals marked paid</span>
                        )}
                      </span>

                      {onOpenMarkAsPaid && (
                        <button
                          type="button"
                          onClick={() => onOpenMarkAsPaid(item.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Mark as Paid</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
