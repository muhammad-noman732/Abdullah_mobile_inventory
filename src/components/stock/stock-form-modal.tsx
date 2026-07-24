'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
  dateAdded: string;
}

interface StockFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: StockItem | null;
  onSuccess: () => void;
}

const CONDITIONS = [
  { label: 'New', value: 'New' },
  { label: 'Refurbished', value: 'Refurbished' },
  { label: 'Open Box', value: 'Open Box' },
];

const EMPTY_FORM = {
  brand: '',
  model: '',
  variant: '',
  condition: 'New',
  purchasePrice: '',
  sellingPrice: '',
  quantity: '',
  lowStockAlert: '2',
  imei: '',
  notes: '',
  dateAdded: new Date().toISOString().split('T')[0],
};

export function StockFormModal({ isOpen, onClose, editItem, onSuccess }: StockFormModalProps) {
  const isEdit = !!editItem;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setForm({
          brand: editItem.brand,
          model: editItem.model,
          variant: editItem.variant || '',
          condition: editItem.condition,
          purchasePrice: String(editItem.purchasePrice),
          sellingPrice: String(editItem.sellingPrice),
          quantity: String(editItem.quantity),
          lowStockAlert: String(editItem.lowStockAlert),
          imei: editItem.imei || '',
          notes: editItem.notes || '',
          dateAdded: editItem.dateAdded
            ? new Date(editItem.dateAdded).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [isOpen, editItem]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const purchasePrice = parseFloat(form.purchasePrice) || 0;
  const sellingPrice = parseFloat(form.sellingPrice) || 0;
  const margin = purchasePrice > 0 ? (((sellingPrice - purchasePrice) / purchasePrice) * 100).toFixed(1) : null;
  const profit = sellingPrice - purchasePrice;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.brand.trim()) e.brand = 'Brand is required.';
    if (!form.model.trim()) e.model = 'Model is required.';
    if (!form.purchasePrice || isNaN(parseFloat(form.purchasePrice)) || parseFloat(form.purchasePrice) < 0)
      e.purchasePrice = 'Enter a valid purchase price.';
    if (!form.sellingPrice || isNaN(parseFloat(form.sellingPrice)) || parseFloat(form.sellingPrice) < 0)
      e.sellingPrice = 'Enter a valid selling price.';
    if (!form.quantity || isNaN(parseInt(form.quantity)) || parseInt(form.quantity) < 0)
      e.quantity = 'Enter a valid quantity.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const url = isEdit ? `/api/stock/${editItem!.id}` : '/api/stock';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          purchasePrice: parseFloat(form.purchasePrice),
          sellingPrice: parseFloat(form.sellingPrice),
          quantity: parseInt(form.quantity),
          lowStockAlert: parseInt(form.lowStockAlert || '2'),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Operation failed');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Stock Item' : 'Add New Phone to Stock'}
      description={isEdit ? `Editing: ${editItem?.brand} ${editItem?.model}` : 'Fill in the phone details to add it to inventory.'}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5">
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Brand *" placeholder="e.g. Samsung" value={form.brand} onChange={set('brand')} error={errors.brand} />
          <Input label="Model *" placeholder="e.g. Galaxy A55" value={form.model} onChange={set('model')} error={errors.model} />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Variant / Color / Storage" placeholder="e.g. Black 256GB" value={form.variant} onChange={set('variant')} />
          <Select label="Condition" value={form.condition} onChange={set('condition')} options={CONDITIONS} />
        </div>

        {/* Row 3: Pricing with live margin */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Purchase Price (Rs) *" type="number" min={0} placeholder="0" value={form.purchasePrice} onChange={set('purchasePrice')} error={errors.purchasePrice} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 tracking-wide">Selling Price (Rs) *</label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={form.sellingPrice}
              onChange={set('sellingPrice')}
              className={`flex h-10 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 ${errors.sellingPrice ? 'border-rose-500' : 'border-slate-300 bg-white'}`}
            />
            {margin !== null && (
              <span className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {profit >= 0 ? '▲' : '▼'} Profit: Rs {Math.abs(profit).toLocaleString('en-PK')} ({margin}% {profit >= 0 ? 'margin' : 'loss'})
              </span>
            )}
            {errors.sellingPrice && <span className="text-xs text-rose-600 font-medium">{errors.sellingPrice}</span>}
          </div>
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Quantity *" type="number" min={0} placeholder="0" value={form.quantity} onChange={set('quantity')} error={errors.quantity} />
          <Input label="Low Stock Alert Threshold" type="number" min={0} placeholder="2" value={form.lowStockAlert} onChange={set('lowStockAlert')} helperText="Alert when qty falls to or below this." />
        </div>

        {/* Row 5 */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="IMEI / Serial (optional)" placeholder="e.g. 353945100000000" value={form.imei} onChange={set('imei')} />
          <Input label="Date Added" type="date" value={form.dateAdded} onChange={set('dateAdded')} />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 tracking-wide">Notes (optional)</label>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 resize-none"
            placeholder="Any additional notes about this phone..."
            value={form.notes}
            onChange={set('notes')}
          />
        </div>

        {errors.submit && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
            {errors.submit}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add to Stock'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
