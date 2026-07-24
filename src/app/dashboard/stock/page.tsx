'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Package, RefreshCw, TrendingUp, Layers, Wallet, ShoppingCart, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockFormModal } from '@/components/stock/stock-form-modal';
import { SellModal } from '@/components/stock/sell-modal';
import { AdjustQtyModal } from '@/components/stock/adjust-qty-modal';
import { DeleteConfirmModal } from '@/components/stock/delete-confirm-modal';
import { getStockAction } from '@/actions/stock';
import { formatDate, cn } from '@/lib/utils';
import { SparklineCard } from '@/components/ui/sparkline-card';

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
  createdAt: string;
}

interface Summary {
  totalModels: number;
  totalUnits: number;
  costValue: number;
  sellingValue: number;
  potentialProfit: number;
}

function getStockStatus(item: StockItem): 'out' | 'low' | 'in' {
  if (item.quantity === 0) return 'out';
  if (item.quantity <= item.lowStockAlert) return 'low';
  return 'in';
}

function StatusBadge({ item }: { item: StockItem }) {
  const status = getStockStatus(item);
  if (status === 'out') return <Badge variant="danger">Out of Stock</Badge>;
  if (status === 'low') return <Badge variant="warning">Low ({item.quantity})</Badge>;
  return <Badge variant="success">In Stock</Badge>;
}

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Qty: High → Low', value: 'qty_desc' },
  { label: 'Qty: Low → High', value: 'qty_asc' },
];

const CONDITION_OPTIONS = [
  { label: 'All Conditions', value: 'all' },
  { label: 'Brand New', value: 'Brand New' },
  { label: 'Used', value: 'Used' },
  { label: 'Refurbished', value: 'Refurbished' },
  { label: 'Open Box', value: 'Open Box' },
];

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'all' },
  { label: 'In Stock', value: 'instock' },
  { label: 'Low Stock', value: 'low' },
  { label: 'Out of Stock', value: 'out' },
];

const conditionColors: Record<string, string> = {
  'Brand New': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'Used':      'bg-amber-50 text-amber-700 border-amber-200/60',
  'Refurbished': 'bg-violet-50 text-violet-700 border-violet-200/60',
  'Open Box':  'bg-sky-50 text-sky-700 border-sky-200/60',
};

