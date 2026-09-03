# Monthly Meal & Daily Expense Tracker — UI/UX Implementation Prompt

## Executive Summary

Design and build a **clean, minimal, and intuitive user interface** for the Monthly Meal & Daily Expense Tracker. The UI prioritizes information hierarchy, responsive layout, and smooth user interactions while maintaining visual simplicity and cognitive clarity. All design decisions must support the primary workflow: **Select Month → Mark Meals → Add Expenses → Review Total**.

---

## 1. DESIGN PRINCIPLES & PHILOSOPHY

### 1.1 Core Principles

1. **Minimalism:** Remove unnecessary visual elements. Every UI component serves a clear purpose.
2. **Information Hierarchy:** Prioritize the current month's total expense at the top. Secondary details (meal days, miscellaneous, etc.) below.
3. **Clarity Over Aesthetics:** Use clear typography, ample whitespace, and logical grouping to aid scanning and comprehension.
4. **Responsive-First:** Design for mobile first, then scale to tablet and desktop.
5. **Accessibility:** Support keyboard navigation, screen readers, and sufficient color contrast.
6. **Consistency:** Reuse components, patterns, and spacing rules throughout.
7. **Feedback:** Provide immediate visual feedback for user actions (marking, adding, deleting).

### 1.2 Design Tokens

**Color Palette** (Minimal, neutral-focused):

```css
/* Neutrals */
--color-white: #FFFFFF;
--color-off-white: #FAFAFA;
--color-light-gray: #F5F5F5;
--color-gray: #E8E8E8;
--color-medium-gray: #9E9E9E;
--color-dark-gray: #424242;
--color-black: #212121;

/* Accent Colors */
--color-primary: #2E7D32;        /* Green: meal/positive */
--color-primary-light: #C8E6C9;  /* Light green: marked day background */
--color-secondary: #F57C00;      /* Orange: expenses/caution */
--color-accent: #1976D2;         /* Blue: interactive/CTA */
--color-destructive: #D32F2F;    /* Red: delete/danger */
--color-success: #388E3C;        /* Green: confirmation */
--color-warning: #FBC02D;        /* Yellow: attention */
--color-info: #01579B;           /* Dark blue: information */

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

/* Typography */
--font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
--font-size-xs: 0.75rem;      /* 12px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-base: 1rem;       /* 16px */
--font-size-lg: 1.125rem;     /* 18px */
--font-size-xl: 1.25rem;      /* 20px */
--font-size-2xl: 1.5rem;      /* 24px */
--font-size-3xl: 1.875rem;    /* 30px */
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Spacing */
--spacing-xs: 0.25rem;        /* 4px */
--spacing-sm: 0.5rem;         /* 8px */
--spacing-md: 1rem;           /* 16px */
--spacing-lg: 1.5rem;         /* 24px */
--spacing-xl: 2rem;           /* 32px */
--spacing-2xl: 3rem;          /* 48px */

/* Border Radius */
--radius-sm: 0.25rem;         /* 4px */
--radius-md: 0.5rem;          /* 8px */
--radius-lg: 1rem;            /* 16px */

/* Breakpoints */
--breakpoint-sm: 640px;       /* Mobile */
--breakpoint-md: 768px;       /* Tablet */
--breakpoint-lg: 1024px;      /* Desktop */
--breakpoint-xl: 1280px;      /* Large desktop */
```

---

## 2. LAYOUT ARCHITECTURE

### 2.1 Overall Page Structure

```
┌─────────────────────────────────────────────────┐
│  Header: App Title + Month Navigation           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Summary Cards (4-5 metrics)                    │
│  [Total Expenses] [Meal Days] [Meals] [Misc]   │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Primary Section: Calendar / Meal Tracker       │
│  [Calendar Grid with checkmarks]                │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Secondary Section: Daily Expenses / Form       │
│  [Expense List or Entry Form]                   │
│                                                 │
├─────────────────────────────────────────────────┤
│  Footer / Additional Navigation                 │
│  [Recurring Items, Settings, Export]            │
└─────────────────────────────────────────────────┘
```

### 2.2 Responsive Breakpoints

**Mobile (< 640px):**
- Single-column layout.
- Stacked summary cards (full width).
- Calendar takes full width.
- Expense form below calendar.
- Sticky header with month selector.

