'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, DollarSign, TrendingUp, Smartphone, Package,
  Eye, Search, Trash2, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createSaleAction, deleteSaleAction, getSalesAction } from '@/actions/sales';
import { getStockAction } from '@/actions/stock';
import { getAccessoriesAction } from '@/actions/accessories';
import { SaleDetailModal } from '@/components/sales/sale-detail-modal';
import { EditSaleModal } from '@/components/sales/edit-sale-modal';
import { SparklineCard } from '@/components/ui/sparkline-card';
import { ListSkeleton } from '@/components/ui/skeleton';
import { formatDateTime, cn } from '@/lib/utils';

interface StockItem {
  id: number;
  model: string;
  purchasePrice: number;
  quantity: number;
}

interface AccessoryItem {
  id: number;
  name: string;
  modelName: string;
  purchasePrice: number;
  quantity: number;
}

interface SaleItemRecord {
  id: number;
  brand: string;
  model: string;
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
  totalProfit: number;
  paymentMethod: string;
  saleDate: string;
  items: SaleItemRecord[];
}

type SaleType = 'mobile' | 'accessory';

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Card', value: 'Card' },
  { label: 'Easypaisa', value: 'Easypaisa' },
  { label: 'JazzCash', value: 'JazzCash' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Udhar (Credit)', value: 'Udhar' },
];

