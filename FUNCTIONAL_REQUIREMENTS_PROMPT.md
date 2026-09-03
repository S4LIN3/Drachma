# Monthly Meal & Daily Expense Tracker — Functional Requirements & Implementation Prompt

## Executive Summary

Build a comprehensive, data-driven **Monthly Meal & Daily Expense Tracker** application that seamlessly combines recurring meal purchase tracking, dynamic expense recording, and real-time financial calculations. The system must maintain strict data integrity, distinguish between planned and actual expenses, and provide accurate monthly financial summaries with automatic updates across all metrics.

---

## 1. CORE DATA MODEL & STRUCTURE

### 1.1 Recurring Meal Items (Configuration)

Each recurring item is a **configuration entity**, not an automatic calendar entry.

**Schema:**

```javascript
{
  id: UUID,
  name: string,                    // e.g., "Lunch", "Dinner"
  pricePerOccurrence: number,      // ₹100
  frequency: enum[
    'daily',
    'weekly',
    'monthly',
    'custom'
  ],
  startDate: ISO8601,
  endDate: ISO8601 | null,         // null = ongoing
  isActive: boolean,               // true = include in calculations
  customFrequency?: {
    interval: number,              // every N days/weeks/months
    unit: 'day' | 'week' | 'month'
  },
  description?: string,
  createdAt: ISO8601,
  updatedAt: ISO8601
}
```

**Key Rule:** Recurring items define **expected behavior**, not automatic charges. They must be explicitly marked/recorded for each occurrence via the calendar system.

---

### 1.2 Daily Meal Tracker (Calendar-Based Marking)

The calendar system records which days the user **actually purchased** meals.

**Schema:**

```javascript
{
  id: UUID,
  date: ISO8601,                   // specific date, e.g., "2024-09-05"
  month: string,                   // e.g., "2024-09"
  mealsMarked: {
    [recurringItemId]: boolean     // true = marked for this recurring item
  },
  notes?: string,
  createdAt: ISO8601,
  updatedAt: ISO8601
}
```

**Key Rule:**
- Each date can have multiple recurring items marked independently.
- A date entry only exists if at least one meal is marked or a miscellaneous expense is recorded.
- Changing a recurring item's price **does not retroactively recalculate** past dates (see Historical Pricing).
- Unmarking a meal removes it from that date without creating a deletion record.

---

### 1.3 Daily Miscellaneous Expenses

Each expense is a discrete transaction record.

**Schema:**

```javascript
{
  id: UUID,
  date: ISO8601,
  month: string,                   // e.g., "2024-09"
  description: string,             // e.g., "Coffee", "Bus ticket"
  category: enum[
    'food',
    'transportation',
    'shopping',
    'bills',
    'entertainment',
    'personal',
    'household',
    'other'
  ],
  unitPrice: number,
  quantity: number,                // default 1
  totalAmount: number,             // quantity × unitPrice
  notes?: string,
  createdAt: ISO8601,
  updatedAt: ISO8601
}
```

**Calculation:**
```
totalAmount = quantity × unitPrice
```

**Key Rule:**
- Each expense is a unique record with its own ID.
- No double-counting: if an expense is edited, only the latest version counts.
- Deleting an expense removes it completely from monthly totals.

---

## 2. CALCULATION ENGINE

### 2.1 Monthly Meal Expenses

**Formula:**

```javascript
monthlyMealTotal = Σ for each date in month:
  Σ for each marked recurring item on that date:
    (1 × item.pricePerOccurrence)
```

**Algorithm:**

1. Filter all recurring items by `isActive === true` and `startDate <= month`.
2. For each date in the selected month:
   - For each active recurring item:
     - If `mealsMarked[itemId] === true` for that date:
       - Add `item.pricePerOccurrence` to the running total.
3. Return total.

**Update Trigger:**
- When a day is marked/unmarked.
- When a recurring item's price changes.
- When a recurring item's active status changes.
- When the selected month changes.

**Example:**
```
Recurring Items:
  - Lunch: ₹100/day (active)
  - Dinner: ₹80/day (active)
  - Tea: ₹20/day (active)

Sept 5 marked: [Lunch ✓, Dinner ✓, Tea ✗]
  → ₹100 + ₹80 = ₹180

Sept 6 marked: [Lunch ✓, Dinner ✗, Tea ✓]
  → ₹100 + ₹20 = ₹120

Monthly total (20 days marked): ₹2,200 + ... = ₹5,600
```