**Tablet (640px - 1024px):**
- Two-column layout possible.
- Summary cards in 2×2 grid.
- Calendar on left, daily panel on right (if space permits).
- Responsive font sizes.

**Desktop (> 1024px):**
- Three-column layout option.
- Summary cards in 1×5 row (horizontal).
- Calendar + recurring items + expense list all visible.
- Optimized spacing and padding.

---

## 3. COMPONENT DESIGN

### 3.1 Header Component

**Purpose:** Display app title, month navigation, and key actions.

**Content:**
- App logo/title (left).
- Month/year selector (center).
- Navigation buttons: ← (prev), ↻ (today), → (next).
- Action buttons: Add Expense, Settings (right).

**Styling:**
- Background: `--color-white` or `--color-off-white`.
- Border-bottom: `1px solid --color-gray`.
- Height: `60px` (mobile), `70px` (desktop).
- Padding: `--spacing-md`.
- Sticky positioning on mobile.

**Design:**

```
┌──────────────────────────────────────────────────────┐
│ 💰 Expense Tracker  │  September 2024  │  + Expense  │
│                     │ ← ↻ →            │             │
└──────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌────────────────────────────────────┐
│ Expense Tracker                    │
├────────────────────────────────────┤
│ September 2024  ← ↻ →              │
├────────────────────────────────────┤
│ + Add Expense        ⚙️ Settings   │
└────────────────────────────────────┘
```

**Interactions:**
- Month selector: Click to open date picker.
- Previous/Next/Today: Single tap, instant navigation.
- Add Expense: Opens modal or side panel.

---

### 3.2 Summary Cards Component

**Purpose:** Display high-level financial overview for the selected month.

**Metrics Displayed:**

| Card | Value | Icon | Color |
|------|-------|------|-------|
| Total Expenses | ₹6,370 | 💰 | --color-accent |
| Meal Days | 22 | 🍽️ | --color-primary |
| Meal Expenses | ₹2,200 | 🥘 | --color-primary |
| Misc Expenses | ₹3,450 | 🛒 | --color-secondary |
| Avg Daily Expense | ₹212.33 | 📊 | --color-info |

**Card Design (Individual):**

```
┌─────────────────────────────┐
│ 💰 Total Expenses          │
│                             │
│ ₹6,370                      │
│                             │
│ ↑ 5% from last month        │
└─────────────────────────────┘
```

**Layout:**
- Desktop: Horizontal row (5 cards, each ~18% width).
- Tablet: 2×3 grid (2 cards per row).
- Mobile: Vertically stacked (1 card per row).

**Styling:**
- Background: `--color-white`.
- Border: `1px solid --color-gray`.
- Border-radius: `--radius-md`.
- Padding: `--spacing-md`.
- Box-shadow: `--shadow-sm`.
- Font size (big number): `--font-size-2xl`, `--font-weight-bold`.
- Font size (label): `--font-size-sm`, `--color-medium-gray`.

**Spacing:**
- Gaps between cards: `--spacing-md`.
- Container padding: `--spacing-lg`.

**Interactions:**
- Hover: Subtle background color change (`--color-light-gray`).
- Click (optional): Drill into detailed view for that metric.

---

### 3.3 Month Navigation Component

**Purpose:** Allow users to navigate between months and select a specific month/year.

**Components:**

1. **Navigation Buttons:**
   - Previous month: `←` button (left).
   - Today: `↻` button (center).
   - Next month: `→` button (right).

2. **Month Display:**
   - Format: "September 2024" (large, bold).
   - Click to open date picker.

3. **Date Picker Modal:**
   - Year selector (dropdown or carousel).
   - Month grid (12 months, highlighting current selection).
   - "Select" button.
   - "Cancel" button.

**Styling:**
- Buttons: 
  - Background: `--color-light-gray`.
  - Border: `1px solid --color-gray`.
  - Border-radius: `--radius-md`.
  - Padding: `--spacing-sm --spacing-md`.
  - Cursor: pointer.
  - Hover: Background `--color-gray`.
  - Active: Background `--color-primary`, color white.

**Mobile:**
- Buttons stack vertically or display in a compact row.
- Month display takes full width.

**Interactions:**
- Clicking ← loads previous month (smooth transition).
- Clicking → loads next month (smooth transition).
- Clicking ↻ loads current month (smooth transition).
- Clicking "September 2024" opens date picker modal.

---

### 3.4 Calendar Component