export default function DailySalesPage() {
  const [saleType, setSaleType] = useState<SaleType>('mobile');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [accessoryItems, setAccessoryItems] = useState<AccessoryItem[]>([]);
  const [modelInput, setModelInput] = useState('');
  const [modelError, setModelError] = useState('');
  const [quantityStr, setQuantityStr] = useState('1');
  const [salePrice, setSalePrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [saving, setSaving] = useState(false);

  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<{ totalRevenue: number; totalProfit: number; totalTransactions: number; totalUnits: number } | null>(null);
  const [loadingSales, setLoadingSales] = useState(true);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [deleteSaleId, setDeleteSaleId] = useState<number | null>(null);
  const [deletingSale, setDeletingSale] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mobile' | 'accessory'>('all');

  const fetchTodaySales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const res = await getSalesAction({ filter: 'today', search, page: 1, limit: 100 });
      if (res.success) {
        setTodaySales(res.data as any);
        setSummary(res.summary as any);
      }
    } catch {
      toast.error('Failed to load today\'s sales.');
    } finally {
      setLoadingSales(false);
    }
  }, [search]);

  const fetchStockItems = useCallback(async () => {
    const res = await getStockAction({ limit: 500 });
    if (res.success) setStockItems(res.data as any);
  }, []);

  const fetchAccessoryItems = useCallback(async () => {
    const res = await getAccessoriesAction({ limit: 500 });
    if (res.success) setAccessoryItems(res.data as any);
  }, []);

  useEffect(() => { fetchStockItems(); }, [fetchStockItems]);
  useEffect(() => { fetchAccessoryItems(); }, [fetchAccessoryItems]);
  useEffect(() => { fetchTodaySales(); }, [fetchTodaySales]);

  const availableStock = stockItems.filter((s) => s.quantity > 0);
  const availableAccessories = accessoryItems.filter((a) => a.quantity > 0);

  const matchedItem = saleType === 'mobile'
    ? stockItems.find((s) => s.model.toLowerCase().trim() === modelInput.toLowerCase().trim())
    : accessoryItems.find((a) => a.name.toLowerCase().trim() === modelInput.toLowerCase().trim());

  const filteredSales = typeFilter === 'all'
    ? todaySales
    : todaySales.filter(sale => sale.items.some(item => item.itemType === typeFilter));

  const handleSalePriceFocus = () => {
    if (!salePrice && matchedItem) {
      setSalePrice(String((matchedItem as any)?.purchasePrice || 0));
    }
  };

  const handleModelChange = (val: string) => {
    setModelInput(val);
    setModelError('');
  };

  const handleSubmit = async () => {
    const trimmed = modelInput.trim();
    if (!trimmed) { setModelError('Enter the exact model name from inventory.'); return; }
    if (trimmed !== modelInput) {
      setModelError('Extra spaces detected — copy the exact name without spaces.');
      return;
    }

    if (!matchedItem) {
      const suggestions = saleType === 'mobile'
        ? stockItems.map(s => s.model).slice(0, 10).join(', ')
        : accessoryItems.map(a => a.name).slice(0, 10).join(', ');
      const list = suggestions || (saleType === 'mobile' ? 'No phones' : 'No accessories');
      setModelError(`"${modelInput}" was not found. Check the spelling or copy the exact name from inventory. Available: ${list}`);
      return;
    }

    if (!salePrice || parseFloat(salePrice) <= 0) { toast.error('Please enter a sale price.'); return; }
    const qty = parseInt(quantityStr) || 0;
    if (qty < 1) { toast.error('Quantity must be at least 1.'); return; }
    if (qty > (matchedItem as any).quantity) {
      toast.error(`Only ${(matchedItem as any).quantity} unit${(matchedItem as any).quantity !== 1 ? 's' : ''} available.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        items: [{
          stockId: saleType === 'mobile' ? matchedItem.id : null,
          accessoryId: saleType === 'accessory' ? matchedItem.id : null,
          itemType: saleType,
          quantity: qty,
          salePrice: parseFloat(salePrice),
        }],
        customerName: customerName.trim() || 'Walk-in',
        paymentMethod,
        isUdhar: paymentMethod === 'Udhar',
        customerPhone: '',
        paidUpfront: 0,
        notes: '',
      };

      const result = await createSaleAction(payload);

      if (result.success) {
        toast.success('Sale recorded!');
        setModelInput('');
        setModelError('');
        setQuantityStr('1');
        setSalePrice('');
        setCustomerName('');
        setPaymentMethod('Cash');
        fetchStockItems();
        fetchAccessoryItems();
        fetchTodaySales();
      } else {
        toast.error(result.error || 'Sale failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!deleteSaleId) return;
    setDeletingSale(true);
    try {
      const res = await deleteSaleAction(deleteSaleId);
      if (res.success) {
        toast.success('Sale deleted. Stock restored.');
        setDeleteSaleId(null);
        fetchTodaySales();
        fetchStockItems();
        fetchAccessoryItems();
      } else {
        toast.error(res.error || 'Failed to delete sale.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setDeletingSale(false);
    }
  };

  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
          <SparklineCard title="Today Revenue" subtitle="Sales total today" value={fmt(summary.totalRevenue)} color="emerald" icon={DollarSign} trendText={`${summary.totalTransactions} transactions`} />
          <SparklineCard title="Today Profit" subtitle="Gross profit today" value={fmt(summary.totalProfit)} color="blue" icon={TrendingUp} trendText="Net earnings" />
          <SparklineCard title="Transactions" subtitle="Sales today" value={summary.totalTransactions.toLocaleString()} color="purple" icon={ShoppingCart} trendText="Completed" />
          <SparklineCard title="Units Sold" subtitle="Items sold today" value={summary.totalUnits.toLocaleString()} color="amber" icon={Package} trendText="Total units" />
        </div>
      )}

      {/* Quick Sale Form */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5">
        <h3 className="text-sm font-bold text-[#121212] mb-4">Record New Sale</h3>

        {/* Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setSaleType('mobile'); setModelInput(''); setModelError(''); setSalePrice(''); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              saleType === 'mobile' ? 'bg-[#121212] text-white shadow-xs' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            )}
          >
            <Smartphone className="w-4 h-4" /> Mobile
          </button>
          <button
            onClick={() => { setSaleType('accessory'); setModelInput(''); setModelError(''); setSalePrice(''); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              saleType === 'accessory' ? 'bg-[#121212] text-white shadow-xs' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            )}
          >
            <Package className="w-4 h-4" /> Accessory
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Model Name Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
              {saleType === 'mobile' ? 'Phone Model *' : 'Accessory Name *'}
            </label>
            <input
              type="text"
              value={modelInput}
              onChange={(e) => handleModelChange(e.target.value)}
              placeholder={saleType === 'mobile' ? 'e.g. iPhone 15 Pro Max' : 'e.g. Cover'}
              className={cn(
                'h-10 rounded-xl border bg-white px-3 text-xs font-medium text-[#121212] placeholder:text-neutral-400 focus:outline-none',
                modelError ? 'border-red-300 focus:border-red-500' : 'border-neutral-200 focus:border-[#121212]'
              )}
            />
            {matchedItem && (
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                {matchedItem.quantity} in stock · Rs {Number((matchedItem as any).purchasePrice).toLocaleString('en-PK')} cost
              </p>
            )}
            {modelError && (
              <p className="text-[10px] text-red-600 font-medium mt-0.5">{modelError}</p>
            )}
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
              Quantity {matchedItem ? `(max ${(matchedItem as any).quantity})` : ''}
            </label>
            <input
              type="number"
              min={1}
              max={matchedItem ? (matchedItem as any).quantity : 999}
              value={quantityStr}
              onChange={(e) => setQuantityStr(e.target.value)}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-bold text-[#121212] focus:border-[#121212] focus:outline-none"
            />
          </div>

          {/* Sale Price */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">Sale Price (Rs) *</label>
            <input
              type="number"
              min={0}
              value={salePrice}
              onFocus={handleSalePriceFocus}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0"
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-black text-[#121212] focus:border-[#121212] focus:outline-none"
            />
          </div>

          {/* Payment + Customer */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">Payment</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-[#121212] focus:border-[#121212] focus:outline-none"
            >
              {PAYMENT_METHODS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Customer Name */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">Customer</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in"
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-[#121212] placeholder:text-neutral-400 focus:border-[#121212] focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full h-10 rounded-xl bg-[#121212] hover:bg-neutral-800 text-white font-bold text-xs gap-2"
            >
              {saving ? 'Recording...' : `Record Sale ${salePrice ? `· Rs ${(parseFloat(salePrice) * (parseInt(quantityStr) || 1)).toLocaleString('en-PK')}` : ''}`}
            </Button>
          </div>
        </div>

        {/* Quick info */}
        {matchedItem && saleType === 'mobile' && (
          <div className="mt-3 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-neutral-500 font-medium">Cost: <span className="font-bold text-neutral-700">{fmt((matchedItem as StockItem).purchasePrice)}</span></span>
            {salePrice && parseFloat(salePrice) > 0 && (
              <span className="font-bold text-emerald-700">
                Profit: {fmt((parseFloat(salePrice) - (matchedItem as StockItem).purchasePrice) * (parseInt(quantityStr) || 1))}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Today's Sales List */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-4 flex-1">
            <div>
              <h3 className="text-sm font-bold text-[#121212]">Today&apos;s Sales</h3>
              <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                {typeFilter === 'all' ? todaySales.length : filteredSales.length} sale{(typeFilter === 'all' ? todaySales.length : filteredSales.length) !== 1 ? 's' : ''} today
                {typeFilter !== 'all' && <span className="text-neutral-300"> ({todaySales.length} total)</span>}
              </p>
            </div>
            <div className="flex gap-1 bg-neutral-100 rounded-xl p-0.5">
              <button
                onClick={() => setTypeFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                  typeFilter === 'all' ? 'bg-white text-[#121212] shadow-xs' : 'text-neutral-500 hover:text-neutral-700'
                )}
              >All</button>
              <button
                onClick={() => setTypeFilter('mobile')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                  typeFilter === 'mobile' ? 'bg-white text-[#121212] shadow-xs' : 'text-neutral-500 hover:text-neutral-700'
                )}
              >Mobile</button>
              <button
                onClick={() => setTypeFilter('accessory')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                  typeFilter === 'accessory' ? 'bg-white text-[#121212] shadow-xs' : 'text-neutral-500 hover:text-neutral-700'
                )}
              >Accessory</button>
            </div>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or item..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-neutral-200 bg-neutral-50 text-xs font-medium text-[#121212] placeholder:text-neutral-400 focus:border-[#121212] focus:outline-none"
            />
          </div>
        </div>

        {loadingSales ? (
          <ListSkeleton count={6} />
        ) : todaySales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-neutral-400" />
            </div>
            <p className="text-sm font-bold text-[#121212] mt-3">No sales today</p>
            <p className="text-xs text-neutral-500 mt-1">Use the form above to record your first sale.</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-neutral-400" />
            </div>
            <p className="text-sm font-bold text-[#121212] mt-3">No {typeFilter} sales found</p>
            <p className="text-xs text-neutral-500 mt-1">Try selecting a different filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="flex items-center gap-3 p-4 hover:bg-neutral-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-[#121212]">{sale.customerName}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-600">{sale.paymentMethod}</span>
                    <span className="text-[10px] text-neutral-400">{formatDateTime(sale.saleDate)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {sale.items.map((item) => (
                      <span key={item.id} className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border',
                        item.itemType === 'mobile' ? 'bg-blue-50 border-blue-200/60 text-blue-700' : 'bg-purple-50 border-purple-200/60 text-purple-700'
                      )}>
                        {item.itemType === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                        {item.quantity > 1 && <span className="font-bold">{item.quantity}x</span>}
                        {item.model}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-[#121212]">{fmt(sale.totalAmount)}</p>
                  <p className="text-[11px] font-bold text-emerald-600">+{fmt(sale.totalProfit)}</p>
                  <div className="flex items-center justify-end gap-1.5 mt-1.5">
                    <button
                      onClick={() => setSelectedSale(sale as any)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button
                      onClick={() => setEditSale(sale as any)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
                      title="Edit prices"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteSaleId(sale.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
                      title="Delete sale"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale as any}
          onClose={() => setSelectedSale(null)}
        />
      )}

      {editSale && (
        <EditSaleModal
          sale={editSale as any}
          onClose={() => setEditSale(null)}
          onSuccess={() => {
            fetchTodaySales();
            fetchAccessoryItems();
          }}
        />
      )}

      {deleteSaleId && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#121212]">Delete this sale?</h3>
            <p className="text-xs text-neutral-500 font-medium">Stock items will be returned to inventory. This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteSaleId(null)} className="rounded-xl text-xs h-9">Cancel</Button>
              <Button size="sm" disabled={deletingSale} onClick={handleDeleteSale} className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold">
                {deletingSale ? 'Deleting...' : 'Delete Sale'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
