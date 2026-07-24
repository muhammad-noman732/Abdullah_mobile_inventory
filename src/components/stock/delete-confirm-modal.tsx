'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteStockAction } from '@/actions/stock';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { id: number; brand: string; model: string; variant: string | null } | null;
  onSuccess: () => void;
}

export function DeleteConfirmModal({ isOpen, onClose, item, onSuccess }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => { setError(''); onClose(); };

  const handleDelete = async () => {
    if (!item) return;
    setLoading(true); setError('');
    try {
      const res = await deleteStockAction(item.id);
      if (!res.success) throw new Error(res.error || 'Delete failed');
      onSuccess();
      handleClose();
    } catch (e: any) {
      setError(e.message || 'Failed to delete stock item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Delete Stock Item" maxWidth="sm">
      {item && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4 p-4 bg-rose-50 border border-rose-200/80 rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-900">Are you sure you want to delete this phone?</p>
              <p className="text-xs text-rose-700 mt-1 font-medium">
                You are removing <strong className="font-bold">{item.brand} {item.model}{item.variant ? ` (${item.variant})` : ''}</strong> from inventory. Existing sales records will remain safe.
              </p>
            </div>
          </div>
          {error && <p className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-200 p-3 rounded-xl">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={loading} className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold">
              {loading ? 'Deleting...' : 'Yes, Delete Phone'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
