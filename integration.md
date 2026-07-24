# MobileShop POS — Project Requirements

## Project Context

Next.js app deployed on Vercel. Database is Neon PostgreSQL (serverless). All data operations go through Next.js API routes that connect to Neon. No authentication — single shop, single user. No local storage. Everything in the database.

---

## Database Schema

### Table: stock
```sql
id              SERIAL PRIMARY KEY
brand           TEXT NOT NULL
model           TEXT NOT NULL
variant         TEXT          -- color, storage e.g. "Black 256GB"
condition       TEXT          -- 'New', 'Refurbished', 'Open Box'
purchase_price  NUMERIC NOT NULL
selling_price   NUMERIC NOT NULL
quantity        INTEGER NOT NULL DEFAULT 0
low_stock_alert INTEGER NOT NULL DEFAULT 2
imei            TEXT          -- optional, for individual unit tracking
notes           TEXT
date_added      DATE NOT NULL DEFAULT CURRENT_DATE
```

### Table: sales
```sql
id              SERIAL PRIMARY KEY
stock_id        INTEGER REFERENCES stock(id)
brand           TEXT NOT NULL   -- stored at time of sale (in case stock deleted)
model           TEXT NOT NULL
variant         TEXT
quantity_sold   INTEGER NOT NULL
purchase_price  NUMERIC NOT NULL  -- cost at time of sale
sale_price      NUMERIC NOT NULL  -- actual price sold at
total_amount    NUMERIC NOT NULL  -- sale_price * quantity_sold
profit          NUMERIC NOT NULL  -- (sale_price - purchase_price) * quantity_sold
payment_method  TEXT NOT NULL  -- 'Cash', 'Card', 'Easypaisa', 'JazzCash', 'Bank Transfer'
customer_name   TEXT DEFAULT 'Walk-in'
is_udhar        BOOLEAN DEFAULT FALSE
sale_date       DATE NOT NULL DEFAULT CURRENT_DATE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Table: udhar
```sql
id              SERIAL PRIMARY KEY
customer_name   TEXT NOT NULL
customer_phone  TEXT NOT NULL
sale_id         INTEGER REFERENCES sales(id)
phone_sold      TEXT          -- description of what was sold
total_amount    NUMERIC NOT NULL
paid_amount     NUMERIC NOT NULL DEFAULT 0
remaining       NUMERIC NOT NULL  -- total_amount - paid_amount
due_date        DATE
notes           TEXT
status          TEXT DEFAULT 'Unpaid'  -- 'Unpaid', 'Partial', 'Paid'
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Table: udhar_payments
```sql
id              SERIAL PRIMARY KEY
udhar_id        INTEGER REFERENCES udhar(id)
amount_paid     NUMERIC NOT NULL
payment_date    DATE NOT NULL DEFAULT CURRENT_DATE
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Table: expenses
```sql
id              SERIAL PRIMARY KEY
description     TEXT NOT NULL
amount          NUMERIC NOT NULL
category        TEXT NOT NULL
expense_date    DATE NOT NULL DEFAULT CURRENT_DATE
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Table: settings
```sql
id              SERIAL PRIMARY KEY
shop_name       TEXT DEFAULT 'My Mobile Shop'
owner_name      TEXT
phone_number    TEXT
address         TEXT
city            TEXT
receipt_footer  TEXT DEFAULT 'Thank you for your purchase!'
currency_label  TEXT DEFAULT 'Rs'
```

---

## API Routes (all under /api)

### Stock
- `GET    /api/stock` — fetch all stock, supports query params: `search`, `brand`, `condition`, `status` (instock/low/out), `sort`
- `POST   /api/stock` — add new phone to stock
- `PUT    /api/stock/[id]` — edit phone details
- `DELETE /api/stock/[id]` — delete stock item (only if no sales reference it, else soft-warn)
- `PATCH  /api/stock/[id]/adjust` — manually adjust quantity (increase for restocking, decrease for damage/loss)

