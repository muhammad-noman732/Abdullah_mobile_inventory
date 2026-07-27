'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, DollarSign, TrendingUp, Smartphone, Package,
  Eye, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createSaleAction, getSalesAction } from '@/actions/sales';
import { getStockAction } from '@/actions/stock';
import { getAccessoriesAction } from '@/actions/accessories';
import { SaleDetailModal } from '@/components/sales/sale-detail-modal';
import { SparklineCard } from '@/components/ui/sparkline-card';
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
  const [selectedStockId, setSelectedStockId] = useState<number | ''>('');
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [saving, setSaving] = useState(false);

  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<{ totalRevenue: number; totalProfit: number; totalTransactions: number; totalUnits: number } | null>(null);
  const [loadingSales, setLoadingSales] = useState(true);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
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

  const selectedItem = saleType === 'mobile'
    ? stockItems.find((s) => s.id === selectedStockId)
    : accessoryItems.find((a) => a.id === selectedAccessoryId);

  const defaultPrice = saleType === 'mobile'
    ? (selectedItem as any)?.sellingPrice || 0
    : 0;

  const filteredSales = typeFilter === 'all'
    ? todaySales
    : todaySales.filter(sale => sale.items.some(item => item.itemType === typeFilter));

  const handleSalePriceFocus = () => {
    if (!salePrice && defaultPrice > 0) {
      setSalePrice(String(defaultPrice));
    }
  };

  const handleSubmit = async () => {
    if (saleType === 'mobile' && !selectedStockId) { toast.error('Please select a phone.'); return; }
    if (saleType === 'accessory' && !selectedAccessoryId) { toast.error('Please select an accessory.'); return; }
    if (!salePrice || parseFloat(salePrice) <= 0) { toast.error('Please enter a sale price.'); return; }
    if (quantity < 1) { toast.error('Quantity must be at least 1.'); return; }
    if (saleType === 'mobile') {
      const maxQty = stockItems.find(s => s.id === selectedStockId)?.quantity || 0;
      if (quantity > maxQty) { toast.error(`Only ${maxQty} unit${maxQty !== 1 ? 's' : ''} available.`); return; }
    }
    if (saleType === 'accessory') {
      const acc = accessoryItems.find((a) => a.id === selectedAccessoryId);
      if (acc && quantity > acc.quantity) { toast.error(`Only ${acc.quantity} available in stock.`); return; }
    }

    setSaving(true);
    try {
      const payload = {
        items: [{
          stockId: saleType === 'mobile' ? selectedStockId : null,
          accessoryId: saleType === 'accessory' ? selectedAccessoryId : null,
          itemType: saleType,
          quantity,
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
        setSelectedStockId('');
        setSelectedAccessoryId('');
        setQuantity(1);
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
            onClick={() => { setSaleType('mobile'); setSelectedAccessoryId(''); setSalePrice(''); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              saleType === 'mobile' ? 'bg-[#121212] text-white shadow-xs' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            )}
          >
            <Smartphone className="w-4 h-4" /> Mobile
          </button>
          <button
            onClick={() => { setSaleType('accessory'); setSelectedStockId(''); setSalePrice(''); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              saleType === 'accessory' ? 'bg-[#121212] text-white shadow-xs' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            )}
          >
            <Package className="w-4 h-4" /> Accessory
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Item Select */}
          {saleType === 'mobile' ? (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">Select Phone *</label>
              <select
                value={selectedStockId}
                onChange={(e) => { setSelectedStockId(Number(e.target.value)); setSalePrice(''); }}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-[#121212] focus:border-[#121212] focus:outline-none"
              >
                <option value="">Choose a phone...</option>
                {availableStock.map((s) => (
                  <option key={s.id} value={s.id}>{s.model} — {s.quantity} in stock</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">Select Accessory *</label>
              <select
                value={selectedAccessoryId}
                onChange={(e) => { setSelectedAccessoryId(Number(e.target.value)); setSalePrice(''); }}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-[#121212] focus:border-[#121212] focus:outline-none"
              >
                <option value="">Choose an accessory...</option>
                {availableAccessories.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} — {a.quantity} in stock</option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
              Quantity {selectedStockId && saleType === 'mobile' ? `(max ${stockItems.find(s => s.id === selectedStockId)?.quantity || 0})` : ''}
              {selectedAccessoryId && saleType === 'accessory' ? `(max ${accessoryItems.find(a => a.id === selectedAccessoryId)?.quantity || 0})` : ''}
            </label>
            <input
              type="number"
              min={1}
              max={saleType === 'mobile'
                ? (stockItems.find(s => s.id === selectedStockId)?.quantity || 1)
                : (accessoryItems.find(a => a.id === selectedAccessoryId)?.quantity || 1)
              }
              value={quantity}
              onChange={(e) => {
                const maxQty = saleType === 'mobile'
                  ? (stockItems.find(s => s.id === selectedStockId)?.quantity || 999)
                  : (accessoryItems.find(a => a.id === selectedAccessoryId)?.quantity || 999);
                const val = Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1));
                setQuantity(val);
              }}
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
              {saving ? 'Recording...' : `Record Sale ${salePrice ? `· Rs ${(parseFloat(salePrice) * quantity).toLocaleString('en-PK')}` : ''}`}
            </Button>
          </div>
        </div>

        {/* Quick info */}
        {selectedItem && saleType === 'mobile' && (
          <div className="mt-3 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-neutral-500 font-medium">Cost: <span className="font-bold text-neutral-700">{fmt((selectedItem as StockItem).purchasePrice)}</span></span>
            {salePrice && parseFloat(salePrice) > 0 && (
              <span className="font-bold text-emerald-700">
                Profit: {fmt((parseFloat(salePrice) - (selectedItem as StockItem).purchasePrice) * quantity)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Today's Sales List */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
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
          <div className="relative w-48 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter today..."
              className="w-full h-8 pl-8 pr-3 rounded-xl border border-neutral-200 bg-neutral-50 text-xs font-medium text-[#121212] placeholder:text-neutral-400 focus:border-[#121212] focus:outline-none"
            />
          </div>
        </div>

        {loadingSales ? (
          <div className="flex items-center justify-center py-16 text-neutral-400 text-xs">Loading today&apos;s sales...</div>
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
              <div key={sale.id} className="p-4 hover:bg-neutral-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
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
                    <button onClick={() => setSelectedSale(sale as any)} className="mt-1 text-[10px] text-neutral-400 hover:text-[#121212] flex items-center gap-1 ml-auto">
                      <Eye className="w-3 h-3" /> View
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
    </div>
  );
}
