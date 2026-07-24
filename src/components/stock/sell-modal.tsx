'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createSaleAction } from '@/actions/sales';
import { cn } from '@/lib/utils';

interface StockItem {
  id: number;
  brand: string;
  model: string;
  variant: string | null;
  condition: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  lowStockAlert: number;
  imei: string | null;
  notes: string | null;
}

interface SellCartItem {
  stockId: number;
  brand: string;
  model: string;
  variant: string | null;
  availableQty: number;
  maxQty: number;
  defaultPrice: number;
  quantity: number;
  salePrice: number;
}

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStock: StockItem | null;
  allStock: StockItem[];
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Card', value: 'Card' },
  { label: 'Easypaisa', value: 'Easypaisa' },
  { label: 'JazzCash', value: 'JazzCash' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Udhar (Credit)', value: 'Udhar' },
];

export function SellModal({ isOpen, onClose, initialStock, allStock, onSuccess }: SellModalProps) {
  const [cartItems, setCartItems] = useState<SellCartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paidUpfront, setPaidUpfront] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [udharNotes, setUdharNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isUdhar = paymentMethod === 'Udhar';

  useEffect(() => {
    if (isOpen && initialStock) {
      setCartItems([
        {
          stockId: initialStock.id,
          brand: initialStock.brand,
          model: initialStock.model,
          variant: initialStock.variant,
          availableQty: initialStock.quantity,
          maxQty: initialStock.quantity,
          defaultPrice: Number(initialStock.sellingPrice),
          quantity: 1,
          salePrice: Number(initialStock.sellingPrice),
        },
      ]);
      setCustomerName('Walk-in');
      setPaymentMethod('Cash');
      setCustomerPhone('');
      setPaidUpfront('0');
      setDueDate('');
      setUdharNotes('');
      setErrors({});
    }
  }, [isOpen, initialStock]);

  const grandTotal = cartItems.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
  const remaining = Math.max(0, grandTotal - parseFloat(paidUpfront || '0'));

  const updateCartItem = (index: number, field: keyof SellCartItem, value: any) => {
    setCartItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addCartItem = () => {
    const available = allStock.filter(
      (s) => s.quantity > 0 && !cartItems.find((c) => c.stockId === s.id)
    );
    if (available.length === 0) return;
    const first = available[0];
    setCartItems((prev) => [
      ...prev,
      {
        stockId: first.id,
        brand: first.brand,
        model: first.model,
        variant: first.variant,
        availableQty: first.quantity,
        maxQty: first.quantity,
        defaultPrice: Number(first.sellingPrice),
        quantity: 1,
        salePrice: Number(first.sellingPrice),
      },
    ]);
  };

  const changeCartStock = (index: number, stockId: number) => {
    const stock = allStock.find((s) => s.id === Number(stockId));
    if (!stock) return;
    setCartItems((prev) => {
      const next = [...prev];
      next[index] = {
        stockId: stock.id,
        brand: stock.brand,
        model: stock.model,
        variant: stock.variant,
        availableQty: stock.quantity,
        maxQty: stock.quantity,
        defaultPrice: Number(stock.sellingPrice),
        quantity: 1,
        salePrice: Number(stock.sellingPrice),
      };
      return next;
    });
  };

  const removeCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (isUdhar && !customerPhone.trim()) e.customerPhone = 'Phone number is required for credit sales.';
    if (cartItems.length === 0) e.cart = 'Add at least one item to sell.';
    cartItems.forEach((item, i) => {
      if (item.quantity < 1) e[`qty_${i}`] = 'Quantity must be at least 1.';
      if (item.quantity > item.maxQty) e[`qty_${i}`] = `Only ${item.maxQty} unit${item.maxQty !== 1 ? 's' : ''} available in stock.`;
      if (item.salePrice <= 0) e[`price_${i}`] = 'Sale price must be greater than 0.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        items: cartItems.map((item) => ({
          stockId: item.stockId,
          quantity: item.quantity,
          salePrice: item.salePrice,
        })),
        customerName: customerName.trim() || 'Walk-in',
        paymentMethod,
        isUdhar,
        customerPhone,
        paidUpfront: parseFloat(paidUpfront || '0'),
        dueDate: dueDate || null,
        notes: udharNotes,
      };

      const result = await createSaleAction(payload);

      if (!result.success) {
        setErrors({ submit: result.error || 'Sale failed. Please check the form and try again.' });
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrors({ submit: err.message || 'Unexpected error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const availableToAdd = allStock.filter(
    (s) => s.quantity > 0 && !cartItems.find((c) => c.stockId === s.id)
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Record New Sale" maxWidth="lg">
      <div className="flex flex-col gap-5">

        {/* Cart Items */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sale Items</span>
            {availableToAdd.length > 0 && (
              <button
                onClick={addCartItem}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Item
              </button>
            )}
          </div>

          {errors.cart && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.cart}
            </div>
          )}

          {cartItems.map((item, i) => {
            const discount = item.defaultPrice - item.salePrice;
            const discountPct = item.defaultPrice > 0 ? ((discount / item.defaultPrice) * 100).toFixed(1) : '0';
            const qtyExceeded = item.quantity > item.maxQty;
            return (
              <div key={i} className={cn('rounded-2xl p-4 border flex flex-col gap-3', qtyExceeded ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200')}>
                {/* Item Header — Dropdown + Remove */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    {cartItems.length > 1 || i > 0 ? (
                      <select
                        value={item.stockId}
                        onChange={(e) => changeCartStock(i, Number(e.target.value))}
                        className="w-full h-9 text-xs font-semibold bg-white rounded-xl border border-slate-200 px-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                      >
                        <option value={item.stockId}>
                          {item.brand} {item.model}{item.variant ? ` (${item.variant})` : ''} — {item.availableQty} in stock
                        </option>
                        {availableToAdd.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.brand} {s.model}{s.variant ? ` (${s.variant})` : ''} — {s.quantity} in stock
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {item.brand} {item.model}{item.variant ? ` (${item.variant})` : ''}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          {item.availableQty} unit{item.availableQty !== 1 ? 's' : ''} available in stock
                        </p>
                      </div>
                    )}
                  </div>
                  {cartItems.length > 1 && (
                    <button
                      onClick={() => removeCartItem(i)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors border border-transparent hover:border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Qty / Price / Subtotal Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Qty to Sell</label>
                    <input
                      type="number"
                      min={1}
                      max={item.maxQty}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        updateCartItem(i, 'quantity', val);
                      }}
                      className={cn(
                        'h-9 rounded-xl border px-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 transition-all',
                        qtyExceeded
                          ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-100'
                      )}
                    />
                    {qtyExceeded && (
                      <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Only {item.maxQty} available
                      </p>
                    )}
                    {errors[`qty_${i}`] && !qtyExceeded && (
                      <p className="text-[10px] text-rose-600 font-medium">{errors[`qty_${i}`]}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Price / Unit (Rs)</label>
                    <input
                      type="number"
                      min={0}
                      value={item.salePrice}
                      onChange={(e) => updateCartItem(i, 'salePrice', parseFloat(e.target.value) || 0)}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 transition-all"
                    />
                    {errors[`price_${i}`] && <p className="text-[10px] text-rose-600 font-medium">{errors[`price_${i}`]}</p>}
                    {discount > 0 && (
                      <p className="text-[10px] text-amber-600 font-semibold">↓ {discountPct}% off list</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Subtotal</label>
                    <div className="h-9 rounded-xl border border-indigo-100 bg-indigo-50 px-3 flex items-center text-sm font-black text-indigo-900">
                      Rs {(item.salePrice * item.quantity).toLocaleString('en-PK')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand Total Bar */}
        <div className="flex items-center justify-between bg-indigo-900 text-white rounded-2xl px-5 py-4">
          <span className="text-sm font-semibold text-indigo-200">
            Grand Total ({cartItems.reduce((s, i) => s + i.quantity, 0)} items)
          </span>
          <span className="text-xl font-black">Rs {grandTotal.toLocaleString('en-PK')}</span>
        </div>

        {/* Customer & Payment */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Walk-in"
          />
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={PAYMENT_METHODS}
          />
        </div>

        {/* Udhar Section */}
        {isUdhar && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Credit Sale (Udhar) Details</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Customer Phone *"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0300-1234567"
                error={errors.customerPhone}
              />
              <Input
                label="Amount Paid Upfront (Rs)"
                type="number"
                min={0}
                max={grandTotal}
                value={paidUpfront}
                onChange={(e) => setPaidUpfront(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">Remaining Balance</label>
                <div className={cn('h-10 rounded-xl px-3 flex items-center text-sm font-black border', remaining > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700')}>
                  Rs {remaining.toLocaleString('en-PK')}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Notes (optional)</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 resize-none transition-all"
                value={udharNotes}
                onChange={(e) => setUdharNotes(e.target.value)}
                placeholder="e.g. Customer will pay rest next week..."
              />
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-sm text-rose-700 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold"
          >
            {loading ? 'Processing...' : `Complete Sale · Rs ${grandTotal.toLocaleString('en-PK')}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
