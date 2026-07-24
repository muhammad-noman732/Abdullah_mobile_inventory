import { z } from 'zod';
import { NextResponse } from 'next/server';

// ─── Phone Number Validator ──────────────────────────────────────────────────

export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  // PK format: 03001234567 (11 digits starting with 03) or +923001234567 or 00923001234567
  const isPk = /^((\+92)|(0092)|0)?3\d{9}$/.test(clean);
  // General international format: +[1-9] followed by 7-14 digits (or local 10-11 digit numbers)
  const isIntl = /^\+?[1-9]\d{6,14}$/.test(clean);
  return isPk || isIntl;
}

export const PhoneSchema = z.string().trim().refine(
  (val) => !val || isValidPhone(val),
  'Invalid phone number. Please enter a valid number (e.g. 0300-1234567 or +923001234567).'
);

// ─── Reusable Zod Schemas ────────────────────────────────────────────────────

export const StockCreateSchema = z.object({
  brand: z.string().min(1, 'Brand is required').max(100).trim(),
  model: z.string().min(1, 'Model is required').max(150).trim(),
  variant: z.string().max(100).trim().optional().nullable(),
  condition: z.enum(['Brand New', 'Used', 'Refurbished', 'Open Box']).default('Brand New'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
  lowStockAlert: z.coerce.number().int().min(0).default(2),
  imei: z.string().max(50).trim().optional().nullable(),
  notes: z.string().max(500).trim().optional().nullable(),
  dateAdded: z.string().optional().nullable(),
});

export const StockUpdateSchema = StockCreateSchema.partial();

export const StockAdjustSchema = z.object({
  adjustment: z.coerce.number().int().refine((v) => v !== 0, 'Adjustment cannot be zero'),
  reason: z.string().min(1, 'Reason is required').max(200).trim(),
});

export const SaleItemSchema = z.object({
  stockId: z.coerce.number().int().positive(),
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

export const UdharCreateSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(150).trim(),
  customerPhone: z.string().min(1, 'Customer phone is required').trim().refine(
    (val) => isValidPhone(val),
    'Please enter a valid mobile number (e.g., 0300-1234567 or +923001234567).'
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
