# MobileShop POS — Full Product Requirements & Execution Plan

## What This Is

A web-based Point of Sale and Shop Management System for a physical mobile phone shop in Pakistan. The shopkeeper uses this to manage their stock, record sales by clicking a Sell button, track who owes them money (udhar), log expenses, and see reports. There is no barcode scanning. There is no ecommerce. This is purely an internal shop management tool.

The product has two parts:
1. A clean minimal landing page (public-facing) with a button that goes to the dashboard
2. The full dashboard/app (the actual POS system)

Built with Next.js, deployed on Vercel, database is Neon PostgreSQL. Light theme only. Clean and minimal — not generic, not AI-looking, not Bootstrap default.

---

## Tech Stack

- Next.js (App Router)
- Neon PostgreSQL (serverless) via `@neondatabase/serverless`
- Tailwind CSS
- shadcn/ui for components and charts
- Lucide React for icons
- React Hook Form + Zod for form validation
- date-fns for date formatting
- next/navigation for routing

---

## Database Schema

### stock
```sql
id              SERIAL PRIMARY KEY
brand           TEXT NOT NULL
model           TEXT NOT NULL
variant         TEXT
condition       TEXT CHECK (condition IN ('New','Refurbished','Open Box'))
purchase_price  NUMERIC(10,2) NOT NULL
selling_price   NUMERIC(10,2) NOT NULL
quantity        INTEGER NOT NULL DEFAULT 0
low_stock_alert INTEGER NOT NULL DEFAULT 2
imei            TEXT
notes           TEXT
date_added      DATE NOT NULL DEFAULT CURRENT_DATE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### sales
```sql
id              SERIAL PRIMARY KEY
customer_name   TEXT NOT NULL DEFAULT 'Walk-in'
payment_method  TEXT NOT NULL
total_amount    NUMERIC(10,2) NOT NULL
total_profit    NUMERIC(10,2) NOT NULL
total_cost      NUMERIC(10,2) NOT NULL
is_udhar        BOOLEAN DEFAULT FALSE
sale_date       DATE NOT NULL DEFAULT CURRENT_DATE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### sale_items
```sql
id              SERIAL PRIMARY KEY
sale_id         INTEGER REFERENCES sales(id) ON DELETE CASCADE
stock_id        INTEGER REFERENCES stock(id)
brand           TEXT NOT NULL
model           TEXT NOT NULL
variant         TEXT
purchase_price  NUMERIC(10,2) NOT NULL
sale_price      NUMERIC(10,2) NOT NULL
quantity        INTEGER NOT NULL
subtotal        NUMERIC(10,2) NOT NULL
profit          NUMERIC(10,2) NOT NULL
```

