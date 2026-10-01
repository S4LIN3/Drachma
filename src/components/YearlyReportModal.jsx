/**
 * YearlyReportModal — generates and exports a yearly expense report for the authenticated user.
 * Data is fetched from the backend /api/reports/yearly endpoint (user-scoped).
 * Supports PDF and Excel export using the existing exportReports utilities.
 */
import React, { useState, useCallback } from 'react';
import { X, Calendar, Download, FileText, FileSpreadsheet, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { dbFetchYearlyReport } from '../utils/dbApi';
import { CURRENCIES } from '../constants/currencies';
import { getCategoryMeta } from '../constants/categories';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEJAVU_SANS_NORMAL, DEJAVU_SANS_BOLD } from '../utils/fontData';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount) || 0;
  const sym = currency === 'INR' ? '₹' : (CURRENCIES.find((c) => c.code === currency)?.symbol || currency);
  return `${sym}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)}`;
}

function formatReportDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = (dateStr.split('T')[0] || '').split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d || ''} ${months[parseInt(m, 10) - 1] || ''} ${y || ''}`;
}

async function exportYearlyPDF(reportData, currency) {
  const { user, year, generatedAt, summary, monthlyBreakdown, categoryBreakdown } = reportData;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_SANS_NORMAL);
  doc.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_SANS_BOLD);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
  doc.setFont('DejaVuSans', 'normal');

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const mx = 36;
  const cw = pageWidth - mx * 2;
  const today = generatedAt ? generatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

  // Header
  doc.setFillColor(21, 128, 61);
  doc.rect(mx, 36, cw, 3, 'F');
  doc.setFont('DejaVuSans', 'bold'); doc.setFontSize(18); doc.setTextColor(31, 41, 51);
  doc.text('EXPENSE TRACKER', mx, 58);
  doc.setFont('DejaVuSans', 'normal'); doc.setFontSize(10.5); doc.setTextColor(102, 112, 133);
  doc.text(`Annual Financial Report — ${year}`, mx, 73);
  doc.setFont('DejaVuSans', 'bold'); doc.setFontSize(11); doc.setTextColor(31, 41, 51);
  doc.text(`${year}`, pageWidth - mx, 58, { align: 'right' });
  doc.setFont('DejaVuSans', 'normal'); doc.setFontSize(9.5); doc.setTextColor(102, 112, 133);
  doc.text(`Generated: ${formatReportDate(today)} | ${user.name}`, pageWidth - mx, 73, { align: 'right' });
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.75);
  doc.line(mx, 86, pageWidth - mx, 86);

  // Summary cards
  let y = 104;
  doc.setFont('DejaVuSans', 'bold'); doc.setFontSize(11); doc.setTextColor(31, 41, 51);
  doc.text('ANNUAL FINANCIAL SUMMARY', mx, y); y += 12;

  const cards = [
    { label: 'TOTAL EXPENSES', value: formatCurrency(summary.totalExpenses, currency), sub: `${summary.expenseCount} transactions` },
    { label: 'TOTAL MEAL PAYMENTS', value: formatCurrency(summary.totalMealPayments, currency), sub: `${summary.paymentCount} payments` },
    { label: 'OVERALL TOTAL', value: formatCurrency(summary.totalOverall, currency), sub: 'Combined annual spend' },
    { label: 'MEAL DAYS', value: String(summary.totalMealDays), sub: 'Days with meal tracking' },
    { label: 'MEAL PORTIONS', value: String(summary.totalMealPortions), sub: 'Total portions marked' },
    { label: 'AVG / MONTH', value: formatCurrency(summary.totalOverall / 12, currency), sub: 'Average monthly spend' },
  ];

  const cols = 3;
  const cardGap = 8;
  const cardW = (cw - cardGap * (cols - 1)) / cols;
  const cardH = 44;

  cards.forEach((card, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const cx = mx + col * (cardW + cardGap);
    const cy = y + row * (cardH + cardGap);
    doc.setFillColor(248, 250, 252); doc.roundedRect(cx, cy, cardW, cardH, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5); doc.roundedRect(cx, cy, cardW, cardH, 4, 4, 'S');
    doc.setFont('DejaVuSans', 'bold'); doc.setFontSize(7.5); doc.setTextColor(102, 112, 133);
    doc.text(card.label, cx + 8, cy + 12);
    doc.setFont('DejaVuSans', 'bold'); doc.setFontSize(13); doc.setTextColor(31, 41, 51);
    doc.text(card.value, cx + 8, cy + 27);
    doc.setFont('DejaVuSans', 'normal'); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
    doc.text(card.sub, cx + 8, cy + 38);
  });
  y += 2 * (cardH + cardGap) + 18;

  // Monthly breakdown table
  doc.setFont('DejaVuSans', 'bold'); doc.setFontSize(11); doc.setTextColor(31, 41, 51);
  doc.text('MONTHLY BREAKDOWN', mx, y); y += 8;

  const monthRows = monthlyBreakdown.map((m) => [
    m.month,
    String(m.expenseCount),
    formatCurrency(m.miscTotal, currency),
    formatCurrency(m.mealTotal, currency),
    formatCurrency(m.total, currency),
    String(m.mealDays),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Month', 'Expenses', 'Misc Total', 'Meal Total', 'Combined', 'Meal Days']],
    body: monthRows,
    theme: 'plain',
    margin: { left: mx, right: mx, top: 48, bottom: 42 },
    tableWidth: cw,
    styles: { font: 'DejaVuSans', fontSize: 8.5, textColor: [31, 41, 51], cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }, lineWidth: { bottom: 0.5 }, lineColor: [229, 231, 235], valign: 'middle' },
    headStyles: { font: 'DejaVuSans', fontStyle: 'bold', fontSize: 8.5, fillColor: [241, 245, 249], textColor: [31, 41, 51], lineWidth: { top: 0.5, bottom: 1 }, lineColor: [203, 213, 225] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 55, halign: 'right' },
      2: { cellWidth: 80, halign: 'right' },
      3: { cellWidth: 80, halign: 'right' },
      4: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 55, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    showHead: 'everyPage',
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont('DejaVuSans', 'bold'); doc.setFontSize(8.5); doc.setTextColor(102, 112, 133);
        doc.text(`Expense Tracker • Annual Report ${year} (Continued)`, mx, 34);
        doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.5);
        doc.line(mx, 40, pageWidth - mx, 40);
      }
    },
  });

  // Category breakdown (if space allows on same page)
  const afterTable = doc.lastAutoTable.finalY + 16;
  if (afterTable < pageHeight - 160 && categoryBreakdown.length > 0) {
    doc.setFont('DejaVuSans', 'bold'); doc.setFontSize(11); doc.setTextColor(31, 41, 51);
    doc.text('CATEGORY BREAKDOWN', mx, afterTable);
    autoTable(doc, {
      startY: afterTable + 8,
      head: [['Category', 'Amount', 'Share (%)']],
      body: categoryBreakdown.map((c) => [
        getCategoryMeta(c.category).label,
        formatCurrency(c.amount, currency),
        `${c.percentage}%`,
      ]),
      theme: 'plain',
      margin: { left: mx, right: mx },
      tableWidth: cw,
      styles: { font: 'DejaVuSans', fontSize: 8.5, textColor: [31, 41, 51], cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }, lineWidth: { bottom: 0.5 }, lineColor: [229, 231, 235] },
      headStyles: { font: 'DejaVuSans', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [31, 41, 51] },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 100, halign: 'right' }, 2: { cellWidth: 80, halign: 'right' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('DejaVuSans', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.5);
    doc.line(mx, pageHeight - 30, pageWidth - mx, pageHeight - 30);
    doc.text(`Expense Tracker • Annual Report ${year} • ${user.name} • ${formatReportDate(today)}`, mx, pageHeight - 18);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - mx, pageHeight - 18, { align: 'right' });
  }

  doc.save(`annual-report-${year}.pdf`);
}

async function exportYearlyExcel(reportData, currency) {
  const { user, year, generatedAt, summary, monthlyBreakdown, categoryBreakdown } = reportData;
  const sym = currency === 'INR' ? '₹' : (CURRENCIES.find((c) => c.code === currency)?.symbol || currency);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Drachma Expense Tracker';
  workbook.created = new Date();

  // Sheet 1: Summary
  const ws = workbook.addWorksheet('Annual Summary');
  ws.columns = [{ width: 36 }, { width: 22 }, { width: 16 }];
  ws.addRow(['ANNUAL FINANCIAL EXPENSE REPORT', '']);
  ws.addRow(['Report Period', `Year ${year}`]);
  ws.addRow(['User', `${user.name} (${user.email})`]);
  ws.addRow(['Generated On', (generatedAt || new Date().toISOString()).slice(0, 10)]);
  ws.addRow(['Currency', `${currency} (${sym})`]);
  ws.addRow(['', '']);
  ws.addRow(['KEY METRICS', 'AMOUNT / VALUE']);
  ws.addRow(['Total Miscellaneous Expenses', `${sym} ${summary.totalExpenses}`]);
  ws.addRow(['Total Meal Payments', `${sym} ${summary.totalMealPayments}`]);
  ws.addRow(['Overall Total', `${sym} ${summary.totalOverall}`]);
  ws.addRow(['Transaction Count', summary.expenseCount]);
  ws.addRow(['Payment Records', summary.paymentCount]);
  ws.addRow(['Total Meal Days', summary.totalMealDays]);
  ws.addRow(['Total Meal Portions', summary.totalMealPortions]);
  ws.addRow(['Average Monthly Spend', `${sym} ${Math.round(summary.totalOverall / 12 * 100) / 100}`]);
  ws.addRow(['', '']);

  // Sheet 2: Monthly
  const wsM = workbook.addWorksheet('Monthly Breakdown');
  wsM.columns = [
    { header: 'Month', key: 'month', width: 16 },
    { header: 'Expenses', key: 'expenses', width: 12 },
    { header: 'Misc Total', key: 'miscTotal', width: 16 },
    { header: 'Meal Total', key: 'mealTotal', width: 16 },
    { header: 'Combined', key: 'total', width: 16 },
    { header: 'Meal Days', key: 'mealDays', width: 12 },
    { header: 'Meal Portions', key: 'mealPortions', width: 14 },
  ];
  monthlyBreakdown.forEach((m) => wsM.addRow(m));

  // Sheet 3: Categories
  if (categoryBreakdown.length > 0) {
    const wsC = workbook.addWorksheet('Category Breakdown');
    wsC.columns = [
      { header: 'Category', key: 'category', width: 24 },
      { header: 'Amount', key: 'amount', width: 18 },
      { header: 'Share (%)', key: 'percentage', width: 14 },
    ];
    categoryBreakdown.forEach((c) => wsC.addRow({
      category: getCategoryMeta(c.category).label,
      amount: c.amount,
      percentage: c.percentage,
    }));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `annual-report-${year}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function YearlyReportModal({ isOpen, onClose, currency = 'INR' }) {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState('');

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setReportData(null);
    try {
      const data = await dbFetchYearlyReport(selectedYear);
      setReportData(data);
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  const handleExport = async (format) => {
    if (!reportData) return;
    setIsExporting(format);
    try {
      if (format === 'pdf') {
        await exportYearlyPDF(reportData, currency);
      } else {
        await exportYearlyExcel(reportData, currency);
      }
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    } finally {
      setIsExporting('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in-scale">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col text-neutral-900 dark:text-neutral-100"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-850/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-semibold">Yearly Report</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-5 border-b border-neutral-200/80 dark:border-neutral-800 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Select Year</label>
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(Number(e.target.value)); setReportData(null); setError(''); }}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating...</span></> : 'Generate Report'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!reportData && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <Calendar className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a year and click Generate Report</p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
              <p className="text-sm">Fetching your data...</p>
            </div>
          )}

          {reportData && !isLoading && (
            <>
              {!reportData.hasData ? (
                <div className="text-center py-12 text-neutral-400">
                  <TrendingDown className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">No data available for {selectedYear}</p>
                  <p className="text-[11px] mt-1">Start tracking expenses in {selectedYear} to generate a report.</p>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Annual Summary — {reportData.year}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: 'Total Expenses', value: formatCurrency(reportData.summary.totalExpenses, currency) },
                        { label: 'Meal Payments', value: formatCurrency(reportData.summary.totalMealPayments, currency) },
                        { label: 'Overall Total', value: formatCurrency(reportData.summary.totalOverall, currency), highlight: true },
                        { label: 'Transactions', value: reportData.summary.expenseCount },
                        { label: 'Meal Days', value: reportData.summary.totalMealDays },
                        { label: 'Avg / Month', value: formatCurrency(reportData.summary.totalOverall / 12, currency) },
                      ].map((card) => (
                        <div key={card.label} className={`p-3 rounded-xl border ${card.highlight ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30' : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850'}`}>
                          <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{card.label}</p>
                          <p className={`text-base font-bold mt-0.5 ${card.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-900 dark:text-white'}`}>{card.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly table */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Monthly Breakdown</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-neutral-100 dark:bg-neutral-800">
                            <th className="text-left px-3 py-2 font-semibold">Month</th>
                            <th className="text-right px-3 py-2 font-semibold">Transactions</th>
                            <th className="text-right px-3 py-2 font-semibold">Misc</th>
                            <th className="text-right px-3 py-2 font-semibold">Meals</th>
                            <th className="text-right px-3 py-2 font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.monthlyBreakdown.map((m, i) => (
                            <tr key={m.monthKey} className={i % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-neutral-850'}>
                              <td className="px-3 py-2 font-medium">{m.month}</td>
                              <td className="px-3 py-2 text-right text-neutral-500">{m.expenseCount}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(m.miscTotal, currency)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(m.mealTotal, currency)}</td>
                              <td className="px-3 py-2 text-right font-bold">{formatCurrency(m.total, currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Category breakdown */}
                  {reportData.categoryBreakdown.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Category Breakdown</h4>
                      <div className="space-y-1.5">
                        {reportData.categoryBreakdown.map((c) => {
                          const meta = getCategoryMeta(c.category);
                          return (
                            <div key={c.category} className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
                              <span className="text-sm">{meta.icon}</span>
                              <span className="flex-1 font-medium">{meta.label}</span>
                              <span className="text-neutral-500">{c.percentage}%</span>
                              <span className="font-bold text-right min-w-[80px]">{formatCurrency(c.amount, currency)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Export buttons */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">Export Report</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleExport('pdf')}
                        disabled={!!isExporting}
                        className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-60 font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {isExporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-red-600" />}
                        <span>PDF Document</span>
                      </button>
                      <button
                        onClick={() => handleExport('excel')}
                        disabled={!!isExporting}
                        className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-60 font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {isExporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                        <span>Excel (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="p-3 border-t border-neutral-200/80 dark:border-neutral-800 flex justify-end bg-neutral-50/50 dark:bg-neutral-850/50">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