### Sales
- `GET    /api/sales` — fetch all sales, supports: `from`, `to`, `payment_method`, `search`, `month`
- `POST   /api/sales` — create a sale. This must: insert into sales, decrement stock quantity, if is_udhar=true also insert into udhar
- `DELETE /api/sales/[id]` — delete sale record (does NOT restore stock — manual adjustment needed)
- `GET    /api/sales/summary` — returns today total, month total, total profit, total units sold

### Udhar
- `GET    /api/udhar` — fetch all udhar records, supports: `status`, `search`, `overdue`
- `POST   /api/udhar` — add manual udhar entry (not linked to a sale)
- `PUT    /api/udhar/[id]` — edit udhar details
- `DELETE /api/udhar/[id]` — delete udhar record and all its payments
- `POST   /api/udhar/[id]/payment` — add a payment installment, recalculates remaining, updates status
- `GET    /api/udhar/[id]/payments` — get all payment history for one udhar entry
- `GET    /api/udhar/summary` — total outstanding, overdue count, collected this month

### Expenses
- `GET    /api/expenses` — fetch all expenses, supports: `from`, `to`, `category`, `search`
- `POST   /api/expenses` — add expense
- `PUT    /api/expenses/[id]` — edit expense
- `DELETE /api/expenses/[id]` — delete expense

### Reports
- `GET    /api/reports/summary` — accepts `period` (today/week/month/lastmonth/custom with from+to). Returns: revenue, cost_of_goods, expenses_total, gross_profit, net_profit, units_sold
- `GET    /api/reports/daily-sales` — returns day-by-day revenue and profit for chart (for given period)
- `GET    /api/reports/top-models` — top selling phone models by units and revenue
- `GET    /api/reports/payment-methods` — breakdown of sales by payment method
- `GET    /api/reports/stock-value` — current total stock value at cost and at selling price

### Settings
- `GET    /api/settings` — fetch shop settings
- `PUT    /api/settings` — update shop settings

---

## Pages & Full Functionality

---

### Page: Dashboard `/`

Fetches from `/api/sales/summary`, `/api/udhar/summary`, `/api/stock`, `/api/reports/top-models`.

**Stats row — 6 cards:**
- Today's Sales (Rs amount)
- Today's Transactions (count)
- Total Stock Value (at selling price)
- Total Phones in Stock (sum of all quantities)
- This Month Revenue
- Total Outstanding Udhar (all unpaid + partial balances)

**Low Stock Table:**
Phones where quantity <= low_stock_alert. Columns: Brand, Model, Variant, Qty Left, Alert Level. Action button per row that navigates to that item in stock page. If no low stock items show a clean empty state.

**Recent Sales (last 5):**
Date/time, customer name, model, qty, amount, payment method badge. Each row clickable to open sale detail.

**Top Selling This Month:**
Uses shadcn/ui BarChart. Shows top 5 models by units sold this month. Horizontal bars. Model name on Y axis, units on X axis.

**Recent Udhar (last 3 overdue or upcoming):**
Customer name, amount remaining, due date, days overdue if past due date shown in red.

---

### Page: Stock Management `/stock`

**Stock summary bar (above table):**
- Total models: N
- Total units in stock: N
- Stock value at cost: Rs X
- Stock value at selling price: Rs X
- Potential profit if all sold: Rs X

**Filters (all filter simultaneously, no submit button needed — on change):**
- Search input — searches brand + model + variant + IMEI
- Brand dropdown — dynamically populated from existing brands in stock
- Condition dropdown — New / Refurbished / Open Box / All
- Status dropdown — All / In Stock / Low Stock / Out of Stock
- Sort dropdown — Newest Added / Oldest / Price High to Low / Price Low to High / Qty High to Low / Qty Low to High

**Stock Table columns:**
Brand | Model | Variant | Condition | Purchase Price | Selling Price | Qty | Status Badge | Date Added | Actions

Status badges: "In Stock" green / "Low Stock" yellow / "Out of Stock" red

**Actions per row:**
- **Sell** — primary action button, opens Sell Modal
- **Edit** — opens Edit Stock Modal with all fields prefilled
- **Adjust Qty** — opens a small modal to increase (restock) or decrease (damage/loss/correction) quantity with a reason note
- **Delete** — confirmation modal, warns if sales exist for this item