### udhar
```sql
id              SERIAL PRIMARY KEY
sale_id         INTEGER REFERENCES sales(id)
customer_name   TEXT NOT NULL
customer_phone  TEXT NOT NULL
phone_sold      TEXT
total_amount    NUMERIC(10,2) NOT NULL
paid_amount     NUMERIC(10,2) NOT NULL DEFAULT 0
remaining       NUMERIC(10,2) NOT NULL
due_date        DATE
notes           TEXT
status          TEXT DEFAULT 'Unpaid' CHECK (status IN ('Unpaid','Partial','Paid'))
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### udhar_payments
```sql
id              SERIAL PRIMARY KEY
udhar_id        INTEGER REFERENCES udhar(id) ON DELETE CASCADE
amount_paid     NUMERIC(10,2) NOT NULL
payment_date    DATE NOT NULL DEFAULT CURRENT_DATE
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### expenses
```sql
id              SERIAL PRIMARY KEY
description     TEXT NOT NULL
amount          NUMERIC(10,2) NOT NULL
category        TEXT NOT NULL
expense_date    DATE NOT NULL DEFAULT CURRENT_DATE
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### settings
```sql
id              INTEGER PRIMARY KEY DEFAULT 1
shop_name       TEXT DEFAULT 'My Mobile Shop'
owner_name      TEXT
phone_number    TEXT
address         TEXT
city            TEXT
receipt_footer  TEXT DEFAULT 'Thank you for your purchase!'
currency_label  TEXT DEFAULT 'Rs'
```

---

## Application Structure

```
/                        → Landing page (public)
/dashboard               → Main dashboard
/dashboard/stock         → Stock management
/dashboard/sales         → Sales history
/dashboard/udhar         → Udhar khata
/dashboard/expenses      → Expenses
/dashboard/reports       → Reports & charts
/dashboard/settings      → Settings
/api/stock               → Stock API routes
/api/sales               → Sales API routes
/api/udhar               → Udhar API routes
/api/expenses            → Expenses API routes
/api/reports             → Reports API routes
/api/settings            → Settings API routes
```

---

## Landing Page — Full Specification

Single page at `/`. Clean and minimal. Light background. No heavy colors. No animations overload.

Content on the page:
- Shop name or product name at the top (pulled from settings, fallback "MobileShop POS")
- One line description: "Complete shop management for mobile retailers"
- One primary button: "Go to Dashboard" — navigates to /dashboard
- Below the button, 4 to 6 small feature highlights in a simple grid: Stock Management, Sales Tracking, Udhar Khata, Expense Tracking, Reports & Charts, Print Receipts
- Footer with shop name

That is it. No hero images. No carousels. No heavy design. Just clean, readable, professional.

---

## Dashboard Layout — All Inner Pages

All routes under `/dashboard/*` share the same layout:
- Left sidebar (fixed, always visible on desktop)
- Top bar with current page title and today's date
- Main content area (scrollable)
- On mobile: sidebar collapses, bottom navigation bar appears with icons for main sections

### Sidebar navigation items:
- Dashboard (home icon)
- Stock (package icon)
- Sales (receipt icon)
- Udhar Khata (wallet icon)
- Expenses (banknote icon)
- Reports (bar chart icon)
- Settings (gear icon) — at bottom of sidebar

---

## Page Specifications

---

### Dashboard `/dashboard`

Data fetched on load: today's sales summary, stock summary, udhar summary, top models this month, recent sales, low stock items.

**6 stat cards:**
- Today's Sales — total Rs amount of all sales today
- Today's Transactions — count of sales today
- This Month Revenue — total sales amount this calendar month
- Total Stock Value — sum of (selling_price × quantity) for all stock
- Total Phones in Stock — sum of all quantities
- Outstanding Udhar — sum of all remaining balances where status is not Paid

**Low Stock Alerts section:**
Table showing all phones where quantity <= low_stock_alert. Columns: Brand, Model, Variant, Qty Left, Alert Threshold. If none, show empty state "All stock levels are healthy". Each row has a button to jump to that item in the stock page.

**Recent Sales section:**
Last 5 sales. Columns: Time, Customer, Items (model names), Total Amount, Payment Method badge. Each row clickable to see full sale detail in a modal.

**Top Selling Models This Month:**
shadcn BarChart. Horizontal bars. Top 5 or 6 models. X axis is units sold. Model name on Y axis.

**Recent Udhar section:**
Last 3 udhar entries that are Unpaid or Partial, sorted by due date ascending (most urgent first). Shows: Customer name, phone, remaining amount, due date, days overdue if applicable.

---

### Stock Management `/dashboard/stock`

**Summary strip above table:**
Total models | Total units | Stock value at cost | Stock value at selling price | Potential profit

**Filters (all live — no submit button):**
- Text search (brand, model, variant, IMEI)
- Brand dropdown (dynamically generated from existing brands)
- Condition dropdown (All / New / Refurbished / Open Box)
- Status dropdown (All / In Stock / Low Stock / Out of Stock)
- Sort (Newest / Oldest / Price High-Low / Price Low-High / Qty High-Low)

**Table columns:**
Brand | Model | Variant | Condition | Purchase Price | Selling Price | Qty | Status | Date Added | Actions

Status badge logic: quantity = 0 → Out of Stock (red). quantity <= low_stock_alert → Low Stock (yellow). quantity > low_stock_alert → In Stock (green).

**Row actions:**
- Sell button (primary) — opens Sell Modal
- Edit button — opens Edit Modal with all fields pre-filled
- Adjust Qty button — opens small modal to add or subtract quantity with a reason note. Used for restocking or writing off damaged units
- Delete button — confirmation modal, warns if this item has sales history

**Add Phone Modal (opened by Add Phone button top right):**
Fields: Brand, Model, Variant, Condition, Purchase Price, Selling Price (shows live profit margin % as you type), Quantity, Low Stock Alert threshold, IMEI (optional), Date Added (default today), Notes (optional). Saves via POST /api/stock.

**Sell Modal (opened from row Sell button):**
Header shows: phone name, current stock qty.
Fields:
- Quantity to sell (number, cannot exceed current qty)
- Customer Name (text, default Walk-in)
- Payment Method (Cash / Card / Easypaisa / JazzCash / Bank Transfer / Udhar)
- Sale Price per unit (pre-filled with selling_price, editable for discounts)
- Discount (auto-calculated and shown read-only)

If Payment Method is set to Udhar, additional fields appear:
- Customer Phone (required)
- Amount Paid Upfront (number, can be 0)
- Due Date (date)
- Notes

On Complete Sale: POST /api/sales in a single DB transaction that inserts into sales, inserts into sale_items, decrements stock quantity, and if udhar inserts into udhar table. Returns error if qty would go below 0. On success: toast notification, modal closes, table refreshes.

Multiple items in one sale: The Sell Modal allows adding more than one item from stock. There is an "Add Another Item" button that adds a second row with its own stock selector, qty, and price. All items are submitted together as one sale with one receipt.

---

### Sales History `/dashboard/sales`

**Summary bar:**
Total revenue in current filter | Total units sold | Total profit | Average sale value

**Filters:**
- Date range pickers (From / To)
- Quick buttons: Today / This Week / This Month / Last Month
- Payment Method dropdown
- Search (customer name or model name)

**Table columns:**
Date | Time | Customer | Items | Total Amount | Payment Method | Profit | Actions

Items column shows model names comma separated if multiple items in one sale.

**Row actions:**
- View — opens Sale Detail Modal
- Delete — confirmation modal with warning that stock quantity will NOT be restored automatically

**Sale Detail Modal:**
Shows all items in the sale, each with model, variant, qty, price per unit, subtotal. Shows total, payment method, customer, date. Shows profit (internal view only, not on printed receipt). Has Print Receipt button.

**Print Receipt:**
window.print() with print CSS that hides everything except the receipt. Receipt format:
- Shop name and address centered at top (from settings)
- Phone number of shop
- Divider
- Date and time of sale
- Customer name
- Table: Item | Qty | Unit Price | Subtotal
- Divider
- Total Amount
- Payment Method
- Divider
- Footer message from settings

---

### Udhar Khata `/dashboard/udhar`

**4 summary cards:**
- Total Outstanding (sum of all remaining where status != Paid)
- Active Debtors (count of records where status != Paid)
- Overdue Amount (remaining where due_date < today and status != Paid)
- Collected This Month (sum of udhar_payments.amount_paid this month)

**Filters:**
- Search (customer name or phone)
- Status (All / Unpaid / Partial / Paid)
- Due filter (All / Overdue / Due This Week / Due This Month)

**Table columns:**
Customer | Phone | Phone Sold | Total | Paid | Remaining | Date Given | Due Date | Status | Overdue | Actions

Rows where due_date < today and status != Paid get a subtle red row background. Overdue column shows number of days overdue in red. Status badges: Unpaid red, Partial yellow, Paid green.

**Row actions:**
- Add Payment — opens payment modal
- History — shows all payment installments for this customer
- Edit — edit the udhar record details
- Delete — deletes the udhar entry and all payment history, with confirmation

**Add Udhar Button (for manual entries not linked to a sale):**
Modal fields: Customer Name, Customer Phone, Phone Sold (text description), Total Amount, Paid Upfront, Due Date, Notes.

**Add Payment Modal:**
Shows current status: total, already paid, remaining. Fields: Amount Received, Payment Date (default today), Notes. On save: inserts into udhar_payments, recalculates remaining on udhar record, auto-updates status. If remaining becomes 0, status becomes Paid.

**Payment History Modal:**
Table: Date | Amount Paid | Notes | Running Total Paid after this payment.

---

### Expenses `/dashboard/expenses`

**Summary:**
This Month total | This Year total | Breakdown by category shown as a small list

**Filters:**
- Date range (From / To)
- Quick buttons: This Month / Last Month
- Category dropdown
- Search by description

**Table columns:**
Date | Description | Category | Amount | Notes | Actions (Edit / Delete)

**Add Expense Modal:**
Fields: Description, Amount, Category (Rent / Electricity / Salary / Transport / Stock Purchase / Repair & Maintenance / Marketing / Other), Date (default today), Notes.

---

### Reports `/dashboard/reports`

**Period selector:**
Today / This Week / This Month / Last Month / Custom (shows two date pickers). All data and charts re-fetch when period changes.

**7 KPI cards:**
Total Revenue | Cost of Goods Sold | Total Expenses | Gross Profit | Net Profit | Units Sold | Average Sale Value

Gross Profit = Revenue minus Cost of Goods Sold
Net Profit = Gross Profit minus Total Expenses in period

**Chart 1 — Revenue and Profit Trend:**
shadcn AreaChart. X axis = dates in period. Two areas: Revenue (top) and Profit (filled below). Shows the trend of income and how much was kept as profit over time.

**Chart 2 — Top Selling Models:**
shadcn BarChart horizontal. Top 10 models by units sold in period. Y axis = model name. X axis = units sold.

**Chart 3 — Payment Method Breakdown:**
shadcn PieChart or DonutChart. Each slice is one payment method. Shows percentage and Rs amount per method.

**Chart 4 — Expenses by Category:**
shadcn BarChart vertical. Each bar is an expense category. Shows how much was spent per category in the period.

**Table — Daily Breakdown:**
Date | Transactions | Units Sold | Revenue | Cost | Profit

**Table — Model Performance:**
Model | Units Sold | Revenue | Total Cost | Profit | Margin %

**Export CSV button:**
Downloads sales in selected period. Columns: Date, Customer, Model, Qty, Purchase Price, Sale Price, Profit, Payment Method.

---

### Settings `/dashboard/settings`

**Shop Information form:**
Shop Name | Owner Name | Phone Number | Address | City | Receipt Footer Message | Currency Label (default Rs)
One Save button. PUT /api/settings.

**Data Management:**
- Export All Data button — downloads full JSON of all tables as backup file
- Import Data button — file input to upload JSON backup, restores all data with a warning modal first
- Clear All Data button — shows confirmation modal requiring user to type the word DELETE before wiping all tables

---

## API Routes — Complete List

### /api/stock
- GET — query params: search, brand, condition, status, sort, page, limit
- POST — add new stock item
- PUT /api/stock/[id] — update stock item
- DELETE /api/stock/[id] — delete stock item
- PATCH /api/stock/[id]/adjust — adjust qty with reason

### /api/sales
- GET — query params: from, to, payment_method, search, page, limit
- POST — create sale (transaction: insert sale + sale_items + decrement stock + optional udhar)
- DELETE /api/sales/[id] — delete sale and its items
- GET /api/sales/[id] — get single sale with all items
- GET /api/sales/summary — today total, month total, profit, units

### /api/udhar
- GET — query params: status, search, overdue, page, limit
- POST — create udhar entry
- PUT /api/udhar/[id] — update udhar details
- DELETE /api/udhar/[id] — delete udhar and all payments
- POST /api/udhar/[id]/payment — add payment, recalculate remaining, update status
- GET /api/udhar/[id]/payments — get payment history
- GET /api/udhar/summary — outstanding total, overdue amount, collected this month

### /api/expenses
- GET — query params: from, to, category, search, page, limit
- POST — add expense
- PUT /api/expenses/[id] — edit expense
- DELETE /api/expenses/[id] — delete expense

### /api/reports/summary
- GET — query params: period (today/week/month/lastmonth/custom), from, to
- Returns: revenue, cost_of_goods, expenses_total, gross_profit, net_profit, units_sold, avg_sale_value

### /api/reports/daily-sales
- GET — query params: from, to
- Returns: array of { date, revenue, profit, transactions, units }

### /api/reports/top-models
- GET — query params: from, to, limit
- Returns: array of { model, brand, units_sold, revenue, profit }

### /api/reports/payment-methods
- GET — query params: from, to
- Returns: array of { method, count, total_amount }

### /api/reports/expenses-by-category
- GET — query params: from, to
- Returns: array of { category, total }

### /api/settings
- GET — returns settings row
- PUT — update settings

---

## Business Logic Rules

1. A sale POST is always a single PostgreSQL transaction. If stock quantity would go below 0, the whole transaction is rejected with an error.
2. Profit is calculated and stored at time of sale using the purchase_price from stock at that exact moment. Never recalculated later.
3. Udhar status is always derived: remaining = 0 → Paid, 0 < remaining < total_amount → Partial, remaining = total_amount → Unpaid. Status is recalculated and stored every time a payment is added.
4. Udhar entries created from a sale (is_udhar = true) are created inside the same sale transaction.
5. Deleting a sale does NOT automatically restore stock. The shopkeeper must manually adjust stock if needed.
6. Stock quantity can never go below 0. This is enforced at the API level, not just the frontend.
7. All money is stored as NUMERIC(10,2) in the DB and displayed as Rs X,XXX in the UI.
8. All dates stored as DATE in DB, displayed as DD/MM/YYYY in the UI.
9. Tables are paginated at 20 rows per page. All filtering and pagination happens server-side via API query params.
10. The settings table always has exactly one row (id = 1). Use INSERT ... ON CONFLICT DO UPDATE for settings.

---

## Execution Plan — Phase by Phase

The agent should build and fully complete each phase before moving to the next. Each phase is independently functional and testable.

---

### Phase 1 — Foundation

What to build:
- Neon PostgreSQL connection setup using @neondatabase/serverless
- All database tables created (migration file or setup script)
- Settings table seeded with one default row
- Next.js app router folder structure set up
- Shared layout component with sidebar and top bar
- Mobile responsive layout with bottom tab navigation
- Reusable UI primitives: Button, Modal, Badge, Toast, Input, Select, Table, EmptyState, StatCard, LoadingSpinner
- Landing page at `/` — minimal, clean, with Go to Dashboard button

Deliverable: App loads, landing page works, clicking Go to Dashboard shows the sidebar layout with empty pages, DB is connected and tables exist.

---

### Phase 2 — Stock Management

What to build:
- GET /api/stock with all filter and sort query params
- POST /api/stock
- PUT /api/stock/[id]
- DELETE /api/stock/[id]
- PATCH /api/stock/[id]/adjust
- Full stock page at /dashboard/stock
- Add Phone Modal with all fields and live profit margin % display
- Stock table with all columns, status badges, and all filters working live
- Summary strip above table
- Edit Modal
- Adjust Qty Modal
- Delete confirmation
- Sell Modal with single item — quantity validation, payment method, sale price editing, udhar toggle with extra fields
- POST /api/sales complete with DB transaction (sales + sale_items + stock decrement + optional udhar insert)

Deliverable: Shopkeeper can add phones, see them in the table with correct status badges, filter and search, and sell a phone which decrements stock and saves the sale.

---

### Phase 3 — Sales History

What to build:
- GET /api/sales with all filter params and pagination
- GET /api/sales/[id] for single sale detail
- DELETE /api/sales/[id]
- GET /api/sales/summary
- Full sales page at /dashboard/sales
- Summary bar with totals for current filter
- All filters working (date range, quick buttons, payment method, search)
- Sales table with all columns
- Sale Detail Modal showing all items in the sale
- Print Receipt — window.print() with print CSS that shows only the receipt with shop info from settings

Deliverable: All sales are visible, filterable, detailed view works, receipt prints correctly.

---

### Phase 4 — Udhar Khata

What to build:
- GET /api/udhar with filters
- POST /api/udhar
- PUT /api/udhar/[id]
- DELETE /api/udhar/[id]
- POST /api/udhar/[id]/payment
- GET /api/udhar/[id]/payments
- GET /api/udhar/summary
- Full udhar page at /dashboard/udhar
- All 4 summary cards
- Udhar table with overdue highlighting, status badges, days overdue
- All filters
- Add Udhar Modal (manual entry)
- Add Payment Modal with auto status recalculation
- Payment History Modal
- Edit and Delete with confirmations

Deliverable: Full udhar tracking working. Shopkeeper can add credit sales, collect payments, see who is overdue, and view full payment history per customer.

---

### Phase 5 — Expenses

What to build:
- GET /api/expenses with filters
- POST /api/expenses
- PUT /api/expenses/[id]
- DELETE /api/expenses/[id]
- Full expenses page at /dashboard/expenses
- Summary bar
- Expense table with all columns
- Add Expense Modal
- Edit and Delete with confirmations
- All filters working

Deliverable: Shopkeeper can log and manage all shop expenses.

---

### Phase 6 — Reports & Charts

What to build:
- GET /api/reports/summary
- GET /api/reports/daily-sales
- GET /api/reports/top-models
- GET /api/reports/payment-methods
- GET /api/reports/expenses-by-category
- Full reports page at /dashboard/reports
- Period selector with all options including custom date range
- 7 KPI cards
- All 4 charts using shadcn charts: AreaChart for trend, horizontal BarChart for top models, PieChart for payment methods, vertical BarChart for expenses by category
- Daily breakdown table
- Model performance table with margin %
- CSV export button

Deliverable: Full reporting working. Shopkeeper can see profit, loss, best products, and payment trends for any time period.

---

### Phase 7 — Dashboard & Settings

What to build:
- GET /api/settings and PUT /api/settings
- Settings page at /dashboard/settings with all sections
- Data export (JSON download of all tables)
- Data import (JSON upload and restore)
- Clear all data with DELETE confirmation input
- Full dashboard page at /dashboard
- All 6 stat cards pulling from respective summary APIs
- Low stock alerts table
- Recent sales section
- Top selling models chart (reuse from reports)
- Recent udhar section

Deliverable: The full product is complete. Dashboard shows live overview of the shop. Settings allows shop customization and data backup.

---

## What This Does NOT Include

- No login or authentication
- No barcode scanning
- No SMS or WhatsApp integration
- No ecommerce
- No multi-branch or multi-user
- No supplier management
- No repair or service tickets