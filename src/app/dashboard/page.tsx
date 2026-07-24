'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw, ArrowRight, ShoppingCart, Eye, Wallet, CheckCircle2,
  DollarSign, TrendingUp, Package, CreditCard
} from 'lucide-react';
import { SparklineCard } from '@/components/ui/sparkline-card';
import { SaleDetailModal } from '@/components/sales/sale-detail-modal';
import { getDashboardMetricsAction } from '@/actions/dashboard';
import { cn, formatDate } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface DashboardMetrics {
  totalStockUnits: number;
  stockCostValue: number;
  stockSellingValue: number;
  todaySalesRevenue: number;
  todayProfit: number;
  todayTransactions: number;
  monthRevenue: number;
  monthProfit: number;
  monthTransactions: number;
  outstandingUdhar: number;
  activeDebtors: number;
  lowStockCount: number;
  lowStockItems: any[];
  recentSales: any[];
  urgentUdhar: any[];
  sparklines: {
    revenue: { day?: string; val: number }[];
    profit: { day?: string; val: number }[];
  };
  paymentMethods: { name: string; value: number; count: number }[];
  topSelling: { label: string; units: number; amount: number }[];
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b'];

const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

const fmtShort = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `${Math.round(n)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-md text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mt-0.5">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-slate-500">{entry.name}:</span>
            <span className="font-bold text-slate-900">{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDashboardMetricsAction();
      if (res.success) setMetrics(res.data as DashboardMetrics);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 gap-2 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin text-slate-600" /> Loading Dashboard...
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="flex flex-col gap-5 pb-6">

      {/* ── 1. TOP CARDS ROW (Ultra Clean & 100% Readable) ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SparklineCard
          title="Today Sales"
          subtitle="Daily sales performance"
          value={fmt(metrics.todaySalesRevenue)}
          color="emerald"
          icon={DollarSign}
          trendText={`${metrics.todayTransactions} transactions today`}
        />
        <SparklineCard
          title="This Month"
          subtitle="Monthly revenue total"
          value={fmt(metrics.monthRevenue)}
          color="blue"
          icon={TrendingUp}
          trendText={`${metrics.monthTransactions} sales recorded`}
        />
        <SparklineCard
          title="Stock Value"
          subtitle="Total inventory value"
          value={fmt(metrics.stockSellingValue)}
          color="purple"
          icon={Package}
          trendText={`${metrics.totalStockUnits} total units in stock`}
        />
        <SparklineCard
          title="Udhar Outstanding"
          subtitle="Pending customer credit"
          value={fmt(metrics.outstandingUdhar)}
          color="amber"
          icon={Wallet}
          trendText={`${metrics.activeDebtors} active debtors`}
        />
      </div>

      {/* ── 2. CHARTS SECTION (Revenue Trend + Payment Methods Pie) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Revenue & Profit Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Sales & Revenue Analytics</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">7-day performance trajectory</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600">Profit</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics.sparklines.revenue} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="chartRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtShort(v)} width={45} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="val" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#chartRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Payment Methods PieChart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Payment Methods</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Revenue channels breakdown</p>
          </div>

          {metrics.paymentMethods.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-xs text-slate-400">
              No payments recorded this month
            </div>
          ) : (
            <div className="flex items-center gap-3 my-auto">
              <ResponsiveContainer width="50%" height={150}>
                <PieChart>
                  <Pie
                    data={metrics.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {metrics.paymentMethods.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [fmt(v), 'Total']} />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex-1 flex flex-col gap-2">
                {metrics.paymentMethods.map((pm, i) => (
                  <div key={pm.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-slate-600 font-medium">{pm.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{fmt(pm.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. DATA TABLES ROW (Recent Sales + Pending Udhar) ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Recent Sales</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Latest transactions log</p>
            </div>
            <Link href="/dashboard/sales" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentSales.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-xs text-slate-400">
              No sales logged yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100/80 flex-1">
              {metrics.recentSales.map((sale) => (
                <div key={sale.id} className="py-3 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                      <ShoppingCart className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{sale.customerName}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {sale.items.map((i: any) => `${i.brand} ${i.model}`).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {sale.paymentMethod}
                    </span>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs font-black text-slate-900">{fmt(sale.totalAmount)}</p>
                      <p className="text-[10px] font-bold text-emerald-600">+{fmt(sale.totalProfit)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedSale(sale)}
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Collections / Udhar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Pending Collections</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Active customer credit entries</p>
            </div>
            <Link href="/dashboard/udhar" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Udhar Khata <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.urgentUdhar.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-xs font-bold text-slate-700">All credit collected!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/80 flex-1">
              {metrics.urgentUdhar.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-xl transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{u.customerName}</p>
                    <p className="text-[11px] text-slate-400">{u.customerPhone}</p>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-black text-amber-600">{fmt(u.remaining)}</p>
                    <p className="text-[10px] text-slate-400">
                      {u.dueDate ? `Due ${formatDate(u.dueDate)}` : 'No due date'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
}
