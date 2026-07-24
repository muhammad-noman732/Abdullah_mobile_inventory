'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdjustQtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { id: number; brand: string; model: string; variant: string | null; quantity: number } | null;
  onSuccess: () => void;
}

export function AdjustQtyModal({ isOpen, onClose, item, onSuccess }: AdjustQtyModalProps) {
  const [type, setType] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setAmount(''); setReason(''); setError(''); setType('add');
    onClose();
  };

  const adjustment = parseInt(amount || '0') * (type === 'add' ? 1 : -1);
  const newQty = (item?.quantity ?? 0) + adjustment;

  const handleSubmit = async () => {
    if (!item) return;
    const val = parseInt(amount || '0');
    if (!val || val <= 0) { setError('Enter a valid amount (greater than 0).'); return; }
    if (!reason.trim()) { setError('Please provide a reason for this adjustment.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/stock/${item.id}/adjust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustment, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      onSuccess();
      handleClose();
    } catch (e: any) {
      setError(e.message || 'Adjustment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Adjust Stock Quantity" maxWidth="sm">
      {item && (
        <div className="flex flex-col gap-5">
          <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            <p className="text-sm font-semibold text-slate-900">{item.brand} {item.model}{item.variant ? ` (${item.variant})` : ''}</p>
            <p className="text-xs text-slate-500 mt-0.5">Current stock: <span className="font-semibold text-slate-700">{item.quantity} units</span></p>
          </div>

          {/* Type Toggle */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setType('add')}
              className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all', type === 'add' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700')}
            >
              + Add Stock
            </button>
            <button
              onClick={() => setType('remove')}
              className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all', type === 'remove' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-700')}
            >
              − Remove Stock
            </button>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Units to {type === 'add' ? 'Add' : 'Remove'}</label>
            <input
              type="number"
              min={1}
              max={type === 'remove' ? item.quantity : undefined}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              placeholder="e.g. 5"
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
          </div>

          {/* Preview */}
          {amount && !isNaN(parseInt(amount)) && parseInt(amount) > 0 && (
            <div className={cn('rounded-xl px-4 py-3 border text-sm font-medium', newQty >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800')}>
              New quantity: <span className="font-bold">{newQty < 0 ? 'Cannot go below 0' : `${newQty} units`}</span>
            </div>
          )}

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Reason *</label>
            <select
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
            >
              <option value="">Select reason...</option>
              {type === 'add'
                ? ['Restocking', 'Return from customer', 'Inventory correction', 'New purchase batch', 'Other']
                    .map((r) => <option key={r} value={r}>{r}</option>)
                : ['Damaged unit', 'Lost / Stolen', 'Returned to supplier', 'Defective', 'Inventory correction', 'Other']
                    .map((r) => <option key={r} value={r}>{r}</option>)
              }
            </select>
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || newQty < 0} variant={type === 'remove' ? 'danger' : 'primary'} className="flex-1">
              {loading ? 'Saving...' : `Confirm ${type === 'add' ? 'Addition' : 'Removal'}`}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