export default function StockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [allStock, setAllStock] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('all');
  const [condition, setCondition] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [sellItem, setSellItem] = useState<StockItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStockAction({ search: debouncedSearch, brand, condition, status, sort, limit: 200 });
      if (res.success) {
        setStockItems(res.data as any);
        setSummary(res.summary as any);
        setBrands(res.brands || []);
      }
    } catch {
      toast.error('Failed to load stock. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, brand, condition, status, sort]);

  const fetchAllStock = useCallback(async () => {
    const res = await getStockAction({ limit: 500, status: 'all' });
    if (res.success) setAllStock(res.data as any);
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);
  useEffect(() => { fetchAllStock(); }, [fetchAllStock]);

  const onSuccess = (msg: string) => {
    toast.success(msg);
    fetchStock();
    fetchAllStock();
  };

  const brandOptions = [
    { label: 'All Brands', value: 'all' },
    ...brands.map((b) => ({ label: b, value: b })),
  ];

  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

  const selectCls = 'h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100 transition-all';

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Action Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-bold text-slate-800 truncate">Inventory</span>
            {summary && (
              <span className="shrink-0 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                {summary.totalModels} models · {summary.totalUnits} units
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-9 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Phone
        </Button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SparklineCard title="Models" subtitle="Unique inventory lines" value={summary.totalModels.toLocaleString()} color="blue" icon={Package} trendText={`${summary.totalUnits} total units`} />
          <SparklineCard title="Cost Value" subtitle="Purchase investment" value={fmt(summary.costValue)} color="purple" icon={Wallet} trendText="Total capital deployed" />
          <SparklineCard title="Retail Value" subtitle="Expected sales total" value={fmt(summary.sellingValue)} color="emerald" icon={ShoppingCart} trendText="At listed selling prices" />
          <SparklineCard title="Gross Margin" subtitle="Potential profit" value={fmt(summary.potentialProfit)} color="amber" icon={TrendingUp} trendText="On complete sellout" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3.5 shadow-xs">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand, model, variant or IMEI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Row */}
          <div className="flex gap-2 flex-wrap">
            <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectCls}>
              {brandOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className={selectCls}>
              {CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stock List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 gap-2 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> Loading inventory...
          </div>
        ) : stockItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No inventory items found</p>
              <p className="text-xs text-slate-400 mt-1">
                {debouncedSearch || brand !== 'all' || condition !== 'all' || status !== 'all'
                  ? 'Try clearing your search or adjusting filters.'
                  : 'Add your first phone to get started.'}
              </p>
            </div>
            {!debouncedSearch && brand === 'all' && condition === 'all' && status === 'all' && (
              <Button onClick={() => setShowAddModal(true)} size="sm" className="mt-1 text-xs h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add First Phone
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table — hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left font-bold text-slate-400 text-[10px] uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-400 text-[10px] uppercase tracking-wider">Condition</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-400 text-[10px] uppercase tracking-wider">Purchase</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-400 text-[10px] uppercase tracking-wider">Selling</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-400 text-[10px] uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-400 text-[10px] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-400 text-[10px] uppercase tracking-wider">Added</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-400 text-[10px] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {stockItems.map((item) => (
                    <tr key={item.id} className={cn('hover:bg-slate-50/60 transition-colors', getStockStatus(item) === 'out' && 'opacity-60')}>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{item.brand} {item.model}</p>
                          {item.variant && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.variant}</p>}
                          {item.imei && <p className="text-[10px] font-mono text-slate-400 mt-0.5">IMEI: {item.imei}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg border', conditionColors[item.condition] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500">{fmt(item.purchasePrice)}</td>
                      <td className="px-4 py-3.5 text-right text-xs font-black text-slate-900">{fmt(item.sellingPrice)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn('font-black text-xs', item.quantity === 0 ? 'text-slate-400' : item.quantity <= item.lowStockAlert ? 'text-amber-600' : 'text-slate-900')}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge item={item} /></td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{formatDate(item.dateAdded)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" disabled={item.quantity === 0} onClick={() => setSellItem(item)}
                            className="text-[11px] h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-40">
                            Sell
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditItem(item)}
                            className="text-[11px] h-7 px-2.5 rounded-lg border-slate-200 font-semibold text-slate-700 hover:bg-slate-100 gap-1">
                            <Pencil className="w-3 h-3" /> Update
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAdjustItem(item)}
                            className="text-[11px] h-7 px-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1">
                            <SlidersHorizontal className="w-3 h-3" /> Qty
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteItem(item)}
                            className="text-[11px] h-7 px-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 gap-1">
                            <Trash2 className="w-3 h-3" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards — visible only on small screens */}
            <div className="md:hidden divide-y divide-slate-100">
              {stockItems.map((item) => (
                <div key={item.id} className={cn('p-4 flex flex-col gap-3', getStockStatus(item) === 'out' && 'opacity-60')}>
                  {/* Phone Info + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 leading-tight">{item.brand} {item.model}</p>
                      {item.variant && <p className="text-xs text-slate-500 font-medium mt-0.5">{item.variant}</p>}
                      {item.imei && <p className="text-[10px] font-mono text-slate-400 mt-0.5">IMEI: {item.imei}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge item={item} />
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-lg border', conditionColors[item.condition] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                        {item.condition}
                      </span>
                    </div>
                  </div>

                  {/* Price Row */}
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Purchase</p>
                      <p className="text-xs font-semibold text-slate-600">{fmt(item.purchasePrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Selling</p>
                      <p className="text-xs font-black text-slate-900">{fmt(item.sellingPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">In Stock</p>
                      <p className={cn('text-xs font-black', item.quantity === 0 ? 'text-slate-400' : item.quantity <= item.lowStockAlert ? 'text-amber-600' : 'text-slate-900')}>
                        {item.quantity} units
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" disabled={item.quantity === 0} onClick={() => setSellItem(item)}
                      className="text-xs h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-40 flex-1">
                      Sell
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditItem(item)}
                      className="text-xs h-8 px-2.5 rounded-xl border-slate-200 font-semibold text-slate-700 gap-1">
                      <Pencil className="w-3 h-3" /> Update
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdjustItem(item)}
                      className="text-xs h-8 px-2 rounded-xl text-slate-600 hover:bg-slate-100 gap-1">
                      <SlidersHorizontal className="w-3 h-3" /> Qty
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteItem(item)}
                      className="text-xs h-8 px-2 rounded-xl text-rose-500 hover:bg-rose-50 gap-1">
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && stockItems.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-[10px] font-semibold text-slate-400">
            <span>{stockItems.length} item{stockItems.length !== 1 ? 's' : ''} shown</span>
            <span className="hidden sm:inline">Click "Sell" to record a new sale</span>
          </div>
        )}
      </div>

      {/* Modals */}
      <StockFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => onSuccess('Phone added to inventory.')} />
      <StockFormModal isOpen={!!editItem} onClose={() => setEditItem(null)} editItem={editItem} onSuccess={() => { setEditItem(null); onSuccess('Stock item updated.'); }} />
      <SellModal isOpen={!!sellItem} onClose={() => setSellItem(null)} initialStock={sellItem} allStock={allStock} onSuccess={() => { setSellItem(null); onSuccess('Sale recorded successfully!'); }} />
      <AdjustQtyModal isOpen={!!adjustItem} onClose={() => setAdjustItem(null)} item={adjustItem} onSuccess={() => { setAdjustItem(null); onSuccess('Stock quantity adjusted.'); }} />
      <DeleteConfirmModal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} item={deleteItem} onSuccess={() => { setDeleteItem(null); onSuccess('Item removed from inventory.'); }} />
    </div>
  );
}