**Purpose:** Display the month as a calendar grid with checkboxes for meal marking.

**Layout:**
- Week rows (Sun-Sat).
- Date cells (7 columns).
- Days of adjacent months grayed out.

**Cell Design:**

Each day cell should display:

```
┌─────────────────┐
│  5              │  ← Date number
│  🍽️ ✓ 🥘 ✓    │  ← Recurring item icons (marked)
│  $180           │  ← Daily meal total
│                 │
│  🛒 $70         │  ← Expense indicator + daily misc total
└─────────────────┘
```

**Cell States:**

1. **Empty Day:**
   ```
   ┌─────────┐
   │  5      │
   │         │
   └─────────┘
   ```

2. **Marked Meals (no expenses):**
   ```
   ┌─────────────────┐
   │  5              │
   │  🍽️ ✓ 🥘 ✓    │
   │  $180           │
   └─────────────────┘
   ```

3. **With Miscellaneous Expenses:**
   ```
   ┌─────────────────┐
   │  5              │
   │  🍽️ ✓           │
   │  $100           │
   │  🛒 $50         │
   └─────────────────┘
   ```

4. **Marked + Expenses:**
   ```
   ┌──────────────────┐
   │  5               │
   │  🍽️ ✓ 🥘 ✓     │
   │  $180 / 🛒 $70  │
   │  Total: $250     │
   └──────────────────┘
   ```

5. **Selected Day (focus):**
   ```
   ┌─────────────────┐
   │ 🔵 5            │  ← Blue circle indicator
   │  🍽️ ✓ 🥘 ✓    │
   │  $180 / $70     │
   │  Total: $250    │
   └─────────────────┘
   ```

**Styling:**

```css
.calendar-cell {
  border: 1px solid --color-gray;
  border-radius: --radius-md;
  padding: --spacing-md;
  background: --color-white;
  min-height: 80px;  /* mobile */
  cursor: pointer;
  transition: all 0.2s ease;
}

.calendar-cell:hover {
  background: --color-light-gray;
  box-shadow: --shadow-sm;
}

.calendar-cell.marked {
  background: --color-primary-light;  /* Light green */
  border: 2px solid --color-primary;
}

.calendar-cell.selected {
  border: 2px solid --color-accent;
  box-shadow: --shadow-md;
}

.calendar-header {
  font-weight: --font-weight-semibold;
  color: --color-medium-gray;
  text-align: center;
  padding: --spacing-md 0;
  border-bottom: 1px solid --color-gray;
}
```

**Interactions:**

1. **Click a cell:** Opens a daily detail panel (side panel or modal).
2. **In detail panel, toggle a recurring item:** Marks/unmarks that item for that date.
3. **Close detail panel:** Calendar updates to reflect changes.

**Responsive:**
- Desktop: Full calendar grid visible.
- Tablet: Calendar takes 60-70% of width; daily panel on right.
- Mobile: Calendar stacked above daily panel.

---

### 3.5 Daily Detail Panel / Modal

**Purpose:** Allow user to mark/unmark recurring items and view/add expenses for a specific day.

**Content:**

```
┌──────────────────────────────────────┐
│ September 5, 2024                    │
├──────────────────────────────────────┤
│ Recurring Meals:                     │
│ ☐ Lunch (₹100)                       │  ← Checkbox
│ ☐ Dinner (₹80)                       │
│ ☐ Tea (₹20)                          │
├──────────────────────────────────────┤
│ Daily Meal Total: ₹0                 │
├──────────────────────────────────────┤
│ Miscellaneous Expenses:              │
│ + Coffee (₹40)                       │
│ + Bus (₹30)                          │
├──────────────────────────────────────┤
│ Daily Misc Total: ₹70                │
├──────────────────────────────────────┤
│ Daily Overall Total: ₹70             │
├──────────────────────────────────────┤
│ [Add Expense]  [Close]               │
└──────────────────────────────────────┘
```

**Sections:**

1. **Date Header:**
   - Format: "September 5, 2024" (bold, large).
   - Day of week: "Monday".

2. **Recurring Meals:**
   - Checkbox for each active recurring item.
   - Item name + price.
   - Real-time calculation of daily meal total.

3. **Expenses for the Day:**
   - List of miscellaneous expenses (description, amount).
   - Delete button (trash icon) for each.
   - Real-time calculation of daily misc total.

