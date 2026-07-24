'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
      const res = await fetch(`/api/stock/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');
      onSuccess();
      handleClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Delete Stock Item" maxWidth="sm">
      {item && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-800">This action cannot be undone.</p>
              <p className="text-xs text-rose-600 mt-1">
                You are about to permanently delete <span className="font-bold">{item.brand} {item.model}{item.variant ? ` (${item.variant})` : ''}</span> from your stock. Any existing sales history referencing this item will retain the data snapshot.
              </p>
            </div>
          </div>
          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={loading} className="flex-1">
              {loading ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