---

### 2.2 Monthly Miscellaneous Expenses

**Formula:**

```javascript
monthlyMiscTotal = Σ for each expense in month:
  expense.totalAmount
```

**Algorithm:**

1. Filter all expenses by `month === selectedMonth`.
2. Sum all `totalAmount` values.
3. Return total.

**Update Trigger:**
- When an expense is added.
- When an expense is edited (recalculate total).
- When an expense is deleted.
- When the selected month changes.

**Example:**
```
Sept expenses:
  - Coffee: ₹40
  - Bus: ₹30
  - Groceries: ₹500
  - Entertainment: ₹200

Monthly miscellaneous total: ₹770
```

---

### 2.3 Monthly Totals

**Formula:**

```javascript
monthlyMealTotal = [calculation from 2.1]
monthlyMiscTotal = [calculation from 2.2]
monthlyOverallTotal = monthlyMealTotal + monthlyMiscTotal
```

**Update Trigger:** Combined from 2.1 and 2.2 triggers.

**Example:**
```
Meal Total:          ₹5,600
Miscellaneous Total: ₹770
Overall Total:       ₹6,370
```

---

### 2.4 Daily Totals

**Formula:**

```javascript
dailyMealTotal = Σ for each marked recurring item on that date:
  item.pricePerOccurrence

dailyMiscTotal = Σ for each expense on that date:
  expense.totalAmount

dailyOverallTotal = dailyMealTotal + dailyMiscTotal
```

**Example:**
```
Sept 5:
  Meals:           ₹180 (Lunch + Dinner)
  Miscellaneous:   ₹70  (Coffee + Bus)
  Daily Total:     ₹250
```

---

### 2.5 Average Daily Expense

**Formula:**

```javascript
averageDailyExpense = monthlyOverallTotal ÷ daysInMonth

Example:
  ₹6,370 ÷ 30 days = ₹212.33 per day
```

**Update Trigger:** Whenever monthly totals change.

---

### 2.6 Meal Days Count

**Formula:**

```javascript
mealDaysCount = Count of unique dates in the selected month
                where at least one recurring item is marked
```

**Algorithm:**

1. Filter meal tracker entries by selected month.
2. Count entries where at least one meal is marked.
3. Return count.

**Example:**
```
September:
  - 20 days with at least one meal marked
  - Meal Days Count: 20
```

---

## 3. DATA PERSISTENCE & STATE MANAGEMENT

### 3.1 Storage Requirements

**Primary Storage Mechanism:** Browser Local Storage or IndexedDB

**Data to Persist:**
- Recurring meal items configuration
- Daily meal tracker records (which days, which items marked)
- All miscellaneous expenses
- Last selected month/year
- User preferences (theme, notifications, etc.)

**Backup Strategy:**
- Export capability: Download all data as JSON
- Import capability: Upload JSON to restore data
- Monthly auto-backup (optional): Save snapshot

### 3.2 Calculation Cache

**Optimization:**
- Cache monthly totals after each change.
- Invalidate cache when:
  - A meal day is marked/unmarked.
  - An expense is added/edited/deleted.
  - A recurring item's price or status changes.
  - The month selection changes.

### 3.3 Historical Data Integrity

**Rule:** When a recurring item's price changes, apply the new price going forward.

**Implementation:**
- If the user edits "Lunch price" from ₹100 to ₹120 on Sept 10:
  - Sept 1-9: Previously marked days use ₹100 (already recorded).
  - Sept 10+: New marked days use ₹120.
  - Recalculate only dates >= Sept 10.

**Example:**
```
Scenario:
  - Sept 1-5: Lunch marked at ₹100/day = ₹500 (5 days)
  - Sept 6: Price changed to ₹120
  - Sept 6-10: Lunch marked at ₹120/day = ₹600 (5 days)
  - Total for month: ₹1,100

Recalculation on price change:
  - Preserve Sept 1-5 at ₹100
  - Update Sept 6+ to ₹120
```

---

## 4. USER WORKFLOWS

### 4.1 Primary Workflow: Select Month → Mark Meals → Add Expenses → Review

**Step 1: Select Month**
- User opens app or changes month via navigation.
- System loads:
  - Recurring items configuration (active ones).
  - Meal tracker records for the selected month.
  - All miscellaneous expenses for the selected month.
  - Calculates and displays all totals.

