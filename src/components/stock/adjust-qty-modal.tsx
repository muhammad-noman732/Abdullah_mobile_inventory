'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { adjustStockAction } from '@/actions/stock';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AdjustQtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { id: number; brand: string; model: string; variant: string | null; quantity: number } | null;
  onSuccess: () => void;
}

type AdjustFormErrors = {
  amount?: string;
  reason?: string;
  submit?: string;
};

export function AdjustQtyModal({ isOpen, onClose, item, onSuccess }: AdjustQtyModalProps) {
  const [type, setType] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('Inventory adjustment');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AdjustFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleClose = () => {
    setAmount(''); setErrors({}); setTouched({}); setType('add');
    setReason('Inventory adjustment');
    onClose();
  };

  const adjustment = (parseInt(amount || '0', 10) || 0) * (type === 'add' ? 1 : -1);
  const newQty = (item?.quantity ?? 0) + adjustment;

  const validateAmount = (v: string): string | undefined => {
    const val = parseInt(v || '0', 10);
    if (!v || isNaN(val) || val <= 0) return 'Quantity must be greater than 0.';
    if (type === 'remove' && item && val > item.quantity) {
      return `Cannot remove more than ${item.quantity} unit${item.quantity !== 1 ? 's' : ''} available.`;
    }
    return undefined;
  };

  const validateReason = (v: string): string | undefined => {
    if (!v.trim()) return 'Please provide a reason for this adjustment.';
    return undefined;
  };

  const validateAll = (): boolean => {
    const e: AdjustFormErrors = {};
    e.amount = validateAmount(amount);
    e.reason = validateReason(reason);
    setErrors(e);
    setTouched({ amount: true, reason: true });
    return !e.amount && !e.reason;
  };

  const onFieldBlur = (field: 'amount' | 'reason') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const e: AdjustFormErrors = { ...errors };
    if (field === 'amount') e.amount = validateAmount(amount);
    if (field === 'reason') e.reason = validateReason(reason);
    setErrors(e);
  };

  const clearError = (field: 'amount' | 'reason') => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    if (!item || !validateAll()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('adjustment', String(adjustment));
      formData.append('reason', reason.trim());

      const res = await adjustStockAction(item.id, { success: false }, formData);

      if (!res.success) {
        setErrors({ submit: res.error || 'Failed to adjust quantity.' });
      } else {
        toast.success('Stock quantity adjusted successfully!');
        handleClose();
        onSuccess();
      }
    } catch (e: any) {
      toast.error(e.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Adjust Stock Quantity" maxWidth="sm">
      {item && (
        <div className="flex flex-col gap-5">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
            <p className="text-sm font-bold text-slate-900">{item.brand} {item.model}{item.variant ? ` (${item.variant})` : ''}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Current stock: <span className="font-bold text-slate-800">{item.quantity} units</span></p>
          </div>

          {/* Type Toggle */}
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setType('add')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                type === 'add' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              + Add Stock
            </button>
            <button
              onClick={() => setType('remove')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                type === 'remove' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              - Remove Stock
            </button>
          </div>

          {/* Quantity Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Units to {type === 'add' ? 'Add' : 'Remove'} *</label>
            <input
              type="number"
              min={1}
              max={type === 'remove' ? item.quantity : undefined}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); clearError('amount'); }}
              onBlur={() => onFieldBlur('amount')}
              placeholder="e.g. 5"
              className={cn(
                'h-10 rounded-xl border bg-white px-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 transition-all',
                touched.amount && errors.amount
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
              )}
            />
            {touched.amount && errors.amount && (
              <p className="text-xs text-rose-600 font-medium">{errors.amount}</p>
            )}
          </div>

          {/* New Qty Preview */}
          {amount && !isNaN(parseInt(amount, 10)) && parseInt(amount, 10) > 0 && (
            <div className={cn(
              'rounded-xl px-4 py-3 border text-xs font-bold',
              newQty >= 0 ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800' : 'bg-rose-50 border-rose-200/80 text-rose-800'
            )}>
              New total stock: {newQty < 0 ? 'Cannot go below 0' : `${newQty} units`}
            </div>
          )}

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Reason for Adjustment *</label>
            <select
              value={reason}
              onChange={(e) => { setReason(e.target.value); clearError('reason'); }}
              onBlur={() => onFieldBlur('reason')}
              className={cn(
                'h-10 rounded-xl border bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none transition-all',
                touched.reason && errors.reason
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-slate-200 focus:border-indigo-500'
              )}
            >
              <option value="Inventory adjustment">Inventory adjustment</option>
              <option value="New stock delivery">New stock delivery</option>
              <option value="Damaged / defective unit">Damaged / defective unit</option>
              <option value="Stock audit correction">Stock audit correction</option>
              <option value="Returned item">Returned item</option>
            </select>
            {touched.reason && errors.reason && (
              <p className="text-xs text-rose-600 font-medium">{errors.reason}</p>
            )}
          </div>

          {errors.submit && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={handleClose} className="flex-1 rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {loading ? 'Saving...' : 'Confirm Adjustment'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
