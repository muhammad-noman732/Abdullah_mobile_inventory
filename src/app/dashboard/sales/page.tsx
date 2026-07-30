'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Receipt, TrendingUp, DollarSign,
  ShoppingCart, CalendarDays, Trash2, Eye, ChevronLeft, ChevronRight,
  Package, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SaleDetailModal } from '@/components/sales/sale-detail-modal';
import { getSalesAction, deleteSaleAction } from '@/actions/sales';
import { cn, formatDateTime } from '@/lib/utils';
import { SparklineCard } from '@/components/ui/sparkline-card';
import { TableSkeleton } from '@/components/ui/skeleton';

interface SaleItem {
  id: number;
  brand: string;
  model: string;
  variant: string | null;
  quantity: number;
  salePrice: number;
  subtotal: number;
  profit: number;
  itemType: string;
}

interface Sale {
  id: number;
  customerName: string;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  paymentMethod: string;
  isUdhar: boolean;
  notes: string | null;
  saleDate: string;
  createdAt: string;
  items: SaleItem[];
}

interface Summary {
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  totalUnits: number;
}

type QuickFilter = 'today' | 'week' | 'month' | 'lastmonth' | 'custom';

const PAYMENT_METHODS = [
  { label: 'All Payments', value: 'all' },
  { label: 'Cash', value: 'Cash' },
  { label: 'Card', value: 'Card' },
  { label: 'Easypaisa', value: 'Easypaisa' },
  { label: 'JazzCash', value: 'JazzCash' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
];

const METHOD_BADGES: Record<string, string> = {
  Cash: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
  Udhar: 'text-rose-700 bg-rose-50 border-rose-200/60',
  Card: 'text-blue-700 bg-blue-50 border-blue-200/60',
  Easypaisa: 'text-green-700 bg-green-50 border-green-200/60',
  JazzCash: 'text-orange-700 bg-orange-50 border-orange-200/60',
  'Bank Transfer': 'text-violet-700 bg-violet-50 border-violet-200/60',
};

const METHOD_BAR: Record<string, string> = {
  Cash: 'bg-emerald-400',
  Udhar: 'bg-rose-400',
  Card: 'bg-blue-400',
  Easypaisa: 'bg-green-400',
  JazzCash: 'bg-orange-400',
  'Bank Transfer': 'bg-violet-400',
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className={cn('h-3 rounded-full bg-neutral-200/70', i === 6 ? 'w-16 ml-auto' : 'w-24')} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="p-4 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-3 w-32 rounded-full bg-neutral-200/70" />
        <div className="h-5 w-16 rounded-lg bg-neutral-200/70" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-full bg-neutral-200/70" />
        <div className="h-6 w-24 rounded-full bg-neutral-200/70" />
      </div>
      <div className="flex justify-between pt-2 border-t border-neutral-100">
        <div className="h-3 w-20 rounded-full bg-neutral-200/70" />
        <div className="h-3 w-16 rounded-full bg-neutral-200/70" />
      </div>
    </div>
  );
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [search, setSearch] = useState('');

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalesAction({
        filter: quickFilter,
        from: quickFilter === 'custom' ? fromDate || undefined : undefined,
        to: quickFilter === 'custom' ? toDate || undefined : undefined,
        paymentMethod,
        search: debouncedSearch,
        page,
        limit: 15,
      });

      if (res.success) {
        setSales(res.data as any);
        setSummary(res.summary as any);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch {
      toast.error('Failed to load sales.');
    } finally {
      setLoading(false);
    }
  }, [quickFilter, fromDate, toDate, paymentMethod, debouncedSearch, page]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await deleteSaleAction(id);
      if (res.success) {
        toast.success('Sale deleted.');
        setDeleteConfirmId(null);
        fetchSales();
      } else {
        toast.error(res.error || 'Failed to delete.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

  const quickBtns: { label: string; value: QuickFilter }[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last Month', value: 'lastmonth' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SparklineCard title="Total Revenue" subtitle="Filtered period total" value={fmt(summary.totalRevenue)} color="emerald" icon={DollarSign} trendText={`${summary.totalTransactions} transactions`} />
          <SparklineCard title="Total Profit" subtitle="Gross profit margin" value={fmt(summary.totalProfit)} color="blue" icon={TrendingUp} trendText="Net gross earnings" />
          <SparklineCard title="Transactions" subtitle="Invoices generated" value={summary.totalTransactions.toLocaleString()} color="purple" icon={Receipt} trendText="Completed sales logs" />
          <SparklineCard title="Units Sold" subtitle="Items sold" value={summary.totalUnits.toLocaleString()} color="amber" icon={ShoppingCart} trendText="Total items sold" />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-neutral-500 mr-1 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-neutral-400" /> Period:
          </span>
          {quickBtns.map((btn) => (
            <button
              key={btn.value}
              onClick={() => { setQuickFilter(btn.value); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                quickFilter === btn.value
                  ? 'bg-[#121212] text-white shadow-xs'
                  : 'bg-neutral-100/80 text-neutral-500 hover:bg-neutral-200/80'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {quickFilter === 'custom' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-neutral-500 font-medium">From</span>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="h-9 px-3 text-xs border border-neutral-200 rounded-xl bg-white text-[#121212] focus:outline-none focus:border-[#121212]" />
            <span className="text-xs text-neutral-500 font-medium">To</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="h-9 px-3 text-xs border border-neutral-200 rounded-xl bg-white text-[#121212] focus:outline-none focus:border-[#121212]" />
          </div>
        )}

        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search customer name or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-[#121212] placeholder:text-neutral-400 focus:border-[#121212] focus:outline-none transition-all"
            />
          </div>
          <select
            value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-600 focus:border-[#121212] focus:outline-none transition-all"
          >
            {PAYMENT_METHODS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-sm font-bold text-[#121212]">No sales found</p>
            <p className="text-xs text-neutral-500 mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50/60 border-b border-neutral-100">
                    <th className="px-5 py-3 text-left font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Customer</th>
                    <th className="px-5 py-3 text-left font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Items</th>
                    <th className="px-5 py-3 text-center font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Payment</th>
                    <th className="px-5 py-3 text-right font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Total</th>
                    <th className="px-5 py-3 text-right font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Profit</th>
                    <th className="px-5 py-3 text-left font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Date</th>
                    <th className="px-5 py-3 text-right font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100/80">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-[#121212] text-xs">{sale.customerName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {sale.items.map((i) => (
                            <span
                              key={i.id}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border',
                                i.itemType === 'accessory'
                                  ? 'bg-purple-50 border-purple-200/60 text-purple-700'
                                  : 'bg-blue-50 border-blue-200/60 text-blue-700'
                              )}
                            >
                              {i.itemType === 'accessory' ? <Package className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                              {i.quantity > 1 && <span className="font-bold">{i.quantity}x</span>}
                              {i.model}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg border', METHOD_BADGES[sale.paymentMethod] || 'bg-neutral-100 text-neutral-600 border-neutral-200')}>
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-[#121212] text-xs">{fmt(sale.totalAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-700 text-xs">+{fmt(sale.totalProfit)}</td>
                      <td className="px-5 py-3.5 text-neutral-500 text-xs font-medium whitespace-nowrap">{formatDateTime(sale.saleDate)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setSelectedSale(sale)}
                            className="text-[11px] h-7 px-2.5 rounded-lg border-neutral-200 font-semibold text-neutral-600 hover:bg-neutral-100">
                            <Eye className="w-3.5 h-3.5 mr-1 text-neutral-400" /> View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(sale.id)}
                            className="text-[11px] h-7 w-7 p-0 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden">
              {sales.map((sale, idx) => (
                <div key={sale.id} className={cn('relative p-4 space-y-3', idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50')}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#121212]">{sale.customerName}</p>
                      <p className="text-[11px] text-neutral-400 font-medium mt-0.5">{formatDateTime(sale.saleDate)}</p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0', METHOD_BADGES[sale.paymentMethod] || 'bg-neutral-100 text-neutral-600 border-neutral-200')}>
                      {sale.paymentMethod}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sale.items.map((i) => (
                      <span key={i.id} className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border',
                        i.itemType === 'accessory' ? 'bg-purple-50 border-purple-200/60 text-purple-700' : 'bg-blue-50 border-blue-200/60 text-blue-700'
                      )}>
                        {i.itemType === 'accessory' ? <Package className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                        {i.quantity > 1 && <span className="font-bold">{i.quantity}x</span>}
                        {i.model}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                    <div>
                      <p className="text-[11px] font-medium text-neutral-400">Total</p>
                      <p className="text-sm font-black text-[#121212]">{fmt(sale.totalAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-neutral-400">Profit</p>
                      <p className="text-sm font-bold text-emerald-700">+{fmt(sale.totalProfit)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setSelectedSale(sale)} className="text-[11px] h-8 px-2.5 rounded-lg border-neutral-200 font-semibold">
                        <Eye className="w-3.5 h-3.5 text-neutral-400" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(sale.id)} className="text-[11px] h-8 w-8 p-0 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className={cn('absolute bottom-0 left-4 right-4 h-0.5 rounded-full', METHOD_BAR[sale.paymentMethod] || 'bg-neutral-200')} />
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && sales.length > 0 && (
          <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/40 flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 text-xs rounded-xl border-neutral-200">
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 text-xs rounded-xl border-neutral-200">
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedSale && <SaleDetailModal sale={selectedSale as any} onClose={() => setSelectedSale(null)} />}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-100 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#121212]">Delete this sale?</h3>
            <p className="text-xs text-neutral-500 font-medium">This will permanently remove this transaction.</p>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)} className="rounded-xl text-xs h-9">Cancel</Button>
              <Button size="sm" disabled={deleting} onClick={() => handleDelete(deleteConfirmId)} className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold">
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