**Step 2: Mark Meal Days**
- User views calendar for the selected month.
- User clicks/taps a date to mark or unmark a recurring item.
- System immediately:
  - Updates the meal tracker record for that date.
  - Recalculates daily total, monthly meal total, overall monthly total.
  - Updates UI with new totals.
  - Updates daily expense panel if open.

**Step 3: Add Miscellaneous Expenses**
- User clicks "Add Expense" button.
- System opens an expense entry form.
- User enters: Date, Description, Category, Unit Price, Quantity, Notes.
- User submits.
- System:
  - Creates a new expense record.
  - Recalculates daily total, monthly miscellaneous total, overall monthly total.
  - Updates UI.
  - Closes form and refreshes calendar.

**Step 4: Review Monthly Total**
- User views summary cards showing:
  - Meal Days: 20
  - Meal Expenses: ₹2,200
  - Miscellaneous Expenses: ₹3,450
  - Total Monthly Expenses: ₹5,650
  - Average Daily Expense: ₹188.33

---

### 4.2 Recurring Item Management Workflow

**Adding a Recurring Item:**
1. User opens "Recurring Items" configuration panel.
2. User clicks "Add Recurring Item".
3. User enters:
   - Item name (e.g., "Lunch")
   - Price per occurrence (e.g., ₹100)
   - Frequency (Daily, Weekly, Monthly, Custom)
   - Start date
   - End date (optional)
   - Active status
4. User submits.
5. System:
   - Creates the recurring item record.
   - Does NOT automatically mark calendar days.
   - Displays the item in the calendar's recurring items list.
   - Updates recurring items panel.

**Editing a Recurring Item:**
1. User opens "Recurring Items" panel.
2. User clicks "Edit" on an item.
3. User changes price, frequency, dates, or active status.
4. User submits.
5. System:
   - Updates the recurring item record.
   - Recalculates all affected monthly totals.
   - Updates calendar display.

**Deleting a Recurring Item:**
1. User opens "Recurring Items" panel.
2. User clicks "Delete" on an item.
3. System confirms deletion.
4. System:
   - Deletes the recurring item record.
   - Removes marks for this item from all calendar dates.
   - Recalculates all monthly totals.
   - Updates calendar display.

**Pausing a Recurring Item:**
1. User opens "Recurring Items" panel.
2. User toggles "Active" status to OFF.
3. System:
   - Sets `isActive = false`.
   - Excludes this item from all calculations.
   - Visually indicates the item is paused in the calendar.

---

### 4.3 Expense Entry Workflow

**Adding a Miscellaneous Expense:**

1. User clicks "Add Expense" or "+" button.
2. System opens modal/form with fields:
   - Date (picker, default today).
   - Description (text input).
   - Category (dropdown).
   - Unit Price (number input).
   - Quantity (number input, default 1).
   - Notes (text area, optional).
3. User fills out form.
4. System displays calculation in real-time:
   - `totalAmount = quantity × unitPrice`
5. User submits.
6. System:
   - Creates expense record.
   - Closes form.
   - Recalculates totals.
   - Updates calendar and daily expense panel.

**Editing a Miscellaneous Expense:**

1. User views daily expense panel or expense list.
2. User clicks "Edit" on an expense.
3. System opens form pre-populated with expense data.
4. User modifies fields.
5. System recalculates total in real-time.
6. User submits.
7. System:
   - Updates expense record.
   - Recalculates totals.
   - Updates UI.

**Deleting a Miscellaneous Expense:**

1. User clicks "Delete" on an expense.
2. System confirms deletion.
3. System:
   - Removes the expense record.
   - Recalculates totals.
   - Updates UI.

---

## 5. MONTHLY NAVIGATION

### 5.1 Navigation Controls

User must be able to:

1. **Previous Month:** Load previous month's data, update all records and calculations.
2. **Next Month:** Load next month's data, update all records and calculations.
3. **Current Month:** Jump to today's month.
4. **Month/Year Picker:** Select any month/year directly.
5. **Display Current Selection:** Show "September 2024" or similar clearly.

### 5.2 State Management on Month Change

When the user selects a different month:

1. Clear current month's visual state.
2. Load recurring items (all active ones, regardless of month).
3. Load meal tracker records for new month.
4. Load miscellaneous expenses for new month.
5. Recalculate all totals for new month.
6. Render calendar for new month.
7. Update summary cards with new month's data.

