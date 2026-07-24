'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { addStockAction, editStockAction } from '@/actions/stock';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  { label: 'Brand New', value: 'Brand New' },
  { label: 'Used', value: 'Used' },
  { label: 'Refurbished', value: 'Refurbished' },
  { label: 'Open Box', value: 'Open Box' },
];

const EMPTY_FORM = {
  brand: '',
  model: '',
  variant: '',
  condition: 'Brand New',
  purchasePrice: '',
  sellingPrice: '',
  quantity: '',
  lowStockAlert: '2',
  imei: '',
  notes: '',
  dateAdded: new Date().toISOString().split('T')[0],
};

type StockFormErrors = {
  brand?: string;
  model?: string;
  purchasePrice?: string;
  sellingPrice?: string;
  quantity?: string;
  submit?: string;
};

export function StockFormModal({ isOpen, onClose, editItem, onSuccess }: StockFormModalProps) {
  const isEdit = !!editItem;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<StockFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
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
      setTouched({});
    }
  }, [isOpen, editItem]);

  // Validators
  const validateBrand = (v: string): string | undefined => {
    if (!v.trim()) return 'Brand is required.';
    if (v.trim().length > 100) return 'Brand must be 100 characters or fewer.';
    return undefined;
  };

  const validateModel = (v: string): string | undefined => {
    if (!v.trim()) return 'Model is required.';
    if (v.trim().length > 150) return 'Model must be 150 characters or fewer.';
    return undefined;
  };

  const validatePurchasePrice = (v: string): string | undefined => {
    if (!v) return 'Purchase price is required.';
    const num = parseFloat(v);
    if (isNaN(num) || num < 0) return 'Enter a valid purchase price.';
    return undefined;
  };

  const validateSellingPrice = (v: string): string | undefined => {
    if (!v) return 'Selling price is required.';
    const num = parseFloat(v);
    if (isNaN(num) || num < 0) return 'Enter a valid selling price.';
    return undefined;
  };

  const validateQuantity = (v: string): string | undefined => {
    if (!v) return 'Quantity is required.';
    const num = parseInt(v, 10);
    if (isNaN(num) || num < 0) return 'Enter a valid quantity.';
    return undefined;
  };

  const validateAll = (): boolean => {
    const e: StockFormErrors = {};
    e.brand = validateBrand(form.brand);
    e.model = validateModel(form.model);
    e.purchasePrice = validatePurchasePrice(form.purchasePrice);
    e.sellingPrice = validateSellingPrice(form.sellingPrice);
    e.quantity = validateQuantity(form.quantity);
    setErrors(e);
    setTouched({ brand: true, model: true, purchasePrice: true, sellingPrice: true, quantity: true });
    return !e.brand && !e.model && !e.purchasePrice && !e.sellingPrice && !e.quantity;
  };

  const onFieldBlur = (field: keyof StockFormErrors) => {
    if (field === 'submit') return;
    setTouched((prev) => ({ ...prev, [field]: true }));
    const e: StockFormErrors = { ...errors };
    if (field === 'brand') e.brand = validateBrand(form.brand);
    if (field === 'model') e.model = validateModel(form.model);
    if (field === 'purchasePrice') e.purchasePrice = validatePurchasePrice(form.purchasePrice);
    if (field === 'sellingPrice') e.sellingPrice = validateSellingPrice(form.sellingPrice);
    if (field === 'quantity') e.quantity = validateQuantity(form.quantity);
    setErrors(e);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (field in errors) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field as keyof StockFormErrors];
        return n;
      });
    }
  };

  const purchasePrice = parseFloat(form.purchasePrice) || 0;
  const sellingPrice = parseFloat(form.sellingPrice) || 0;
  const margin = purchasePrice > 0 ? (((sellingPrice - purchasePrice) / purchasePrice) * 100).toFixed(1) : null;
  const profit = sellingPrice - purchasePrice;

  const handleSubmit = async () => {
    if (!validateAll()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== undefined && val !== null) formData.append(key, String(val));
      });

      let res;
      if (isEdit && editItem) {
        res = await editStockAction(editItem.id, { success: false }, formData);
      } else {
        res = await addStockAction({ success: false }, formData);
      }

      if (!res.success) {
        setErrors({ submit: res.error || 'Failed to save stock item.' });
      } else {
        toast.success(isEdit ? 'Stock item updated successfully!' : 'Stock item added successfully!');
        onSuccess();
        onClose();
      }
    } catch (e: any) {
      toast.error(e.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={isEdit ? 'Update Stock Item' : 'Add New Phone to Stock'} maxWidth="md">
      <div className="flex flex-col gap-4">
        {/* Brand & Model */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Brand Name *"
            placeholder="e.g. Apple, Samsung"
            value={form.brand}
            onChange={set('brand')}
            onBlur={() => onFieldBlur('brand')}
            error={touched.brand ? errors.brand : undefined}
          />
          <Input
            label="Model Name *"
            placeholder="e.g. iPhone 15 Pro, Galaxy S24"
            value={form.model}
            onChange={set('model')}
            onBlur={() => onFieldBlur('model')}
            error={touched.model ? errors.model : undefined}
          />
        </div>

        {/* Variant & Condition */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Variant / Specs"
            placeholder="e.g. 256GB - Blue"
            value={form.variant}
            onChange={set('variant')}
          />
          <Select
            label="Condition"
            value={form.condition}
            onChange={set('condition')}
            options={CONDITIONS}
          />
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Purchase Price (Rs) *"
            type="number"
            placeholder="0"
            value={form.purchasePrice}
            onChange={set('purchasePrice')}
            onBlur={() => onFieldBlur('purchasePrice')}
            error={touched.purchasePrice ? errors.purchasePrice : undefined}
          />
          <Input
            label="Selling Price (Rs) *"
            type="number"
            placeholder="0"
            value={form.sellingPrice}
            onChange={set('sellingPrice')}
            onBlur={() => onFieldBlur('sellingPrice')}
            error={touched.sellingPrice ? errors.sellingPrice : undefined}
          />
        </div>

        {/* Profit Preview */}
        {purchasePrice > 0 && sellingPrice > 0 && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Expected Profit per unit:</span>
            <span className="font-black text-emerald-700">
              Rs {profit.toLocaleString('en-PK')} ({margin}% margin)
            </span>
          </div>
        )}

        {/* Quantity & Alert */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Stock Quantity *"
            type="number"
            placeholder="Units in stock"
            value={form.quantity}
            onChange={set('quantity')}
            onBlur={() => onFieldBlur('quantity')}
            error={touched.quantity ? errors.quantity : undefined}
          />
          <Input
            label="Low Stock Alert Threshold"
            type="number"
            placeholder="2"
            value={form.lowStockAlert}
            onChange={set('lowStockAlert')}
          />
        </div>

        {/* IMEI & Date */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="IMEI Number (Optional)"
            placeholder="15-digit IMEI"
            value={form.imei}
            onChange={set('imei')}
          />
          <Input
            label="Date Added"
            type="date"
            value={form.dateAdded}
            onChange={set('dateAdded')}
          />
        </div>

        {errors.submit && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.submit}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
            {loading ? 'Saving...' : isEdit ? 'Update Stock' : 'Add to Stock'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