4. **Daily Totals:**
   - Meal Total.
   - Misc Total.
   - Overall Daily Total (bold, large).

5. **Actions:**
   - "Add Expense" button (opens inline form or modal).
   - "Close" button (closes panel).

**Styling:**

```css
.daily-panel {
  background: --color-white;
  border: 1px solid --color-gray;
  border-radius: --radius-lg;
  padding: --spacing-lg;
  max-width: 400px;
  box-shadow: --shadow-lg;
}

.daily-panel-header {
  font-size: --font-size-2xl;
  font-weight: --font-weight-bold;
  margin-bottom: --spacing-lg;
  border-bottom: 1px solid --color-gray;
  padding-bottom: --spacing-md;
}

.meal-item {
  display: flex;
  align-items: center;
  padding: --spacing-sm 0;
  font-size: --font-size-base;
}

.meal-item input[type="checkbox"] {
  margin-right: --spacing-md;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.expense-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: --spacing-sm 0;
  font-size: --font-size-sm;
  border-bottom: 1px solid --color-light-gray;
}

.expense-row:hover .delete-btn {
  opacity: 1;
}

.delete-btn {
  background: transparent;
  border: none;
  color: --color-destructive;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-weight: --font-weight-semibold;
  padding: --spacing-md 0;
  margin-top: --spacing-md;
  border-top: 2px solid --color-gray;
}
```

**Interactions:**

1. **Toggle meal checkbox:** Immediately marks/unmarks that recurring item for the date.
2. **Click "Add Expense":** Opens inline form or modal to add a misc expense.
3. **Click delete icon:** Removes the expense after confirmation.
4. **Close button or click outside:** Closes panel (data auto-saves).

**Mobile vs Desktop:**

- **Mobile:** Modal that covers full screen (or 90% with padding).
- **Desktop:** Side panel that slides in from right (or appears as modal).

---

### 3.6 Expense Entry Form

**Purpose:** Allows user to add or edit a miscellaneous expense.

**Form Fields:**

1. **Date Picker:**
   - Label: "Date"
   - Input type: date
   - Default: Today
   - Format: "Sept 5, 2024"

2. **Description / Expense Name:**
   - Label: "What did you buy?"
   - Input type: text
   - Placeholder: "e.g., Coffee, Bus ticket"
   - Required: Yes

3. **Category Dropdown:**
   - Label: "Category"
   - Options: Food, Transportation, Shopping, Bills, Entertainment, Personal, Household, Other
   - Default: Food
   - Required: Yes

4. **Unit Price:**
   - Label: "Price per item"
   - Input type: number
   - Placeholder: "₹100"
   - Min: 1
   - Required: Yes

5. **Quantity:**
   - Label: "Quantity"
   - Input type: number
   - Default: 1
   - Min: 1
   - Required: Yes

6. **Total Display (Read-only):**
   - Label: "Total"
   - Value: Quantity × Unit Price (auto-calculated)
   - Format: "₹120"

7. **Notes (Optional):**
   - Label: "Notes"
   - Input type: textarea
   - Placeholder: "Optional details..."

**Form Layout:**

```
┌────────────────────────────────┐
│ Add Expense                    │
├────────────────────────────────┤
│ Date                           │
│ [Sept 5, 2024 ▼]              │
│                                │
│ What did you buy?              │
│ [Coffee_____________]          │
│                                │
│ Category                       │
│ [Food ▼]                      │
│                                │
│ Price per item                 │
│ [₹ 40_____________]           │
│                                │
│ Quantity                       │
│ [1__________________]          │
│                                │
│ Total: ₹40                     │
│                                │
│ Notes (optional)               │
│ [Notes here...]                │
│                                │
│ [Save]  [Cancel]               │
└────────────────────────────────┘
```

**Styling:**