**No Data Loss:** Switching months and back must preserve all data.

---

## 6. REAL-TIME UPDATE & REACTIVITY

### 6.1 Reactive Calculations

All calculations must be **immediate** and **automatic**.

**When calculations update:**

| Trigger | Affects |
|---------|---------|
| Mark/unmark meal day | Daily meal total, monthly meal total, overall total, average daily expense |
| Change recurring item price | Monthly meal total, overall total, average daily expense |
| Toggle recurring item active status | Monthly meal total, overall total, average daily expense |
| Add expense | Daily misc total, monthly misc total, overall total, average daily expense |
| Edit expense amount | Daily misc total, monthly misc total, overall total, average daily expense |
| Delete expense | Daily misc total, monthly misc total, overall total, average daily expense |
| Change selected month | All calculations for new month |

### 6.2 UI Update Strategy

After any data change:

1. Update the in-memory state (recurring items, meal tracker, expenses).
2. Recalculate affected totals immediately.
3. Update all affected UI components (summary cards, calendar, daily panels, charts).
4. Persist changes to local storage.
5. Provide visual feedback (toast/notification) for add/edit/delete actions.

---

## 7. DATA VALIDATION & CONSTRAINTS

### 7.1 Recurring Item Validation

- Name: Required, min 2 chars, max 50 chars.
- Price: Required, > 0, numeric.
- Frequency: Required, one of [daily, weekly, monthly, custom].
- Start Date: Required, ISO8601, <= today (or future).
- End Date: Optional, if provided must be >= start date.
- Custom Frequency: If frequency is "custom", both interval and unit are required.

### 7.2 Meal Tracker Validation

- Date: Required, valid ISO8601, within selected month.
- At least one recurring item must be marked for a record to exist.

### 7.3 Expense Validation

- Date: Required, valid ISO8601, within selected month.
- Description: Required, min 2 chars, max 100 chars.
- Category: Required, one of predefined list.
- Unit Price: Required, > 0, numeric, max 2 decimals.
- Quantity: Required, > 0, numeric.
- Total Amount: Calculated automatically, displayed for user confirmation.

---

## 8. ERROR HANDLING & EDGE CASES

### 8.1 Edge Cases

**Empty Month:**
- If no meals are marked and no expenses recorded:
  - Display "No data for this month" message.
  - Show summary cards with all zeros.
  - Calendar shows no marked dates.

**No Recurring Items:**
- If no recurring items exist:
  - Display message in recurring items panel: "No recurring items. Add one to get started."
  - Calendar allows only miscellaneous expense recording.

**Leap Years & Month Lengths:**
- Handle February 28/29 correctly.
- Calculate average daily expense as `total ÷ daysInMonth` accurately.

**Timezone Handling:**
- Store all dates in UTC in storage.
- Display dates in user's local timezone.
- Use consistent ISO8601 format.

### 8.2 Error Handling

**Storage Errors:**
- If local storage is full, display notification: "Storage limit reached. Export and clear old data."
- Implement export/import flow.

**Calculation Errors:**
- If a calculation fails, display error state and log to console.
- Reload page to retry.

**Invalid Data:**
- If corrupted data is detected on load, display recovery options:
  - Reload from backup.
  - Clear all data and start fresh.
  - Export current state for manual review.

---

## 9. PERFORMANCE CONSIDERATIONS

### 9.1 Optimization Strategies

1. **Lazy Loading:** Load only the selected month's data initially.
2. **Caching:** Cache calculated totals; invalidate only when necessary.
3. **Debouncing:** Debounce real-time calculations if user is entering data rapidly.
4. **Pagination:** If expense list grows very large, paginate or virtualize.
5. **Indexes:** Use date-based indexing for fast queries.

### 9.2 Scalability Limits

- Support up to 1,000 expenses per month (typical use case: 30-100).
- Support up to 20 active recurring items (typical: 3-5).
- Support data from 1 year to 10 years of history (optional feature).

---

## 10. EXPORT & IMPORT

### 10.1 Export Functionality

User can export all data as **JSON**.

**Export Format:**

```json
{
  "version": "1.0",
  "exportedAt": "2024-09-20T10:30:00Z",
  "recurringItems": [...],
  "mealTracker": [...],
  "expenses": [...],
  "metadata": {
    "totalRecords": 150,
    "dateRange": "2024-01-01 to 2024-09-20"
  }
}
```

