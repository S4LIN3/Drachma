# Monthly Meal & Daily Expense Tracker

A modern, responsive, data-driven web application built with React, Vite, and Tailwind CSS. It combines recurring meal purchase tracking, discretionary daily expense recording, and real-time financial calculations.

## ✨ Key Features

- **Recurring Meal Configuration & Calendar Marking**:
  - Configure daily, weekly, or custom recurring meal templates (e.g., Lunch, Dinner, Tea & Snacks).
  - Explicit calendar marking to distinguish between planned and actual purchases.
  - Historical pricing support: price adjustments apply going forward without altering historical records.
- **Dynamic Miscellaneous Expense Tracking**:
  - Record daily discrete expenses across categories (*Food & Dining, Transportation, Shopping, Bills & Utilities, Entertainment, Personal Care, Household, Other*).
  - Real-time automatic total calculation (`quantity × unitPrice`).
- **Real-Time Financial Calculation Engine**:
  - Total Monthly Expenses (`Monthly Meals + Monthly Misc`).
  - Meal Days Count (number of unique days meals were marked).
  - Average Daily Expense (accurately calculated using days in month, including leap years).
  - Daily breakdowns for any selected date.
- **Calendar & Daily Detail View**:
  - Interactive calendar grid with visual meal chips, expense badges, and daily overall totals.
  - Dedicated daily detail panel with toggleable meal checkboxes, misc expenses list, day notes, and daily totals.
- **Expense List & Analytics**:
  - Searchable and filterable expense list with category filters and sorting.
  - Visual analytics dashboard with daily expense timelines, category share percentages, and meal consistency rates.
- **Data Portability & Settings**:
  - LocalStorage persistence.
  - One-click JSON backup export and import (with schema validation, preview, and merge/replace options).
  - Dark Mode / Light Mode / System Theme support.
  - Multi-currency support (₹ INR, $ USD, € EUR, £ GBP, AED, CAD, AUD, etc.).

## 🚀 Getting Started

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```