```css
.expense-form {
  background: --color-white;
  border: 1px solid --color-gray;
  border-radius: --radius-lg;
  padding: --spacing-lg;
  max-width: 400px;
}

.form-group {
  margin-bottom: --spacing-lg;
}

.form-group label {
  display: block;
  font-size: --font-size-sm;
  font-weight: --font-weight-medium;
  margin-bottom: --spacing-sm;
  color: --color-dark-gray;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: --spacing-md;
  border: 1px solid --color-gray;
  border-radius: --radius-md;
  font-size: --font-size-base;
  font-family: --font-family-base;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: --color-accent;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

.total-display {
  font-size: --font-size-lg;
  font-weight: --font-weight-bold;
  color: --color-primary;
  text-align: right;
  margin-top: --spacing-md;
}

.form-actions {
  display: flex;
  gap: --spacing-md;
  margin-top: --spacing-lg;
}

.btn-save {
  flex: 1;
  padding: --spacing-md;
  background: --color-accent;
  color: white;
  border: none;
  border-radius: --radius-md;
  font-weight: --font-weight-semibold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover {
  background: #1565C0;  /* darker blue */
}

.btn-cancel {
  flex: 1;
  padding: --spacing-md;
  background: --color-light-gray;
  color: --color-dark-gray;
  border: 1px solid --color-gray;
  border-radius: --radius-md;
  font-weight: --font-weight-semibold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cancel:hover {
  background: --color-gray;
}
```

**Interactions:**

1. **Real-time Total Calculation:** As user changes quantity or price, total updates instantly.
2. **Form Validation:** Show error message if required fields are empty.
3. **Submit Button:** Adds expense to data and closes form.
4. **Cancel Button:** Closes form without saving.

**Placement:**
- In daily panel: Inline (show/hide form below expenses list).
- Standalone: Modal dialog or side panel.
- Mobile: Full-width modal covering calendar.

---

### 3.7 Recurring Items Management Panel

**Purpose:** Allow user to configure, edit, pause, and delete recurring meal items.

**Layout:**

```
┌────────────────────────────────────┐
│ Recurring Items                    │
├────────────────────────────────────┤
│ [+ Add Item]                       │
├────────────────────────────────────┤
│ Lunch                              │
│ ₹100/day                           │
│ ✓ Active | Edit | Delete           │
├────────────────────────────────────┤
│ Dinner                             │
│ ₹80/day                            │
│ ✓ Active | Edit | Delete           │
├────────────────────────────────────┤
│ Tea                                │
│ ₹20/day                            │
│ ✓ Active | Edit | Delete           │
└────────────────────────────────────┘
```

**Item Card Design:**

```css
.recurring-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: --spacing-md;
  border: 1px solid --color-gray;
  border-radius: --radius-md;
  background: --color-white;
  margin-bottom: --spacing-md;
  transition: all 0.2s;
}

.recurring-item:hover {
  box-shadow: --shadow-sm;
}

.item-info {
  flex: 1;
}

.item-name {
  font-weight: --font-weight-semibold;
  font-size: --font-size-base;
  margin-bottom: --spacing-xs;
}

.item-details {
  font-size: --font-size-sm;
  color: --color-medium-gray;
}

.item-actions {
  display: flex;
  gap: --spacing-md;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: --font-size-base;
  padding: --spacing-xs --spacing-sm;
  transition: all 0.2s;
}

.btn-icon:hover {
  color: --color-accent;
}

.btn-icon.delete:hover {
  color: --color-destructive;
}

.toggle-active {
  display: flex;
  align-items: center;
  gap: --spacing-sm;
  font-size: --font-size-sm;
  color: --color-medium-gray;
}
```

**Interactions:**

1. **Add Item:** Opens form to create new recurring item.
2. **Edit:** Opens form pre-populated with item details.
3. **Toggle Active:** Instantly activates/deactivates (no form needed).
4. **Delete:** Confirms deletion and removes item.

**Add/Edit Form:**

```
┌────────────────────────────────┐
│ Add Recurring Item             │
├────────────────────────────────┤
│ Item Name                      │
│ [Lunch_____________]           │
│                                │
│ Price per occurrence           │
│ [₹ 100_____________]          │
│                                │
│ Frequency                      │
│ (•) Daily  ( ) Weekly          │
│ ( ) Monthly ( ) Custom         │
│                                │
│ Start Date                     │
│ [Sept 1, 2024 ▼]              │
│                                │
│ End Date (optional)            │
│ [None ▼]                       │
│                                │
│ [Save]  [Cancel]               │
└────────────────────────────────┘
```

---

### 3.8 Settings / Preferences Panel

**Purpose:** Allow user to configure app preferences and access data management tools.

**Options:**

1. **Theme:** Light / Dark / Auto
2. **Currency:** ₹ (Rupee) / $ (Dollar) / € (Euro)
3. **Notifications:** Enable/disable reminders
4. **Data Management:**
   - Export Data (JSON download)
   - Import Data (JSON upload)
   - Clear All Data (with confirmation)
