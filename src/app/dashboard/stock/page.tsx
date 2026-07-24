'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Package, RefreshCw, TrendingUp, Layers, Wallet, ShoppingCart, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
  if (status === 'low') return <Badge variant="warning">Low Stock ({item.quantity})</Badge>;
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

export default function StockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [allStock, setAllStock] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('all');
  const [condition, setCondition] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [sellItem, setSellItem] = useState<StockItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStockAction({
        search: debouncedSearch,
        brand,
        condition,
        status,
        sort,
        limit: 200,
      });
      if (res.success) {
        setStockItems(res.data as any);
        setSummary(res.summary as any);
        setBrands(res.brands || []);
      }
    } catch (e) {
      showToast('Failed to load stock.', 'error');
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
    showToast(msg);
    fetchStock();
    fetchAllStock();
  };

  const brandOptions = [
    { label: 'All Brands', value: 'all' },
    ...brands.map((b) => ({ label: b, value: b })),
  ];

  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          'fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl text-xs font-bold border transition-all duration-200 animate-in slide-in-from-top-2',
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        )}>
          {toast.msg}
        </div>
      )}

      {/* Action Control Strip */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Inventory Catalog</span>
          {summary && (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
              {summary.totalModels} models · {summary.totalUnits} units
            </span>
          )}
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="gap-2 shadow-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs h-9 px-4"
        >
          <Plus className="w-4 h-4" /> Add Phone
        </Button>
      </div>

      {/* Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SparklineCard
            title="Total Models"
            subtitle="Unique inventory lines"
            value={summary.totalModels.toLocaleString()}
            color="blue"
            icon={Package}
            trendText={`${summary.totalUnits} total units in stock`}
          />
          <SparklineCard
            title="Cost Value"
            subtitle="Total purchase investment"
            value={fmt(summary.costValue)}
            color="purple"
            icon={Wallet}
            trendText="Purchase cost baseline"
          />
          <SparklineCard
            title="Selling Value"
            subtitle="Expected retail total"
            value={fmt(summary.sellingValue)}
            color="emerald"
            icon={ShoppingCart}
            trendText="Target retail revenue"
          />
          <SparklineCard
            title="Potential Profit"
            subtitle="Estimated gross margin"
            value={fmt(summary.potentialProfit)}
            color="amber"
            icon={TrendingUp}
            trendText="Expected profit on full sellout"
          />
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand, model, variant, or IMEI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 transition-all"
            />
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-slate-800 focus:outline-none transition-all"
            >
              {brandOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-slate-800 focus:outline-none transition-all"
            >
              {CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-slate-800 focus:outline-none transition-all"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-slate-800 focus:outline-none transition-all"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stock Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 gap-2 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-600" /> Loading stock inventory...
          </div>
        ) : stockItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No matching stock items</p>
              <p className="text-xs text-slate-400 mt-1">
                {debouncedSearch || brand !== 'all' || condition !== 'all' || status !== 'all'
                  ? 'Try clearing or adjusting your search filters.'
                  : 'Get started by adding your first phone to inventory.'}
              </p>
            </div>
            {!debouncedSearch && brand === 'all' && condition === 'all' && status === 'all' && (
              <Button onClick={() => setShowAddModal(true)} size="sm" className="mt-2 text-xs h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add First Phone
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/60 border-b border-slate-100">
                  <TableHead className="py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider">Phone Details</TableHead>
                  <TableHead className="py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider">Condition</TableHead>
                  <TableHead className="py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider text-right">Purchase Price</TableHead>
                  <TableHead className="py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider text-right">Selling Price</TableHead>
                  <TableHead className="py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider text-center">Qty</TableHead>
                  <TableHead className="py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider">Date Added</TableHead>
                  <TableHead className="py-3 font-bold text-slate-400 text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100/80">
                {stockItems.map((item) => (
                  <TableRow key={item.id} className={cn('hover:bg-slate-50/70 transition-colors', getStockStatus(item) === 'out' && 'opacity-65 bg-slate-50/30')}>
                    <TableCell className="py-3.5">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{item.brand} {item.model}</p>
                        {item.variant && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.variant}</p>}
                        {item.imei && <p className="text-[10px] font-mono text-slate-400 mt-0.5">IMEI: {item.imei}</p>}
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200/60 px-2 py-1 rounded-md">
                        {item.condition}
                      </span>
                    </TableCell>

                    <TableCell className="py-3.5 text-right font-medium text-slate-600 text-xs">
                      {fmt(item.purchasePrice)}
                    </TableCell>

                    <TableCell className="py-3.5 text-right font-black text-slate-900 text-xs">
                      {fmt(item.sellingPrice)}
                    </TableCell>

                    <TableCell className="py-3.5 text-center">
                      <span className={cn(
                        'font-black text-xs',
                        item.quantity === 0 ? 'text-slate-400' : item.quantity <= item.lowStockAlert ? 'text-amber-600' : 'text-slate-900'
                      )}>
                        {item.quantity}
                      </span>
                    </TableCell>

                    <TableCell className="py-3.5 text-center">
                      <StatusBadge item={item} />
                    </TableCell>

                    <TableCell className="py-3.5 text-slate-500 text-xs font-medium">
                      {formatDate(item.dateAdded)}
                    </TableCell>

                    <TableCell className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          disabled={item.quantity === 0}
                          onClick={() => setSellItem(item)}
                          className="text-[11px] h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-40"
                        >
                          Sell
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditItem(item)}
                          className="text-[11px] h-7 px-2.5 rounded-lg border-slate-200 font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAdjustItem(item)}
                          className="text-[11px] h-7 px-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        >
                          Adjust
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteItem(item)}
                          className="text-[11px] h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Stock Item"
                        >
                          ✕
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && stockItems.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>Showing {stockItems.length} inventory model{stockItems.length !== 1 ? 's' : ''}</span>
            <span>Tip: Click 'Sell' to initiate instant invoice entry</span>
          </div>
        )}
      </div>

      {/* Modals */}
      <StockFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => onSuccess('Phone added to stock successfully.')}
      />
      <StockFormModal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        editItem={editItem}
        onSuccess={() => { setEditItem(null); onSuccess('Stock item updated successfully.'); }}
      />
      <SellModal
        isOpen={!!sellItem}
        onClose={() => setSellItem(null)}
        initialStock={sellItem}
        allStock={allStock}
        onSuccess={() => { setSellItem(null); onSuccess('Sale recorded successfully!'); }}
      />
      <AdjustQtyModal
        isOpen={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        item={adjustItem}
        onSuccess={() => { setAdjustItem(null); onSuccess('Stock quantity adjusted.'); }}
      />
      <DeleteConfirmModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        item={deleteItem}
        onSuccess={() => { setDeleteItem(null); onSuccess('Item deleted from stock.'); }}
      />
    </div>
  );
}