### 10.2 Import Functionality

User can upload a previously exported JSON file.

**Validation:**
- Check version compatibility.
- Validate data schema.
- Show preview of records to import.
- Allow user to confirm or cancel.
- Merge with existing data or overwrite (user choice).

---

## 11. TESTING CHECKLIST

### 11.1 Functional Tests

- [ ] Mark meal day and verify calculations update immediately.
- [ ] Unmark meal day and verify calculations update immediately.
- [ ] Add recurring item and verify it appears in calendar options.
- [ ] Change recurring item price and verify monthly total updates.
- [ ] Delete recurring item and verify it's removed from all dates.
- [ ] Pause recurring item (set inactive) and verify it's excluded from calculations.
- [ ] Add miscellaneous expense and verify daily/monthly totals update.
- [ ] Edit expense amount and verify totals recalculate.
- [ ] Delete expense and verify totals update.
- [ ] Change selected month and verify all data loads correctly.
- [ ] Navigate to previous/next month and verify no data loss.
- [ ] Jump to current month and verify it loads correctly.
- [ ] Export data and verify JSON format is valid.
- [ ] Import exported data and verify all records are restored.

### 11.2 Edge Case Tests

- [ ] Handle empty month (no meals, no expenses).
- [ ] Handle month with only miscellaneous expenses (no meals).
- [ ] Handle leap year February correctly.
- [ ] Handle rapid successive updates (debouncing).
- [ ] Handle corrupted local storage and recovery.
- [ ] Handle browser refresh and data persistence.

### 11.3 Performance Tests

- [ ] Load 1,000 expenses for a month and verify calculations complete < 100ms.
- [ ] Mark 25 meals rapidly and verify debouncing prevents performance degradation.
- [ ] Export 5 years of data (60,000+ records) and verify export completes < 2 seconds.

---

## 12. API REFERENCE (If Backend Integration Required)

### 12.1 Endpoints (REST/GraphQL)

If implementing a server-side backend, the following endpoints should be supported:

**Recurring Items:**
- `GET /api/recurring-items` — Fetch all active recurring items.
- `POST /api/recurring-items` — Create a new recurring item.
- `PUT /api/recurring-items/:id` — Update a recurring item.
- `DELETE /api/recurring-items/:id` — Delete a recurring item.

**Meal Tracker:**
- `GET /api/meal-tracker?month=2024-09` — Fetch meal tracker records for a month.
- `POST /api/meal-tracker` — Create/update a meal tracker record.
- `DELETE /api/meal-tracker/:id` — Delete a meal tracker record.

**Expenses:**
- `GET /api/expenses?month=2024-09` — Fetch expenses for a month.
- `POST /api/expenses` — Create a new expense.
- `PUT /api/expenses/:id` — Update an expense.
- `DELETE /api/expenses/:id` — Delete an expense.

**Summaries:**
- `GET /api/summary?month=2024-09` — Fetch calculated totals for a month.

---

## 13. SUMMARY OF KEY REQUIREMENTS

1. **Recurring items are configuration**, not automatic calendar entries.
2. **Calendar marking records actual purchases**, not planned purchases.
3. **All calculations are real-time** and update immediately on any change.
4. **Price changes apply going forward**, preserving historical data.
5. **No double-counting**: Each expense has a unique ID and counts only once.
6. **Monthly totals reflect actual recorded purchases**, not assumptions.
7. **Data persists in local storage** and survives page refresh.
8. **Export/import functionality** for backup and data portability.
9. **Responsive design** works on mobile, tablet, desktop.
10. **Clear visual distinction** between meal expenses and miscellaneous expenses.

---

## 14. IMPLEMENTATION PHASES

### Phase 1: Core Functionality (Foundation)
- Data model and storage setup.
- Recurring item CRUD operations.
- Meal tracker marking system.
- Calculation engine (meals, misc, totals).

### Phase 2: User Interface (Calendar & Forms)
- Calendar component for meal marking.
- Expense entry form.
- Summary cards.
- Daily expense panel.

### Phase 3: Navigation & Polish
- Month navigation.
- Recurring items management panel.
- Visual indicators (marked days, expense icons).
- Real-time updates and animations.

### Phase 4: Advanced Features
- Export/import functionality.
- Data visualization (charts, trends).
- Notifications and reminders.
- Mobile app (optional).

---

**End of Functional Requirements Prompt**