5. **About:** App version, changelog

**Layout:**

```
┌────────────────────────────────┐
│ Settings                       │
├────────────────────────────────┤
│ Display                        │
│ Theme: [Light ▼]              │
│                                │
│ Regional                       │
│ Currency: [₹ Rupee ▼]         │
│                                │
│ Notifications                  │
│ Remind me to log expenses      │
│ [☑] Enable                     │
│                                │
│ Data Management                │
│ [📥 Import Data]               │
│ [📤 Export Data]               │
│ [🗑️  Clear All Data]           │
│                                │
│ About                          │
│ Version: 1.0.0                 │
└────────────────────────────────┘
```

---

### 3.9 Modals & Dialogs

**Confirmation Modal (Delete):**

```
┌────────────────────────────────┐
│ Are you sure?                  │
│ This action cannot be undone.  │
├────────────────────────────────┤
│ [Cancel]  [Delete]             │
└────────────────────────────────┘
```

**Success Toast Notification:**

```
┌────────────────────────────────┐
│ ✓ Expense added successfully   │
│   (Auto-disappears after 3s)   │
└────────────────────────────────┘
```

**Error Toast Notification:**

```
┌────────────────────────────────┐
│ ✗ Error: Please fill all fields│
│   (Auto-disappears after 5s)   │
└────────────────────────────────┘
```

---

## 4. INTERACTION PATTERNS & WORKFLOWS

### 4.1 Workflow 1: Mark Meal Days

**User Goal:** Mark which days they purchased lunch.

**Steps:**

1. User opens app → Sees calendar for current month.
2. User clicks on "Sept 5" cell.
3. Daily panel opens (right side on desktop, modal on mobile).
4. User sees checkbox for "Lunch (₹100)".
5. User clicks checkbox → Marks ✓.
6. Daily meal total updates to ₹100.
7. Calendar cell updates to show "✓ Lunch, ₹100".
8. Summary cards update: Meal Expenses increases by ₹100.
9. User closes panel or continues marking other days.

**Visual Feedback:**
- Checkbox changes state immediately.
- Daily meal total updates in real-time.
- Calendar cell highlights in light green.
- Summary cards animate (numbers update smoothly).

---

### 4.2 Workflow 2: Add Miscellaneous Expense

**User Goal:** Record a coffee purchase.

**Steps:**

1. User clicks "Add Expense" button (or opens daily panel and clicks within it).
2. Expense form appears.
3. Date is pre-filled with today (or selected day).
4. User enters:
   - Description: "Coffee"
   - Category: "Food"
   - Price: ₹40
   - Quantity: 1
5. Total auto-calculates to ₹40.
6. User clicks "Save".
7. Form closes.
8. Expense appears in daily panel or expense list.
9. Daily misc total updates to ₹40.
10. Summary cards update: Misc Expenses increases by ₹40.

**Visual Feedback:**
- Total field updates instantly as user types.
- Form validation shows errors (if any).
- Success toast: "✓ Expense added".
- Calendar cell shows expense indicator.

---

### 4.3 Workflow 3: Change Recurring Item Price

**User Goal:** Update lunch price from ₹100 to ₹120.

**Steps:**

1. User opens "Recurring Items" panel (via footer or settings).
2. User clicks "Edit" on Lunch item.
3. Edit form opens with pre-filled data (name, price, frequency, dates).
4. User changes price from 100 to 120.
5. User clicks "Save".
6. System updates the recurring item.
7. System recalculates monthly meal total using new price (₹120 × marked days).
8. Summary cards update: Meal Expenses increases accordingly.
9. All calendar cells that have "Lunch" marked update to show new daily amounts.

**Visual Feedback:**
- Recurring items panel refreshes to show new price.
- Summary cards animate to new values.
- Toast: "✓ Item updated".

---

### 4.4 Workflow 4: Navigate Months

**User Goal:** Review August's expenses.

**Steps:**

1. User clicks "←" button or "August 2024" month selector.
2. Calendar resets.
3. System loads:
   - Meal tracker records for August.
   - Expenses for August.
4. Calendar renders with August data.
5. Summary cards update with August totals.
6. All calculations reflect August data.

**Visual Feedback:**
- Month display updates.
- Calendar smoothly transitions (fade or slide).
- Summary cards update with new numbers.