**Add Phone Button (top right of page):**
Opens Add Stock Modal with fields:
- Brand (text input)
- Model Name (text input)
- Variant / Color / Storage (text input)
- Condition (select: New / Refurbished / Open Box)
- Purchase Price (number input)
- Selling Price (number input — shows profit margin % live as you type)
- Quantity (number input)
- Low Stock Alert At (number input, default 2)
- IMEI / Serial Number (text input, optional)
- Date Added (date input, default today)
- Notes (textarea, optional)

**Sell Modal (triggered from Sell button in table row):**
Shows at top: phone name, current qty in stock, default selling price.
Fields:
- Quantity to Sell (number, max = current qty, default 1)
- Customer Name (text, default "Walk-in")
- Payment Method (select: Cash / Card / Easypaisa / JazzCash / Bank Transfer)
- Sale Price (number, pre-filled with selling price — editable so shopkeeper can give discount)
- Discount Amount (auto-calculated from sale price vs selling price, shown read-only)
- Sold on Credit (Udhar)? (toggle/checkbox)

If "Sold on Credit" is ON, additional fields appear:
- Customer Phone Number (required)
- Amount Paid Upfront (number — can be 0)
- Due Date (date input)
- Notes (textarea)

On "Complete Sale":
1. POST to /api/sales
2. Stock quantity decrements in DB
3. If udhar, inserts into udhar table
4. Success toast with "Sale of Rs X recorded"
5. Modal closes, table refreshes

---

### Page: Sales History `/sales`

**Summary bar:**
- Total revenue in current filter
- Total units sold
- Total profit in current filter

**Filters:**
- Date range (From — To date pickers)
- Quick filter buttons: Today / This Week / This Month / Last Month
- Payment Method dropdown
- Search box (customer name or model)

**Sales Table columns:**
Date | Time | Customer | Model + Variant | Qty | Sale Price | Total | Payment Method | Profit | Actions

Profit column shows: Rs amount in green if positive. Shows cost vs sale.

**Actions per row:**
- View — opens Sale Detail Modal
- Delete — confirmation modal, warns that stock will NOT be restored

**Sale Detail Modal:**
Full receipt layout inside modal:
- Shop name + details from settings
- Sale date and time
- Customer name
- Phone model, variant, IMEI (if stored), qty, price per unit, total
- Payment method
- Profit on this sale (internal — only shown in modal, not on printed receipt)

**Print Receipt button inside modal:**
Triggers window.print(). Print-specific CSS hides everything except the receipt. Receipt layout:
- Shop name centered at top
- Address and phone
- Divider line
- Item: model, qty, price, subtotal
- Divider line
- Total amount
- Payment method
- Date
- Footer message from settings
- "Thank you" message

---

### Page: Udhar Khata `/udhar`

**Summary cards (top):**
- Total Outstanding (all remaining balances where status != Paid)
- Number of Active Debtors
- Overdue Amount (remaining balance where due_date < today and status != Paid)
- Collected This Month (sum of udhar_payments this month)

**Filters:**
- Search (name or phone number)
- Status filter: All / Unpaid / Partial / Paid
- Due filter: All / Overdue / Due This Week / Due This Month

**Udhar Table columns:**
Customer Name | Phone | Phone Sold | Total Amount | Paid | Remaining | Date Given | Due Date | Status | Days Overdue | Actions

- Rows where due date is past and status is not Paid: highlight entire row in a subtle red background
- Status badges: Unpaid (red) / Partial (yellow) / Paid (green)
- Days Overdue column: blank if not overdue, red number if overdue (e.g. "12 days")

**Actions per row:**
- Add Payment — opens payment modal
- History — opens payment history modal
- Edit — edit the udhar entry details
- Delete — confirmation, deletes entry and all payment history

**Add Udhar Button (top right):**
For manual udhar not linked to a sale. Fields:
- Customer Name
- Customer Phone
- Phone Sold (description text)
- Total Amount
- Amount Paid Upfront
- Due Date
- Notes

**Add Payment Modal:**
- Shows: Customer name, total amount, already paid, remaining
- Fields: Amount Received (number), Payment Date (date, default today), Notes
- On save: inserts into udhar_payments, recalculates remaining on udhar record, updates status automatically (Unpaid → Partial → Paid based on remaining balance)
- If remaining becomes 0, status = Paid

