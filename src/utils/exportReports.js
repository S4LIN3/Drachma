import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMonthTitle, formatDateDisplay, getDayOfWeekName, getDaysInMonth, parseMonthKey } from './dateHelpers';
import { CURRENCIES } from '../constants/currencies';
import { getCategoryMeta } from '../constants/categories';
import { DEJAVU_SANS_NORMAL, DEJAVU_SANS_BOLD } from './fontData';

/**
 * Formats a currency amount with correct Indian numbering and attached symbol without broken spacing.
 * Examples: ₹1,130, ₹240, ₹80, ₹10, ₹18, ₹565, ₹37.67, ₹0
 */
export const formatPdfCurrency = (amount, currency = 'INR') => {
  const num = Number(amount) || 0;
  const isDecimal = num % 1 !== 0;
  
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: isDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);

  const sym = currency === 'INR' ? '₹' : (CURRENCIES.find(c => c.code === currency)?.symbol || currency);
  return `${sym}${formattedNumber}`;
};

/**
 * Formats a date string 'YYYY-MM-DD' to formal report date '03 Sep 2026'
 */
const formatReportDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[monthIdx]} ${year}`;
};

/**
 * Formats a date string 'YYYY-MM-DD' to compact table date '03 Sep'
 */
const formatTableDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[monthIdx]}`;
};

/**
 * Generates and downloads a multi-sheet Excel (.xlsx) workbook for the selected month.
 */
