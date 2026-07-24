'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wallet, Search, Plus, RefreshCw, AlertCircle, CheckCircle2,
  Clock, DollarSign, Calendar, ChevronRight, Phone, User, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createUdharAction, recordUdharPaymentAction, deleteUdharAction, getUdharAction, getUdharPaymentHistoryAction } from '@/actions/udhar';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { SparklineCard } from '@/components/ui/sparkline-card';

interface UdharPayment {
  id: number;
  amountPaid: number;
  paymentMethod: string;
  notes: string | null;
  paymentDate: string;
}

interface UdharItem {
  id: number;
  customerName: string;
  customerPhone: string;
  phoneSold: string | null;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: 'Unpaid' | 'Partial' | 'Paid';
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  payments?: UdharPayment[];
}

interface Summary {
  totalOutstanding: number;
  activeDebtors: number;
  overdueAmount: number;
  collectedThisMonth: number;
}

type StatusFilter = 'all' | 'Unpaid' | 'Partial' | 'Paid' | 'Overdue';

export default function UdharPage() {
  const [items, setItems] = useState<UdharItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Add Entry Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPhoneSold, setFormPhoneSold] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState('');
  const [formPaidAmount, setFormPaidAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Record Payment Modal
  const [payTarget, setPayTarget] = useState<UdharItem | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Payment History Drawer / Modal
  const [historyTarget, setHistoryTarget] = useState<UdharItem | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<UdharPayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<UdharItem | null>(null);

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

  const fetchUdhar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUdharAction({
        search: debouncedSearch,
        status: statusFilter,
        limit: 200,
      });
      if (res.success) {
        setItems(res.data as any);
        setSummary(res.summary as any);
      }
    } catch {
      showToast('Failed to load udhar data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => { fetchUdhar(); }, [fetchUdhar]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formName.trim() || !formPhone.trim() || !formTotalAmount) {
      setFormError('Name, phone number, and total amount are required.');
      return;
    }
    setSubmittingAdd(true);
    const result = await createUdharAction({
      customerName: formName.trim(),
      customerPhone: formPhone.trim(),
      phoneSold: formPhoneSold.trim() || undefined,
      totalAmount: parseFloat(formTotalAmount),
      paidAmount: formPaidAmount ? parseFloat(formPaidAmount) : 0,
      dueDate: formDueDate || undefined,
      notes: formNotes.trim() || undefined,
    });

    if (result.success) {
      showToast('Udhar entry recorded successfully!');
      setShowAddModal(false);
      setFormName(''); setFormPhone(''); setFormPhoneSold(''); setFormTotalAmount(''); setFormPaidAmount(''); setFormDueDate(''); setFormNotes('');
      fetchUdhar();
    } else {
      setFormError(result.error || 'Failed to add entry.');
    }
    setSubmittingAdd(false);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Please enter a valid payment amount.');
      return;
    }
    if (amount > payTarget.remaining) {
      setPayError(`Payment cannot exceed remaining balance (${fmt(payTarget.remaining)}).`);
      return;
    }
    setSubmittingPay(true);
    const result = await recordUdharPaymentAction(payTarget.id, {
      amountPaid: amount,
      notes: payNotes.trim() || undefined,
    });
    if (result.success) {
      showToast('Payment recorded successfully!');
      setPayTarget(null); setPayAmount(''); setPayNotes(''); setPayError('');
      fetchUdhar();
    } else {
      setPayError(result.error || 'Failed to record payment.');
    }
    setSubmittingPay(false);
  };

  const handleDelete = async (id: number) => {
    const result = await deleteUdharAction(id);
    if (result.success) {
      showToast('Udhar entry deleted.');
      setDeleteTarget(null);
      fetchUdhar();
    } else {
      showToast(result.error || 'Failed to delete', 'error');
    }
  };

  const openHistory = async (item: UdharItem) => {
    setHistoryTarget(item);
    setLoadingHistory(true);
    const res = await getUdharPaymentHistoryAction(item.id);
    if (res.success) {
      setPaymentHistory(res.data as any);
    }
    setLoadingHistory(false);
  };

  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

  const isOverdue = (dateStr: string | null, status: string) => {
    if (!dateStr || status === 'Paid') return false;
    const due = new Date(dateStr);
    due.setHours(23, 59, 59, 999);
    return due < new Date();
  };

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
          <span className="text-xs font-semibold text-slate-500">Credit Ledger (Udhar Khata)</span>
          {summary && (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
              {summary.activeDebtors} active accounts
            </span>
          )}
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="gap-2 shadow-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs h-9 px-4"
        >
          <Plus className="w-4 h-4" /> Add Credit Entry
        </Button>
      </div>

      {/* Summary KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SparklineCard
            title="Total Outstanding"
            subtitle="Active customer debt"
            value={fmt(summary.totalOutstanding)}
            color="amber"
            icon={Wallet}
            trendText={`${summary.activeDebtors} active accounts`}
          />
          <SparklineCard
            title="Overdue Amount"
            subtitle="Passed payment deadline"
            value={fmt(summary.overdueAmount)}
            color="purple"
            icon={AlertCircle}
            trendText="Requires urgent follow-up"
          />
          <SparklineCard
            title="Collected This Month"
            subtitle="Cleared balance total"
            value={fmt(summary.collectedThisMonth)}
            color="emerald"
            icon={CheckCircle2}
            trendText="Total cash recovered"
          />
          <SparklineCard
            title="Active Debtors"
            subtitle="Customers with balance"
            value={summary.activeDebtors.toLocaleString()}
            color="blue"
            icon={User}
            trendText="Pending ledger profiles"
          />
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, or phone model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'Unpaid', 'Partial', 'Paid', 'Overdue'] as StatusFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-bold transition-all',
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Udhar Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center py-24 text-slate-400 gap-2 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-slate-600" /> Loading credit ledger...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center py-20 gap-3 text-center px-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">No credit entries found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your filters or record a new customer credit entry.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const overdue = isOverdue(item.dueDate, item.status);
            const paidPct = item.totalAmount > 0 ? Math.min(100, Math.round((item.paidAmount / item.totalAmount) * 100)) : 100;

            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300',
                  overdue ? 'border-rose-200/80 bg-rose-50/20' : 'border-slate-200/80'
                )}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.customerName}</h4>
                      <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-300" /> {item.customerPhone}
                      </p>
                    </div>

                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0',
                      item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                      overdue ? 'bg-rose-50 text-rose-700 border-rose-200/60' :
                      item.status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                      'bg-slate-100 text-slate-700 border-slate-200/60'
                    )}>
                      {overdue ? 'Overdue' : item.status}
                    </span>
                  </div>

                  {/* Phone Sold */}
                  {item.phoneSold && (
                    <div className="mb-3 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 font-medium truncate">
                      📱 {item.phoneSold}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="my-3">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                      <span>Paid: {fmt(item.paidAmount)}</span>
                      <span>Total: {fmt(item.totalAmount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-300', item.status === 'Paid' ? 'bg-emerald-500' : 'bg-slate-900')}
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Remaining Balance Highlight */}
                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-semibold">Remaining</span>
                    <span className={cn('text-lg font-black', item.remaining > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                      {fmt(item.remaining)}
                    </span>
                  </div>

                  {/* Due Date Indicator */}
                  {item.dueDate && item.remaining > 0 && (
                    <p className={cn('text-[11px] font-semibold mt-2 flex items-center gap-1', overdue ? 'text-rose-600' : 'text-slate-400')}>
                      <Clock className="w-3 h-3" /> Due: {formatDate(item.dueDate)} {overdue ? '(Overdue)' : ''}
                    </p>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  {item.remaining > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setPayTarget(item)}
                      className="flex-1 text-xs h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                    >
                      Record Payment
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openHistory(item)}
                    className="text-xs h-8 rounded-xl border-slate-200 font-semibold"
                  >
                    History
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(item)}
                    className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Payment Modal */}
      {payTarget && (
        <Dialog isOpen={!!payTarget} onClose={() => setPayTarget(null)} title={`Record Payment — ${payTarget.customerName}`}>
          <form onSubmit={handlePaySubmit} className="flex flex-col gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Total Credit Amount:</span> <span>{fmt(payTarget.totalAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-600">
                <span>Remaining Balance:</span> <span>{fmt(payTarget.remaining)}</span>
              </div>
            </div>

            {payError && <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">{payError}</div>}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Amount Received (Rs)*</label>
              <Input
                type="number"
                placeholder={`Max ${payTarget.remaining}`}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
              >
                {['Cash', 'Bank Transfer', 'JazzCash', 'Easypaisa', 'Card'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Notes (Optional)</label>
              <Input
                placeholder="e.g. Partial cash installment"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setPayTarget(null)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingPay} className="rounded-xl text-xs h-9 bg-slate-900 text-white font-bold">
                {submittingPay ? 'Recording...' : 'Confirm Payment'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Payment History Modal */}
      {historyTarget && (
        <Dialog isOpen={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`Payment History — ${historyTarget.customerName}`}>
          <div className="flex flex-col gap-4">
            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading history...</div>
            ) : paymentHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No payment logs recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {paymentHistory.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-emerald-700">+{fmt(p.amountPaid)} ({p.paymentMethod})</p>
                      {p.notes && <p className="text-[11px] text-slate-400 mt-0.5">{p.notes}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{formatDate(p.paymentDate)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setHistoryTarget(null)} className="rounded-xl text-xs h-9">
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Dialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Udhar Entry?">
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500">
              Are you sure you want to soft delete the udhar record for <strong className="text-slate-900">{deleteTarget.customerName}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleDelete(deleteTarget.id)} className="rounded-xl text-xs h-9 bg-rose-600 text-white font-bold">
                Soft Delete
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <Dialog isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Credit Entry (Udhar)">
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-3">
            {formError && <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">{formError}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Customer Name*</label>
                <Input placeholder="Full Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number*</label>
                <Input placeholder="0300-XXXXXXX" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Phone Model Sold (Optional)</label>
              <Input placeholder="e.g. iPhone 15 Pro 256GB" value={formPhoneSold} onChange={(e) => setFormPhoneSold(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Total Credit Amount (Rs)*</label>
                <Input type="number" placeholder="Total bill" value={formTotalAmount} onChange={(e) => setFormTotalAmount(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Upfront Paid (Rs)</label>
                <Input type="number" placeholder="0 if unpaid" value={formPaidAmount} onChange={(e) => setFormPaidAmount(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Promised Due Date</label>
              <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Notes</label>
              <Input placeholder="Additional notes or references" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAdd} className="rounded-xl text-xs h-9 bg-slate-900 text-white font-bold">
                {submittingAdd ? 'Saving...' : 'Save Credit Entry'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