**Payment History Modal:**
Table showing all installments: Date | Amount Paid | Notes | Cumulative Total Paid

---

### Page: Expenses `/expenses`

**Summary bar:**
- Total This Month
- Total This Year
- Breakdown by category (shown as small pills with amounts)

**Filters:**
- Date range
- Category filter dropdown
- Search by description

**Expense Table columns:**
Date | Description | Category Badge | Amount | Notes | Actions (Edit / Delete)

**Add Expense Form (side panel or modal):**
- Description (text)
- Amount (Rs)
- Category (select: Rent / Electricity / Salary / Transport / Stock Purchase / Repair & Maintenance / Marketing / Other)
- Date (default today)
- Notes (optional)

---

### Page: Reports `/reports`

**Period selector (top):**
Today / This Week / This Month / Last Month / Custom Range (shows two date pickers)

All charts and numbers update when period changes.

**KPI Cards row:**
- Total Revenue
- Cost of Goods Sold
- Total Expenses
- Gross Profit (Revenue - Cost of Goods)
- Net Profit (Gross Profit - Expenses)
- Units Sold
- Average Sale Value

**Chart 1 — Revenue & Profit Over Time:**
shadcn/ui AreaChart or LineChart. X axis = days (or weeks if period is long). Two lines: Revenue and Profit. Shows the trend over the selected period.

**Chart 2 — Top Selling Models:**
shadcn/ui BarChart (horizontal). Top 10 models by units sold. Shows model name and count.

**Chart 3 — Payment Method Breakdown:**
shadcn/ui PieChart or DonutChart. Each slice = one payment method. Shows % and Rs amount.

**Chart 4 — Expenses by Category:**
shadcn/ui BarChart. Each bar = one expense category. Shows how much spent per category in the period.

**Table — Daily Sales Breakdown:**
Date | Transactions | Revenue | Cost | Profit

**Table — Best Performing Models:**
Model | Units Sold | Revenue | Cost | Profit | Profit Margin %

**Export button:**
Downloads all sales in selected period as a CSV file. Columns: Date, Customer, Model, Qty, Purchase Price, Sale Price, Profit, Payment Method.

---

### Page: Settings `/settings`

**Shop Information section:**
- Shop Name
- Owner Name
- Phone Number
- Address
- City
- Receipt Footer Message

All saved to settings table in DB via PUT /api/settings.

**Data Management section:**
- Export All Data — downloads a full JSON backup of all tables
- Import Data — upload a JSON backup file to restore (with confirmation warning)
- Clear All Data — requires typing "DELETE" into an input to confirm, then wipes all tables

---

## Functional Rules (apply everywhere)

1. Every sale POST must be a DB transaction — decrement stock and insert sale atomically. If stock goes to 0 or below, reject the sale with an error message.
2. Profit is always calculated and stored at time of sale using the purchase_price from stock at that moment — not recalculated later.
3. Udhar status is always auto-calculated: remaining = 0 → Paid, 0 < remaining < total → Partial, remaining = total → Unpaid.
4. All money values displayed as "Rs X,XXX" format (Pakistan locale).
5. All dates shown as DD/MM/YYYY.
6. Every delete action shows a confirmation modal — no direct deletes.
7. All tables show a proper empty state (not just blank) when no data exists.
8. All forms show inline validation errors before submitting.
9. Toast notifications for every success and error action.
10. All filter/search operations happen via API query params — not client-side filtering — so they work on full dataset, not just current page.
11. Tables should be paginated (20 rows per page) with page controls.
12. Stock quantity can never go below 0. API must enforce this.
13. When a sale is created with is_udhar = true, the payment_method in sales table is stored as "Udhar" and a corresponding udhar record is created in the same API call.
14. The `/api/sales` POST should accept multiple items in one sale (array of items) so the shopkeeper can sell multiple phones in one transaction and get one combined receipt.

---

## What This System Does NOT Include

- No login or authentication
- No barcode scanning
- No SMS or WhatsApp integration
- No ecommerce or online store
- No multi-branch support
- No supplier management
- No repair/service ticket tracking