export const exportMonthToExcel = ({
  selectedMonth,
  monthlyStats,
  mealTracker = [],
  expenses = [],
  recurringItems = [],
  currency = 'INR',
}) => {
  const monthTitle = formatMonthTitle(selectedMonth);
  const currencySymbol = currency === 'INR' ? '₹' : (CURRENCIES.find(c => c.code === currency)?.symbol || currency);
  const { year, monthIndex } = parseMonthKey(selectedMonth);
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const monthPrefix = selectedMonth;

  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // 1. Sheet: Summary
  // ----------------------------------------------------
  const summaryData = [
    ['MONTHLY FINANCIAL EXPENSE REPORT', ''],
    ['Report Period', monthTitle],
    ['Generated On', formatReportDate(new Date().toISOString().slice(0, 10))],
    ['Currency', `${currency} (${currencySymbol})`],
    ['', ''],
    ['KEY FINANCIAL METRICS', 'AMOUNT / STAT'],
    ['Total Monthly Expenses', `${currencySymbol} ${monthlyStats.monthlyOverallTotal}`],
    ['Recurring Meal Expenses', `${currencySymbol} ${monthlyStats.monthlyMealTotal}`],
    ['Miscellaneous Expenses', `${currencySymbol} ${monthlyStats.monthlyMiscTotal}`],
    ['Average Daily Expense', `${currencySymbol} ${monthlyStats.averageDailyExpense}`],
    ['Meal Tracking Days', `${monthlyStats.mealDaysCount} / ${daysInMonth} days`],
    ['Total Meal Portions Marked', monthlyStats.totalMealsMarkedCount],
    ['Total Miscellaneous Transactions', monthlyStats.expensesCount],
    ['', ''],
    ['CATEGORY-WISE BREAKDOWN', 'AMOUNT', 'SHARE (%)', 'TRANSACTIONS'],
  ];

  (monthlyStats.categoryBreakdown || []).forEach(cat => {
    const meta = getCategoryMeta(cat.categoryId);
    summaryData.push([meta.label, `${currencySymbol} ${cat.amount}`, `${cat.percentage}%`, cat.count]);
  });

  summaryData.push(['', '']);
  summaryData.push(['RECURRING MEALS SUMMARY', 'TOTAL AMOUNT']);
  Object.entries(monthlyStats.mealTypeTotals || {}).forEach(([name, amount]) => {
    summaryData.push([name, `${currencySymbol} ${amount}`]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 22 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ----------------------------------------------------
  // 2. Sheet: Daily Breakdown
  // ----------------------------------------------------
  const dailyHeaders = ['Date', 'Day', 'Meals Marked', 'Meal Cost', 'Misc Count', 'Misc Cost', 'Daily Total', 'Notes'];
  const dailyRows = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${monthPrefix}-${dStr}`;
    const dayData = monthlyStats.dailyMap?.[dateStr] || {
      dailyMealTotal: 0,
      dailyMiscTotal: 0,
      dailyOverallTotal: 0,
      markedItems: [],
      expenses: [],
      notes: '',
    };

    const mealNames = dayData.markedItems.map(m => m.name).join(' · ') || '—';
    dailyRows.push([
      formatReportDate(dateStr),
      getDayOfWeekName(dateStr),
      mealNames,
      dayData.dailyMealTotal,
      dayData.expenses.length,
      dayData.dailyMiscTotal,
      dayData.dailyOverallTotal,
      dayData.notes || '',
    ]);
  }

  const wsDaily = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows]);
  wsDaily['!cols'] = [
    { wch: 16 }, { wch: 12 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Log');

  // ----------------------------------------------------
  // 3. Sheet: Miscellaneous Expenses List
  // ----------------------------------------------------
  const monthExpenses = expenses.filter(exp => 
    exp.month === selectedMonth || (exp.date && exp.date.startsWith(monthPrefix))
  ).sort((a, b) => a.date.localeCompare(b.date));

  const miscHeaders = ['Date', 'Description', 'Category', 'Unit Price', 'Quantity', 'Total Amount', 'Notes'];
  const miscRows = monthExpenses.map(exp => {
    const meta = getCategoryMeta(exp.category);
    return [
      formatReportDate(exp.date),
      exp.description,
      meta.label,
      exp.unitPrice,
      exp.quantity || 1,
      exp.totalAmount,
      exp.notes || '',
    ];
  });

  const wsMisc = XLSX.utils.aoa_to_sheet([miscHeaders, ...miscRows]);
  wsMisc['!cols'] = [
    { wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMisc, 'Misc Transactions');

  // Save workbook
  const fileName = `Expense_Report_${selectedMonth}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Generates and downloads a minimal, professional, corporate Monthly Financial Expense Report PDF.
 */
export const exportMonthToPDF = ({
  selectedMonth,
  monthlyStats,
  mealTracker = [],
  expenses = [],
  recurringItems = [],
  currency = 'INR',
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // 1. Embed and configure Unicode DejaVuSans TrueType Font (with full Indian Rupee ₹ glyph support)
  doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_SANS_NORMAL);
  doc.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_SANS_BOLD);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
  doc.setFont('DejaVuSans', 'normal');

  const monthTitle = formatMonthTitle(selectedMonth);
  const { year, monthIndex } = parseMonthKey(selectedMonth);
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const monthPrefix = selectedMonth;

  const todayStr = new Date().toISOString().slice(0, 10);
  const generatedDateFormatted = formatReportDate(todayStr);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 36;
  const contentWidth = pageWidth - (marginX * 2);

  // ----------------------------------------------------
  // 1. Header: Subtle Emerald Accent Bar & Report Title
  // ----------------------------------------------------
  doc.setFillColor(21, 128, 61); // Forest Green Accent
  doc.rect(marginX, 36, contentWidth, 3, 'F');

  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(31, 41, 51);
  doc.text('EXPENSE TRACKER', marginX, 58);

  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(102, 112, 133);
  doc.text('Monthly Meal & Daily Expense Report', marginX, 73);

  // Header Right: Period and Generation Date
  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 51);
  doc.text(monthTitle, pageWidth - marginX, 58, { align: 'right' });

  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(102, 112, 133);
  doc.text(`Generated on: ${generatedDateFormatted}`, pageWidth - marginX, 73, { align: 'right' });

  // Subtle Header Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.75);
  doc.line(marginX, 86, pageWidth - marginX, 86);

  // ----------------------------------------------------
  // 2. Section: Monthly Financial Summary
  // ----------------------------------------------------
  let currentY = 104;
  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 51);
  doc.text('MONTHLY FINANCIAL SUMMARY', marginX, currentY);

  currentY += 10;

  const mealPercent = monthlyStats.monthlyOverallTotal > 0 
    ? Math.round((monthlyStats.monthlyMealTotal / monthlyStats.monthlyOverallTotal) * 100) 
    : 0;
  const miscPercent = monthlyStats.monthlyOverallTotal > 0 
    ? Math.round((monthlyStats.monthlyMiscTotal / monthlyStats.monthlyOverallTotal) * 100) 
    : 0;
  const adherencePercent = daysInMonth > 0 
    ? Math.round((monthlyStats.mealDaysCount / daysInMonth) * 100) 
    : 0;

  const summaryCards = [
    {
      label: 'TOTAL EXPENSES',
      value: formatPdfCurrency(monthlyStats.monthlyOverallTotal, currency),
      sub: `${daysInMonth} days in month`,
    },
    {
      label: 'MEAL EXPENSES',
      value: formatPdfCurrency(monthlyStats.monthlyMealTotal, currency),
      sub: `${mealPercent}% of total spending`,
    },
    {
      label: 'MISC EXPENSES',
      value: formatPdfCurrency(monthlyStats.monthlyMiscTotal, currency),
      sub: `${miscPercent}% of total spending`,
    },
    {
      label: 'AVG / CALENDAR DAY',
      value: formatPdfCurrency(monthlyStats.averageDailyExpense, currency),
      sub: 'Per calendar day',
    },
    {
      label: 'MEAL DAYS',
      value: `${monthlyStats.mealDaysCount} / ${daysInMonth}`,
      sub: `${adherencePercent}% active tracking`,
    },
    {
      label: 'MEAL PORTIONS',
      value: `${monthlyStats.totalMealsMarkedCount} marked`,
      sub: 'Recurring portions',
    },
  ];

  const cardCols = 3;
  const cardGap = 8;
  const cardWidth = (contentWidth - (cardGap * (cardCols - 1))) / cardCols;
  const cardHeight = 44;

  summaryCards.forEach((card, idx) => {
    const row = Math.floor(idx / cardCols);
    const col = idx % cardCols;
    const x = marginX + (col * (cardWidth + cardGap));
    const y = currentY + (row * (cardHeight + cardGap));

    // Card Background & Subtle Border
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'S');

    // Label
    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(102, 112, 133);
    doc.text(card.label, x + 8, y + 12);

    // Main Value (Strong Anchor)
    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(31, 41, 51);
    doc.text(card.value, x + 8, y + 27);

    // Subtitle
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(card.sub, x + 8, y + 38);
  });

  currentY += (2 * (cardHeight + cardGap)) + 16;

  // ----------------------------------------------------
  // 3. Section: Daily Expense & Meal Log Table
  // ----------------------------------------------------
  doc.setFont('DejaVuSans', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 51);
  doc.text('DAILY EXPENSE & MEAL LOG', marginX, currentY);

  currentY += 8;

  const dailyTableRows = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${monthPrefix}-${dStr}`;
    const dayData = monthlyStats.dailyMap?.[dateStr] || {
      dailyMealTotal: 0,
      dailyMiscTotal: 0,
      dailyOverallTotal: 0,
      markedItems: [],
      expenses: [],
      notes: '',
    };

    const mealStr = dayData.markedItems.length > 0 
      ? dayData.markedItems.map(m => m.name).join(' · ') 
      : '—';

    dailyTableRows.push([
      formatReportDate(dateStr),
      getDayOfWeekName(dateStr).slice(0, 3),
      mealStr,
      formatPdfCurrency(dayData.dailyMealTotal, currency),
      formatPdfCurrency(dayData.dailyMiscTotal, currency),
      formatPdfCurrency(dayData.dailyOverallTotal, currency),
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Day', 'Meals', 'Meal Cost', 'Misc. Cost', 'Total']],
    body: dailyTableRows,
    theme: 'plain',
    margin: { left: marginX, right: marginX, top: 48, bottom: 42 },
    tableWidth: contentWidth,
    styles: {
      font: 'DejaVuSans',
      fontSize: 8.5,
      textColor: [31, 41, 51],
      cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
      lineWidth: { bottom: 0.5 },
      lineColor: [229, 231, 235],
      valign: 'middle',
    },
    headStyles: {
      font: 'DejaVuSans',
      fontStyle: 'bold',
      fontSize: 8.5,
      fillColor: [241, 245, 249],
      textColor: [31, 41, 51],
      lineWidth: { top: 0.5, bottom: 1 },
      lineColor: [203, 213, 225],
    },
    columnStyles: {
      0: { cellWidth: 78, halign: 'left' },
      1: { cellWidth: 38, halign: 'left' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 75, halign: 'right' },
      4: { cellWidth: 75, halign: 'right' },
      5: { cellWidth: 75, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    showHead: 'everyPage',
    didDrawPage: function (data) {
      if (data.pageNumber > 1) {
        doc.setFont('DejaVuSans', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(102, 112, 133);
        doc.text(`Expense Tracker • ${monthTitle} (Continued)`, marginX, 34);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.line(marginX, 40, pageWidth - marginX, 40);
      }
    },
  });

  // ----------------------------------------------------
  // 4. Bottom Total Summary Row
  // ----------------------------------------------------
  const finalTableY = doc.lastAutoTable.finalY + 6;
  if (finalTableY < pageHeight - 55) {
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, finalTableY, contentWidth, 20, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.rect(marginX, finalTableY, contentWidth, 20, 'S');

    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 51);
    doc.text('TOTAL MONTHLY EXPENSES', marginX + 8, finalTableY + 13);

    const mealSumStr = formatPdfCurrency(monthlyStats.monthlyMealTotal, currency);
    const miscSumStr = formatPdfCurrency(monthlyStats.monthlyMiscTotal, currency);
    const totalSumStr = formatPdfCurrency(monthlyStats.monthlyOverallTotal, currency);

    doc.text(mealSumStr, marginX + contentWidth - 150 - 6, finalTableY + 13, { align: 'right' });
    doc.text(miscSumStr, marginX + contentWidth - 75 - 6, finalTableY + 13, { align: 'right' });
    doc.text(totalSumStr, marginX + contentWidth - 6, finalTableY + 13, { align: 'right' });
  }

  // ----------------------------------------------------
  // 5. Standard Footer on All Pages
  // ----------------------------------------------------
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    // Divider above footer
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 30, pageWidth - marginX, pageHeight - 30);

    doc.text(`Expense Tracker • ${monthTitle} • Generated on ${generatedDateFormatted}`, marginX, pageHeight - 18);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 18, { align: 'right' });
  }

  // Download PDF
  const fileName = `Expense_Report_${selectedMonth}.pdf`;
  doc.save(fileName);
};