---

### 4.5 Workflow 5: Export Data

**User Goal:** Backup all data to local file.

**Steps:**

1. User opens Settings.
2. User clicks "Export Data".
3. System generates JSON file with all recurring items, meal tracker, and expenses.
4. File download triggered (browser's file dialog).
5. User saves file to computer.

**Visual Feedback:**
- Toast: "✓ Data exported. Check your downloads."

---

## 5. VISUAL FEEDBACK & ANIMATIONS

### 5.1 Transitions

**Page Changes:**
- Fade in/out (200ms ease-in-out).
- or Slide left/right for month navigation (300ms ease-out).

**Modal Opens:**
- Fade in + scale (0.95 → 1) (200ms).

**Modal Closes:**
- Scale (1 → 0.95) + fade out (150ms).

**Number Updates:**
- Highlight effect: Brief yellow background, fade to transparent (500ms).
- Or: Animate number change with tween (e.g., 100 → 120 over 300ms).

**Checkbox Toggle:**
- Instant visual change.
- Ripple effect (optional) on click.

---

### 5.2 Micro-interactions

**Button Hover:**
- Background color change.
- Slight shadow increase.
- Cursor pointer.

**Button Click:**
- Subtle scale-down (0.98) for tactile feedback.
- Restore to 1 on release.

**Form Input Focus:**
- Border color change to accent.
- Subtle box-shadow with accent color.

**List Item Hover:**
- Background color lighten.
- Delete button appears (opacity increase).

---

## 6. ACCESSIBILITY

### 6.1 Keyboard Navigation

- Tab through all interactive elements in logical order.
- Enter/Space to activate buttons and checkboxes.
- Arrow keys to navigate date picker.
- Escape to close modals.

### 6.2 Color Contrast

- All text should have WCAG AA contrast ratio (4.5:1 minimum).
- Avoid color as the only indicator (use icons + text).

### 6.3 Screen Reader Support

- All buttons and form labels have clear `aria-label` or associated `<label>`.
- Form error messages announced via `aria-live`.
- Modal has proper `role="dialog"` and `aria-modal="true"`.
- Landmark roles: `<header>`, `<main>`, `<aside>`, `<footer>`.

### 6.4 Mobile Accessibility

- Touch targets at least 48×48px.
- Clear focus indicators on interactive elements.
- Readable font sizes (min 16px for body text).

---

## 7. RESPONSIVE DESIGN DETAILS

### 7.1 Mobile (< 640px)

```
┌──────────────────────────┐
│ Header (Sticky)          │
│ Expense Tracker ← ↻ →    │
├──────────────────────────┤
│ Summary Cards (Stacked)  │
│ ┌────────────────────────┐ x5
│ │ Total: ₹6,370          │
│ └────────────────────────┘
├──────────────────────────┤
│ Calendar (Full Width)    │
│ ┌────────────────────────┐
│ │   Su Mo Tu We Th Fr Sa │
│ │          1  2  3  4  5 │
│ │    [5] [6] [7] ...     │
│ └────────────────────────┘
├──────────────────────────┤
│ Add Expense Button       │
│ [+ Add Expense]          │
├──────────────────────────┤
│ Recurring Items          │
│ [Lunch] [Edit] [Delete]  │
└──────────────────────────┘
```

**Key Changes:**
- Single column.
- Stacked summary cards (1 per row).
- Full-width calendar.
- Daily panel as full-screen modal.
- Expense form as modal (max-width 90vw).
- Bottom navigation or hamburger menu for settings.

### 7.2 Tablet (640px - 1024px)

```
┌────────────────────────────────────┐
│ Header                             │
├────────────────────────────────────┤
│ Summary Cards (2×3 Grid)           │
│ ┌───────────┐ ┌───────────┐        │
│ │ Total     │ │ Meals     │        │
│ └───────────┘ └───────────┘        │
├────────────────────────────────────┤
│ Calendar (60%)  │ Daily Panel (40%)│
│                 │                  │
│                 │ [Sept 5]         │
│                 │ ☐ Lunch  ₹100   │
│                 │ ☐ Dinner ₹80    │
│                 │ ---              │
│                 │ ☐ Coffee ₹40    │
│                 │ [Add Expense]    │
│                 │                  │
└────────────────────────────────────┘
```

**Key Changes:**
- Two-column layout (calendar + daily panel).
- Summary cards in 2×3 or 1×5 grid.
- Calendar on left; daily panel visible on right.

### 7.3 Desktop (> 1024px)

```
┌──────────────────────────────────────────────┐
│ Header                                       │
├──────────────────────────────────────────────┤
│ Summary Cards (1×5 Horizontal Row)           │
│ [Total] [Meals] [Misc] [Avg] [Days]          │
├──────────────────────────────────────────────┤
│ Calendar (50%) │ Daily Panel (25%) │ Recurring │
│                │                   │ Items (25%)│
│ [Calendar Grid]│ [Sept 5]          │ [Lunch]   │
│                │ Meal Tracker      │ [Edit]    │
│                │ Expenses          │ [Delete]  │
│                │ Daily Total       │           │
└──────────────────────────────────────────────┘
```

**Key Changes:**
- Three-column layout.
- Summary cards in single row.
- All sections visible simultaneously.
- Optimized spacing and padding.

---

## 8. DARK MODE (Optional)

**Color Overrides for Dark Mode:**

```css
:root[data-theme="dark"] {
  --color-white: #121212;
  --color-off-white: #1E1E1E;
  --color-light-gray: #2C2C2C;
  --color-gray: #3C3C3C;
  --color-medium-gray: #A0A0A0;
  --color-dark-gray: #E0E0E0;
  --color-black: #FFFFFF;
  
  /* Keep accent colors bright for visibility */
  --color-primary: #66BB6A;
  --color-secondary: #FFA726;
  --color-accent: #42A5F5;
}
```

**Apply throughout:**
- All component backgrounds adapt.
- Text colors adapt.
- Shadows become more subtle.
- Accent colors brighten slightly for contrast.

---

## 9. IMPLEMENTATION CHECKLIST

### Phase 1: Layout & Structure
- [ ] Create header component with month navigation.
- [ ] Build summary cards component.
- [ ] Implement calendar grid layout.
- [ ] Create responsive layout (mobile/tablet/desktop).

### Phase 2: Calendar Interaction
- [ ] Implement calendar cell rendering.
- [ ] Build daily detail panel.
- [ ] Add meal checkbox toggle (mark/unmark).
- [ ] Implement cell state display (marked, expenses, etc.).

### Phase 3: Expense Management
- [ ] Build expense entry form.
- [ ] Implement form validation.
- [ ] Create expense list display.
- [ ] Add edit/delete functionality for expenses.

### Phase 4: Recurring Items
- [ ] Build recurring items panel.
- [ ] Implement add/edit recurring item form.
- [ ] Add toggle active/inactive.
- [ ] Implement delete with confirmation.

### Phase 5: Polish & Accessibility
- [ ] Add transitions and animations.
- [ ] Implement toast notifications.
- [ ] Add accessibility features (ARIA, keyboard nav).
- [ ] Test responsive design across devices.
- [ ] Implement dark mode (optional).

### Phase 6: Advanced Features
- [ ] Build settings panel.
- [ ] Implement export/import.
- [ ] Add data visualization (charts).
- [ ] Optimize performance.

---

## 10. COMPONENT LIBRARY TOOLS

**Recommended Frameworks/Libraries:**

- **React:** For component-based UI.
- **Tailwind CSS:** For utility-based styling.
- **Headless UI / Radix UI:** For accessible components (modals, dialogs, dropdowns).
- **date-fns / dayjs:** For date handling.
- **Zustand / Redux:** For state management.
- **Framer Motion:** For smooth animations (optional).

---

## 11. FILE STRUCTURE (React Example)

```
src/
├── components/
│   ├── Header.jsx
│   ├── SummaryCards.jsx
│   ├── Calendar.jsx
│   ├── DailyPanel.jsx
│   ├── ExpenseForm.jsx
│   ├── RecurringItemsPanel.jsx
│   ├── SettingsPanel.jsx
│   └── Modals/
│       ├── ConfirmationModal.jsx
│       └── ToastNotification.jsx
├── hooks/
│   ├── useExpenses.js
│   ├── useMealTracker.js
│   ├── useRecurringItems.js
│   └── useMonthNavigation.js
├── utils/
│   ├── calculations.js
│   ├── storage.js
│   ├── dateHelpers.js
│   └── validation.js
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── components/
├── App.jsx
└── index.js
```

---

**End of UI Implementation Prompt**
