'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addAccessoryAction, editAccessoryAction } from '@/actions/accessories';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AccessoryItem {
  id: number;
  name: string;
  modelName: string;
  purchasePrice: number;
  quantity: number;
  dateAdded: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editItem?: AccessoryItem | null;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  name: '',
  modelName: '',
  purchasePrice: '',
  quantity: '1',
  dateAdded: new Date().toISOString().split('T')[0],
};

type FormErrors = {
  name?: string;
  modelName?: string;
  purchasePrice?: string;
  quantity?: string;
  submit?: string;
};

export function AccessoryFormModal({ isOpen, onClose, editItem, onSuccess }: Props) {
  const isEdit = !!editItem;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setForm({
          name: editItem.name,
          modelName: editItem.modelName,
          purchasePrice: String(editItem.purchasePrice),
          quantity: String(editItem.quantity),
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

  const validateAll = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Enter the accessory name (e.g. Cover, Charger).';
    if (!form.modelName.trim()) e.modelName = 'Enter the model name (e.g. iPhone 15 Pro Max).';
    if (!form.purchasePrice || isNaN(parseFloat(form.purchasePrice)) || parseFloat(form.purchasePrice) < 0) e.purchasePrice = 'Enter a valid purchase price.';
    if (!form.quantity || isNaN(parseInt(form.quantity)) || parseInt(form.quantity) < 0) e.quantity = 'Enter a valid quantity.';
    setErrors(e);
    setTouched({ name: true, modelName: true, purchasePrice: true, quantity: true });
    return !e.name && !e.modelName && !e.purchasePrice && !e.quantity;
  };

  const onFieldBlur = (field: keyof FormErrors) => {
    if (field === 'submit') return;
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (field in errors) setErrors((prev) => { const n = { ...prev }; delete n[field as keyof FormErrors]; return n; });
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => { if (val !== undefined) formData.append(key, String(val)); });

      let res;
      if (isEdit && editItem) {
        res = await editAccessoryAction(editItem.id, { success: false }, formData);
      } else {
        res = await addAccessoryAction({ success: false }, formData);
      }

      if (!res.success) {
        setErrors({ submit: res.error || 'Failed to save.' });
      } else {
        toast.success(isEdit ? 'Accessory updated!' : 'Accessory added!');
        onSuccess();
        onClose();
      }
    } catch (e: any) {
      toast.error(e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={isEdit ? 'Update Accessory' : 'Add New Accessory'} maxWidth="sm">
      <div className="flex flex-col gap-4">
        <Input
          label="Accessory Name *"
          placeholder="e.g. Cover, Charger, Glass"
          value={form.name}
          onChange={set('name')}
          onBlur={() => onFieldBlur('name')}
          error={touched.name ? errors.name : undefined}
        />
        <Input
          label="Model Name *"
          placeholder="e.g. iPhone 15 Pro Max"
          value={form.modelName}
          onChange={set('modelName')}
          onBlur={() => onFieldBlur('modelName')}
          error={touched.modelName ? errors.modelName : undefined}
        />
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
            label="Quantity *"
            type="number"
            placeholder="1"
            value={form.quantity}
            onChange={set('quantity')}
            onBlur={() => onFieldBlur('quantity')}
            error={touched.quantity ? errors.quantity : undefined}
          />
        </div>
        <Input
          label="Date Added"
          type="date"
          value={form.dateAdded}
          onChange={set('dateAdded')}
        />

        {errors.submit && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.submit}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 rounded-xl bg-[#121212] hover:bg-neutral-800 text-white font-bold">
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Add to Stock'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
