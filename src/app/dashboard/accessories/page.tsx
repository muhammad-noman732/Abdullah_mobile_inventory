'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Package, Wallet, Pencil, Trash2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AccessoryFormModal } from '@/components/accessories/accessory-form-modal';
import { getAccessoriesAction, deleteAccessoryAction } from '@/actions/accessories';
import { formatDate, cn } from '@/lib/utils';
import { SparklineCard } from '@/components/ui/sparkline-card';
import { TableSkeleton } from '@/components/ui/skeleton';

interface AccessoryItem {
  id: number;
  name: string;
  modelName: string;
  purchasePrice: number;
  quantity: number;
  dateAdded: string;
  createdAt: string;
}

interface Summary {
  totalUnits: number;
  costValue: number;
}

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Qty: High → Low', value: 'qty_desc' },
  { label: 'Qty: Low → High', value: 'qty_asc' },
];

const NAME_COLORS: Record<string, string> = {
  Powerbank: 'bg-amber-100 text-amber-800 border-amber-200',
  Airpods: 'bg-sky-100 text-sky-800 border-sky-200',
  Cables: 'bg-violet-100 text-violet-800 border-violet-200',
  Glass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

export default function AccessoriesPage() {
  const [items, setItems] = useState<AccessoryItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<AccessoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccessoriesAction({ search: debouncedSearch, sort, limit: 500 });
      if (res.success) {
        setItems(res.data as any);
        setSummary(res.summary as any);
      }
    } catch {
      toast.error('Failed to load accessories.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sort]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: number) => {
    try {
      const res = await deleteAccessoryAction(id);
      if (res.success) {
        toast.success('Accessory removed.');
        setDeleteId(null);
        fetchItems();
      } else {
        toast.error(res.error || 'Failed to delete.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    }
  };

  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
            <Layers className="w-4 h-4 text-violet-700" />
          </div>
          <div>
            <span className="text-sm font-bold text-[#121212]">Accessories</span>
            {summary && (
              <span className="ml-2 text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                {summary.totalUnits} units
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="shrink-0 gap-2 bg-violet-700 hover:bg-violet-800 text-white font-bold rounded-xl text-xs h-9 px-4 shadow-xs">
          <Plus className="w-4 h-4" /> Add Accessory
        </Button>
      </div>

      {/* KPI Cards - different style from stock */}
      {summary && (
        <div className="grid grid-cols-2 gap-4">
          <SparklineCard title="Total Units" subtitle="All accessories combined" value={summary.totalUnits.toLocaleString()} color="purple" icon={Layers} trendText="Items in inventory" />
          <SparklineCard title="Total Cost" subtitle="Purchase investment" value={fmt(summary.costValue)} color="purple" icon={Wallet} trendText="Capital deployed" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-violet-200/60 px-4 py-3">
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
            <input
              type="text"
              placeholder="Search accessories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-3 rounded-xl border border-violet-200 bg-violet-50/30 text-xs font-medium text-[#121212] placeholder:text-violet-400 focus:border-violet-600 focus:outline-none transition-all"
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="h-9 rounded-xl border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-600 focus:border-violet-600 focus:outline-none">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-violet-200/60 rounded-2xl overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#121212]">No accessories in stock</p>
              <p className="text-xs text-violet-500 mt-1">Add accessories like chargers, cables, and more.</p>
            </div>
            <Button onClick={() => setShowAddModal(true)} size="sm" className="mt-1 text-xs h-9 rounded-xl bg-violet-700 text-white font-bold hover:bg-violet-800">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Accessory
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-violet-50/80 border-b border-violet-100">
                    <th className="px-5 py-3 text-left font-bold text-violet-500 text-[10px] uppercase tracking-wider">Item</th>
                    <th className="px-5 py-3 text-right font-bold text-violet-500 text-[10px] uppercase tracking-wider">Purchase Price</th>
                    <th className="px-5 py-3 text-center font-bold text-violet-500 text-[10px] uppercase tracking-wider">In Stock</th>
                    <th className="px-5 py-3 text-left font-bold text-violet-500 text-[10px] uppercase tracking-wider">Added</th>
                    <th className="px-5 py-3 text-right font-bold text-violet-500 text-[10px] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-100/60">
                  {items.map((item) => (
                    <tr key={item.id} className={cn('hover:bg-violet-50/40 transition-colors', item.quantity === 0 && 'opacity-50')}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 text-[10px] font-bold shrink-0">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-[#121212] text-xs">{item.name}</span>
                            <span className="block text-[10px] text-violet-500 font-medium mt-0.5">{item.modelName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-violet-700 text-xs">{fmt(item.purchasePrice)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                          item.quantity > 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.quantity > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        )}>
                          {item.quantity > 5 ? 'In Stock' : item.quantity > 0 ? 'Low' : 'Out'}
                          <span className="font-black ml-0.5">{item.quantity}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-violet-500 text-xs font-medium">{formatDate(item.dateAdded)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setEditItem(item)}
                            className="text-[11px] h-7 px-2.5 rounded-lg border-violet-200 font-semibold text-violet-600 hover:bg-violet-50">
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(item.id)}
                            className="text-[11px] h-7 w-7 p-0 rounded-lg text-violet-400 hover:text-rose-600 hover:bg-rose-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-violet-100/60">
              {items.map((item) => (
                <div key={item.id} className={cn('p-4', item.quantity === 0 && 'opacity-50')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#121212]">{item.name}</p>
                        <p className="text-[11px] text-violet-500 font-medium mt-0.5">{item.modelName}</p>
                        <p className="text-xs text-violet-600 font-semibold mt-0.5">{fmt(item.purchasePrice)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setEditItem(item)}
                        className="text-[11px] h-8 w-8 p-0 rounded-lg border-violet-200">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(item.id)}
                        className="text-[11px] h-8 w-8 p-0 rounded-lg text-violet-400 hover:text-rose-600">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 ml-11">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                      item.quantity > 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      item.quantity > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    )}>
                      {item.quantity} unit{item.quantity !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[11px] text-violet-400 ml-2">{formatDate(item.dateAdded)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AccessoryFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => { fetchItems(); }} />
      <AccessoryFormModal isOpen={!!editItem} onClose={() => setEditItem(null)} editItem={editItem} onSuccess={() => { setEditItem(null); fetchItems(); }} />

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-violet-100 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#121212]">Delete this accessory?</h3>
            <p className="text-xs text-violet-500 font-medium">This will remove it from your inventory.</p>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} className="rounded-xl text-xs h-9">Cancel</Button>
              <Button size="sm" onClick={() => handleDelete(deleteId)} className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold">Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
