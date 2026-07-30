'use client';

import { useState } from 'react';
import { X, Pencil, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateSaleItemsAction } from '@/actions/sales';
import { toast } from 'sonner';

interface SaleItem {
  id: number;
  brand: string;
  model: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  subtotal: number;
}

interface Sale {
  id: number;
  customerName: string;
  totalAmount: number;
  items: SaleItem[];
}

interface Props {
  sale: Sale;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditSaleModal({ sale, onClose, onSuccess }: Props) {
  const [items, setItems] = useState(() =>
    sale.items.map((item) => ({ id: item.id, salePrice: item.salePrice }))
  );
  const [saving, setSaving] = useState(false);

  const setPrice = (itemId: number, val: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, salePrice: parseFloat(val) || 0 } : i))
    );
  };

  const calcSubtotal = (itemId: number) => {
    const item = sale.items.find((i) => i.id === itemId);
    const updated = items.find((i) => i.id === itemId);
    if (!item || !updated) return 0;
    return updated.salePrice * item.quantity;
  };

  const newTotal = items.reduce((sum, i) => {
    const original = sale.items.find((s) => s.id === i.id);
    return sum + (original ? i.salePrice * original.quantity : 0);
  }, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateSaleItemsAction(sale.id, items);
      if (res.success) {
        toast.success('Sale updated!');
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Failed to update.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Sale #{String(sale.id).padStart(5, '0')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{sale.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                  <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item) => {
                  const updated = items.find((i) => i.id === item.id);
                  const price = updated?.salePrice ?? item.salePrice;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{item.brand} {item.model}</p>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700 font-medium">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={price}
                          onChange={(e) => setPrice(item.id, e.target.value)}
                          className="w-28 text-right px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-400 bg-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        Rs {Math.round(calcSubtotal(item.id)).toLocaleString('en-PK')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-800">New total after save</span>
            </div>
            <span className="text-base font-black text-amber-900">Rs {Math.round(newTotal).toLocaleString('en-PK')}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}