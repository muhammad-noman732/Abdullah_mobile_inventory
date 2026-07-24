'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, DollarSign, Download, RefreshCw, Award, ShoppingCart,
  Layers, CreditCard, Target, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReportsAction } from '@/actions/reports';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

type Period = 'today' | 'week' | 'month' | 'lastmonth' | 'year' | 'custom';

interface ReportData {
  summary: {
    revenue: number;
    costOfGoods: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    transactionsCount: number;
    unitsSold: number;
    avgSaleValue: number;
    udharCollected: number;
  };
  topSelling: { brand: string; model: string; label: string; unitsSold: number; revenue: number; profit: number }[];
  expenseBreakdown: { category: string; amount: number; value: number }[];
  paymentMethods: { method: string; count: number; total: number; value: number }[];
  dailyBreakdown: { date: string; revenue: number; profit: number; cost: number; transactions: number }[];
  trendData: { date: string; revenue: number; profit: number }[];
}

const PIE_COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];
const EXPENSE_COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#a1a1aa', '#d4d4d8'];

const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;
const fmtShort = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `${Math.round(n)}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-slate-700 mb-1.5">{label}</p>
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

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReportsAction(
        period,
        period === 'custom' ? customFrom : undefined,
        period === 'custom' ? customTo : undefined
      );
      if (res.success) setData(res.data as any);
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', data.summary.revenue],
      ['Cost of Goods', data.summary.costOfGoods],
      ['Gross Profit', data.summary.grossProfit],
      ['Total Expenses', data.summary.totalExpenses],
      ['Net Profit', data.summary.netProfit],
      ['Transactions', data.summary.transactionsCount],
      ['Units Sold', data.summary.unitsSold],
      [], ['Top Selling Models'],
      ['Brand', 'Model', 'Units Sold', 'Revenue', 'Profit'],
      ...data.topSelling.map((t) => [t.brand, t.model, t.unitsSold, t.revenue, t.profit]),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `report_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const PERIOD_TABS: { label: string; value: Period }[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last Month', value: 'lastmonth' },
    { label: 'Year', value: 'year' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ─── Period Selector + Export ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5 flex-wrap">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className={cn(
                'px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap',
                period === tab.value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 px-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-slate-400" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 px-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-slate-400" />
            </div>
          )}
          <Button variant="outline" onClick={exportCSV} disabled={!data || loading} className="gap-2 text-xs h-9 rounded-xl border-slate-200">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center py-32 text-slate-400 gap-2 text-sm shadow-xs">
          <RefreshCw className="w-4 h-4 animate-spin" /> Generating analytics...
        </div>
      ) : data ? (
        <>
          {/* ─── Financial Summary ───────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Revenue', value: fmt(data.summary.revenue), sub: `${data.summary.transactionsCount} transactions`, positive: true },
              { label: 'Cost of Goods', value: fmt(data.summary.costOfGoods), sub: `${data.summary.unitsSold} units sold`, positive: null },
              { label: 'Gross Profit', value: fmt(data.summary.grossProfit), sub: data.summary.revenue > 0 ? `${((data.summary.grossProfit / data.summary.revenue) * 100).toFixed(1)}% margin` : '—', positive: true },
              { label: 'Expenses', value: fmt(data.summary.totalExpenses), sub: 'Operational costs', positive: false },
              { label: 'Net Profit', value: fmt(data.summary.netProfit), sub: 'After all costs', positive: data.summary.netProfit >= 0 },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</span>
                  {card.positive !== null && (
                    card.positive
                      ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      : <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                  )}
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2 leading-none">{card.value}</p>
                <p className="text-[11px] font-medium text-slate-500 mt-1.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ─── Revenue & Profit Trend ──────────────────────────────── */}
          {data.trendData.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Revenue & Profit Trend</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Daily breakdown for selected period</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-900"/><span className="text-slate-500 font-medium">Revenue</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/><span className="text-slate-500 font-medium">Profit</span></div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.trendData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0f172a" strokeWidth={2} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ─── Charts Grid ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Top Selling Models */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-5">
                <Award className="w-4 h-4 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Top Selling Models</h3>
                  <p className="text-[10px] text-slate-500">By units sold</p>
                </div>
              </div>
              {data.topSelling.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-14">No sales data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.topSelling.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip formatter={(v: any) => [v, 'Units']} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="unitsSold" name="Units" fill="#0f172a" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-5">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Payment Methods</h3>
                  <p className="text-[10px] text-slate-500">Revenue by payment type</p>
                </div>
              </div>
              {data.paymentMethods.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-14">No data for this period</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="45%" height={170}>
                    <PieChart>
                      <Pie data={data.paymentMethods} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value" strokeWidth={0}>
                        {data.paymentMethods.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [fmt(v), 'Revenue']} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 flex flex-col gap-2.5">
                    {data.paymentMethods.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-slate-600 font-medium">{p.method}</span>
                        </div>
                        <span className="font-black text-slate-900">{fmt(p.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Expenses by Category */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-5">
                <Layers className="w-4 h-4 text-rose-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Expenses by Category</h3>
                  <p className="text-[10px] text-slate-500">Operational cost breakdown</p>
                </div>
              </div>
              {data.expenseBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-14">No expenses for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.expenseBreakdown} margin={{ top: 0, right: 5, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={45} />
                    <Tooltip formatter={(v: any) => [fmt(v), 'Amount']} contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
                      {data.expenseBreakdown.map((_, i) => (
                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Model Performance Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Model Performance</h3>
                  <p className="text-[10px] text-slate-500">Revenue, profit & margin per model</p>
                </div>
              </div>
              {data.topSelling.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">No data for this period</p>
              ) : (
                <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left pb-2.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Model</th>
                        <th className="text-right pb-2.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Units</th>
                        <th className="text-right pb-2.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Revenue</th>
                        <th className="text-right pb-2.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Profit</th>
                        <th className="text-right pb-2.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.topSelling.slice(0, 7).map((item, i) => {
                        const margin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : '0';
                        return (
                          <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 font-semibold text-slate-800">{item.brand} {item.model}</td>
                            <td className="py-2.5 text-right text-slate-600">{item.unitsSold}</td>
                            <td className="py-2.5 text-right font-bold text-slate-900">{fmt(item.revenue)}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-700">{fmt(item.profit)}</td>
                            <td className="py-2.5 text-right">
                              <span className={cn('font-black', Number(margin) >= 15 ? 'text-emerald-700' : Number(margin) >= 5 ? 'text-amber-600' : 'text-rose-600')}>{margin}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ─── Daily Breakdown Table ────────────────────────────────── */}
          {data.dailyBreakdown.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Daily Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100">
                      {['Date', 'Transactions', 'Revenue', 'Cost', 'Profit'].map((h) => (
                        <th key={h} className={cn('px-5 py-2.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]', h === 'Date' ? 'text-left' : 'text-right')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.dailyBreakdown.map((day, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-2.5 font-semibold text-slate-700">{day.date}</td>
                        <td className="px-5 py-2.5 text-right text-slate-500">{day.transactions}</td>
                        <td className="px-5 py-2.5 text-right font-bold text-slate-900">{fmt(day.revenue)}</td>
                        <td className="px-5 py-2.5 text-right text-slate-500">{fmt(day.cost)}</td>
                        <td className="px-5 py-2.5 text-right font-black text-emerald-700">{fmt(day.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
