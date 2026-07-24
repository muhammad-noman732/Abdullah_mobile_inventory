'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Receipt, RefreshCw, TrendingUp, DollarSign,
  ShoppingCart, CalendarDays, Trash2, Eye, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SaleDetailModal } from '@/components/sales/sale-detail-modal';
import { getSalesAction, deleteSaleAction } from '@/actions/sales';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { SparklineCard } from '@/components/ui/sparkline-card';

interface SaleItem {
  id: number;
  brand: string;
  model: string;
  variant: string | null;
  quantity: number;
  salePrice: number;
  subtotal: number;
  profit: number;
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
  { label: 'Udhar', value: 'Udhar' },
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

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [search, setSearch] = useState('');

  // Modals & detail view
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalesAction({
        from: quickFilter === 'custom' ? fromDate : undefined,
        to: quickFilter === 'custom' ? toDate : undefined,
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
      showToast('Failed to load sales.', 'error');
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
        showToast('Sale entry soft deleted.');
        setDeleteConfirmId(null);
        fetchSales();
      } else {
        showToast(res.error || 'Failed to delete sale.', 'error');
      }
    } catch {
      showToast('Error deleting sale.', 'error');
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
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          'fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl text-xs font-bold border transition-all duration-200 animate-in slide-in-from-top-2',
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        )}>
          {toast.msg}
        </div>
      )}

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SparklineCard
            title="Total Revenue"
            subtitle="Filtered period total"
            value={fmt(summary.totalRevenue)}
            color="emerald"
            icon={DollarSign}
            trendText={`${summary.totalTransactions} transactions`}
          />
          <SparklineCard
            title="Total Profit"
            subtitle="Gross profit margin"
            value={fmt(summary.totalProfit)}
            color="blue"
            icon={TrendingUp}
            trendText="Net gross earnings"
          />
          <SparklineCard
            title="Transactions"
            subtitle="Invoices generated"
            value={summary.totalTransactions.toLocaleString()}
            color="purple"
            icon={Receipt}
            trendText="Completed sales logs"
          />
          <SparklineCard
            title="Units Sold"
            subtitle="Mobile units dispatched"
            value={summary.totalUnits.toLocaleString()}
            color="amber"
            icon={ShoppingCart}
            trendText="Total items sold"
          />
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col gap-3">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> Period:
          </span>
          {quickBtns.map((btn) => (
            <button
              key={btn.value}
              onClick={() => { setQuickFilter(btn.value); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                quickFilter === btn.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Custom Dates */}
        {quickFilter === 'custom' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">From</span>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="h-9 px-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-slate-800" />
            <span className="text-xs text-slate-500 font-medium">To</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="h-9 px-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-slate-800" />
          </div>
        )}

        {/* Search + Payment Filter */}
        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer name or mobile model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none transition-all"
            />
          </div>
          <select
            value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-slate-800 focus:outline-none transition-all"
          >
            {PAYMENT_METHODS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Sales Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 gap-2 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-600" /> Loading transaction logs...
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No sales transactions found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your date range or search query.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Customer</th>
                  <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Items Purchased</th>
                  <th className="px-5 py-3 text-center font-bold text-slate-400 uppercase tracking-wider text-[10px]">Payment</th>
                  <th className="px-5 py-3 text-right font-bold text-slate-400 uppercase tracking-wider text-[10px]">Total Amount</th>
                  <th className="px-5 py-3 text-right font-bold text-slate-400 uppercase tracking-wider text-[10px]">Profit</th>
                  <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">Sale Date</th>
                  <th className="px-5 py-3 text-right font-bold text-slate-400 uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900 text-xs">{sale.customerName}</p>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        {sale.items.map((i) => (
                          <span key={i.id} className="text-xs text-slate-700 font-medium">
                            {i.quantity > 1 ? `${i.quantity}x ` : ''}{i.brand} {i.model} {i.variant ? `(${i.variant})` : ''}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-1 rounded-lg border',
                        METHOD_BADGES[sale.paymentMethod] || 'bg-slate-100 text-slate-700 border-slate-200'
                      )}>
                        {sale.paymentMethod}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right font-black text-slate-900 text-xs">
                      {fmt(sale.totalAmount)}
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-emerald-700 text-xs">
                      +{fmt(sale.totalProfit)}
                    </td>

                    <td className="px-5 py-3.5 text-slate-500 text-xs font-medium">
                      {formatDateTime(sale.saleDate)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSale(sale)}
                          className="text-[11px] h-7 px-2.5 rounded-lg border-slate-200 font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(sale.id)}
                          className="text-[11px] h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Sale"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && sales.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 text-xs rounded-xl border-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 text-xs rounded-xl border-slate-200"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale as any}
          onClose={() => setSelectedSale(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Sale Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This transaction will be soft-deleted. Historical revenue numbers will be recalculated.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button size="sm" disabled={deleting} onClick={() => handleDelete(deleteConfirmId)} className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold">
                {deleting ? 'Deleting...' : 'Soft Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
