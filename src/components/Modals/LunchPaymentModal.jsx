import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../constants/currencies';
import { calculateUnpaidMealsAndAmount, getPaidTillDate } from '../../utils/calculations';
import { formatDateDisplay, getTodayDateStr } from '../../utils/dateHelpers';
import { X, CheckCircle2, Calendar, Receipt, History, AlertCircle, Trash2 } from 'lucide-react';

export const LunchPaymentModal = ({
  isOpen,
  recurringItems = [],
  mealTracker = [],
  payments = [],
  currency = 'INR',
  defaultItemId = null,
  onClose,
  onMarkAsPaid,
  onDeletePayment,
}) => {
  const activeItems = useMemo(() => recurringItems.filter((i) => i.isActive !== false), [recurringItems]);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [paidTillDate, setPaidTillDate] = useState(getTodayDateStr());
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initialId = defaultItemId || activeItems[0]?.id || '';
      setSelectedItemId(initialId);
      setPaidTillDate(getTodayDateStr());
      setNotes('');
      setShowHistory(false);
      setErrorMsg('');
    }
  }, [isOpen, defaultItemId, activeItems]);

  const selectedItem = useMemo(() => activeItems.find((i) => i.id === selectedItemId), [activeItems, selectedItemId]);

  // Current Payment Range Calculations
  const calculation = useMemo(() => {
    if (!selectedItemId || !paidTillDate) {
      return { unpaidStartDate: null, paidTillDate, eligibleMeals: [], totalAmount: 0, mealCount: 0 };
    }
    return calculateUnpaidMealsAndAmount(selectedItemId, paidTillDate, mealTracker, recurringItems);
  }, [selectedItemId, paidTillDate, mealTracker, recurringItems]);

  // Current Paid Till Status Banner
  const currentPaidTill = useMemo(() => {
    return getPaidTillDate(selectedItemId, mealTracker);
  }, [selectedItemId, mealTracker]);

  // Payment History for Selected Item
  const itemPayments = useMemo(() => {
    return payments.filter((p) => p.recurringItemId === selectedItemId);
  }, [payments, selectedItemId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (calculation.mealCount === 0) {
      setErrorMsg('No unpaid meals found up to the selected Paid Till date.');
      return;
    }

    try {
      await onMarkAsPaid({
        recurringItemId: selectedItemId,
        paidTillDate,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in-scale">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl shadow-xl border border-neutral-200/90 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden text-neutral-900 dark:text-neutral-100">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-850/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Mark Meals as Paid</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                Record payment for unpaid meals up to date
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          
          {/* Sub Navigation Tabs (Record Payment vs History) */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  !showHistory
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                Record Payment
              </button>
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                  showHistory
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({itemPayments.length})</span>
              </button>
            </div>

            {currentPaidTill && (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                Paid Till: {formatDateDisplay(currentPaidTill, 'short')}
              </span>
            )}
          </div>

          {!showHistory ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Select Meal Item */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Select Meal Item <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        selectedItemId === item.id
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500 font-semibold'
                          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="text-base">{item.icon || '🍽️'}</span>
                      <span className="truncate text-xs font-bold text-neutral-900 dark:text-white">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Unpaid Start Date Banner */}
              {calculation.unpaidStartDate ? (
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-between text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <span className="font-semibold">Unpaid Start Date: </span>
                      <span className="font-bold">{formatDateDisplay(calculation.unpaidStartDate, 'short')}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded">
                    Detected
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium">All marked meals for {selectedItem?.name || 'this item'} are currently marked as paid!</span>
                </div>
              )}

              {/* Paid Till Date Input */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Paid Till Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paidTillDate}
                  onChange={(e) => setPaidTillDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
                  required
                />
              </div>

              {/* Real-Time Payment Breakdown Summary Card */}
              {calculation.mealCount > 0 && (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200/80 dark:border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 font-semibold">
                    <span>Payment Period</span>
                    <span className="text-neutral-900 dark:text-white font-bold">
                      {formatDateDisplay(calculation.unpaidStartDate, 'short')} → {formatDateDisplay(calculation.paidTillDate, 'short')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 font-semibold">
                    <span>Eligible Meals Count</span>
                    <span className="text-neutral-900 dark:text-white font-bold">{calculation.mealCount} meals</span>
                  </div>

                  <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 flex items-center justify-between">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">Total Amount Due</span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(calculation.totalAmount, currency)}
                    </span>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Payment Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via Cash, UPI Transaction #9821, Cheque"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={calculation.mealCount === 0}
                  className={`px-5 py-2 font-bold text-white rounded-xl transition-colors shadow-xs ${
                    calculation.mealCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-neutral-300 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Payment ({formatCurrency(calculation.totalAmount, currency)})
                </button>
              </div>

            </form>
          ) : (
            /* History Section */
            <div className="space-y-3">
              {itemPayments.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                  No payment history recorded for {selectedItem?.name || 'this item'}.
                </div>
              ) : (
                <div className="space-y-2">
                  {itemPayments.map((pay) => (
                    <div
                      key={pay.id}
                      className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-850/60 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {formatDateDisplay(pay.startDate, 'short')} → {formatDateDisplay(pay.paidTillDate, 'short')}
                          </span>
                          <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                            {pay.mealCount} meals
                          </span>
                        </div>

                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          Paid on {formatDateDisplay(pay.paymentDate, 'short')} {pay.notes ? `· ${pay.notes}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">
                          {formatCurrency(pay.totalAmount, currency)}
                        </span>
                        {onDeletePayment && (
                          <button
                            type="button"
                            onClick={() => onDeletePayment(pay.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800"
                            title="Revert / Delete Payment Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
