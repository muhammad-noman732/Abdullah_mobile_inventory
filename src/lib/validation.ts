import { z } from 'zod';
import { NextResponse } from 'next/server';

export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  const isPk = /^((\+92)|(0092)|0)?3\d{9}$/.test(clean);
  const isIntl = /^\+?[1-9]\d{6,14}$/.test(clean);
  return isPk || isIntl;
}

export const PhoneSchema = z.string().trim().refine(
  (val) => !val || isValidPhone(val),
  'Invalid phone number.'
);

export const ACCESSORY_NAMES = [
  'CoverCharger', 'Adapter', 'Cables', 'Airpods', 'Battery',
  'Paper', 'Cooling Fan', 'Smart Watch', 'OTG', 'Connectors',
  'Handfree', 'Lens', 'Powerbank', 'Glass', 'Card Reader',
] as const;

// ─── Stock ────────────────────────────────────────────────────────────────────

export const StockCreateSchema = z.object({
  model: z.string().min(1, 'Model name is required').max(200).trim(),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
  dateAdded: z.string().optional().nullable(),
});

export const StockUpdateSchema = StockCreateSchema.partial();

// ─── Accessory ────────────────────────────────────────────────────────────────

export const AccessoryCreateSchema = z.object({
  name: z.string().min(1, 'Accessory name is required'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
  dateAdded: z.string().optional().nullable(),
});

export const AccessoryUpdateSchema = AccessoryCreateSchema.partial();

// ─── Sale ─────────────────────────────────────────────────────────────────────

export const SaleItemSchema = z.object({
  stockId: z.coerce.number().int().positive().optional().nullable(),
  accessoryId: z.coerce.number().int().positive().optional().nullable(),
  itemType: z.enum(['mobile', 'accessory']),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  salePrice: z.coerce.number().min(0),
});

export const SaleCreateSchema = z.object({
  items: z.array(SaleItemSchema).min(1, 'At least one item is required').max(20),
  customerName: z.string().max(150).trim().default('Walk-in'),
  paymentMethod: z.enum(['Cash', 'Card', 'Easypaisa', 'JazzCash', 'Bank Transfer', 'Udhar']).default('Cash'),
  isUdhar: z.boolean().default(false),
  customerPhone: PhoneSchema.optional().default(''),
  paidUpfront: z.coerce.number().min(0).default(0),
  dueDate: z.string().nullable().optional(),
  notes: z.string().max(500).trim().optional().default(''),
});

// ─── Udhar ────────────────────────────────────────────────────────────────────

export const UdharCreateSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(150).trim(),
  customerPhone: z.string().min(1, 'Customer phone is required').trim().refine(
    (val) => isValidPhone(val),
    'Please enter a valid mobile number.'
  ),
  phoneSold: z.string().max(300).trim().optional().nullable(),
  totalAmount: z.coerce.number().min(0),
  paidUpfront: z.coerce.number().min(0).default(0),
  dueDate: z.string().nullable().optional(),
  notes: z.string().max(500).trim().optional().nullable(),
});

export const UdharPaymentSchema = z.object({
  amountPaid: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  paymentDate: z.string().optional(),
  notes: z.string().max(500).trim().optional().nullable(),
});

// ─── Expense ──────────────────────────────────────────────────────────────────

export const ExpenseCreateSchema = z.object({
  description: z.string().min(1, 'Description is required').max(300).trim(),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  category: z.enum([
    'Rent', 'Electricity', 'Salary', 'Transport',
    'Stock Purchase', 'Repair & Maintenance', 'Marketing', 'Other',
  ]),
  expenseDate: z.string().optional(),
  notes: z.string().max(500).trim().optional().nullable(),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const SettingsUpdateSchema = z.object({
  shopName: z.string().max(150).trim().optional(),
  ownerName: z.string().max(150).trim().optional().nullable(),
  phoneNumber: PhoneSchema.optional().nullable(),
  address: z.string().max(300).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  receiptFooter: z.string().max(300).trim().optional(),
  currencyLabel: z.string().max(10).trim().optional(),
});

export function validationError(error: z.ZodError): NextResponse {
  const issues = error.issues || [];
  const messages = issues.map((e) => e.message).join('; ');
  return NextResponse.json(
    { success: false, error: messages, details: issues },
    { status: 400 }
  );
}
