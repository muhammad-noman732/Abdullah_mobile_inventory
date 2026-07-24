'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wallet, Search, Plus, RefreshCw, AlertCircle, CheckCircle2,
  Clock, Phone, User, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createUdharAction, recordUdharPaymentAction, deleteUdharAction, getUdharAction, getUdharPaymentHistoryAction } from '@/actions/udhar';
import { cn, formatDate } from '@/lib/utils';
import { SparklineCard } from '@/components/ui/sparkline-card';
import { isValidPhone } from '@/lib/validation';

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

const STATUS_FILTER_LABELS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unpaid', value: 'Unpaid' },
  { label: 'Partial', value: 'Partial' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Overdue', value: 'Overdue' },
];

type AddFormErrors = {
  name?: string;
  phone?: string;
  totalAmount?: string;
  paidAmount?: string;
};

type PayFormErrors = {
  amount?: string;
};

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
  const [formErrors, setFormErrors] = useState<AddFormErrors>({});
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addTouched, setAddTouched] = useState<Record<string, boolean>>({});

  // Record Payment Modal
  const [payTarget, setPayTarget] = useState<UdharItem | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [payErrors, setPayErrors] = useState<PayFormErrors>({});
  const [submittingPay, setSubmittingPay] = useState(false);
  const [payTouched, setPayTouched] = useState<Record<string, boolean>>({});

  // Payment History Modal
  const [historyTarget, setHistoryTarget] = useState<UdharItem | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<UdharPayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<UdharItem | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]);

  // ─── Add Form Validators ───────────────────────────────────────────────────
  const validateAddName = (v: string): string | undefined => {
    if (!v.trim()) return 'Customer name is required.';
    if (v.trim().length < 2) return 'Name must be at least 2 characters.';
    if (v.trim().length > 150) return 'Name must be 150 characters or fewer.';
    return undefined;
  };

  const validateAddPhone = (v: string): string | undefined => {
    if (!v.trim()) return 'Phone number is required.';
    if (!isValidPhone(v.trim())) return 'Enter a valid number (e.g. 0300-1234567 or +923001234567).';
    return undefined;
  };

  const validateAddTotalAmount = (v: string): string | undefined => {
    if (!v) return 'Total credit amount is required.';
    const num = parseFloat(v);
    if (isNaN(num) || num <= 0) return 'Amount must be a positive number.';
    if (num > 10_000_000) return 'Amount seems unusually high. Please verify.';
    return undefined;
  };

  const validateAddPaidAmount = (v: string, totalStr: string): string | undefined => {
    if (!v) return undefined;
    const num = parseFloat(v);
    if (isNaN(num) || num < 0) return 'Paid amount must be a valid number.';
    const total = parseFloat(totalStr);
    if (!isNaN(total) && num > total) return 'Paid amount cannot exceed the total credit amount.';
    return undefined;
  };

  // ─── Pay Form Validators ───────────────────────────────────────────────────
  const validatePayAmount = (v: string, remaining: number): string | undefined => {
    if (!v) return 'Payment amount is required.';
    const num = parseFloat(v);
    if (isNaN(num) || num <= 0) return 'Enter a valid payment amount.';
    if (num > remaining) return `Cannot exceed remaining balance (Rs ${Math.round(remaining).toLocaleString('en-PK')}).`;
    return undefined;
  };

  // ─── Validate All Add Fields (for submit) ──────────────────────────────────
  const validateAllAdd = (): boolean => {
    const errors: AddFormErrors = {};
    errors.name = validateAddName(formName);
    errors.phone = validateAddPhone(formPhone);
    errors.totalAmount = validateAddTotalAmount(formTotalAmount);
    errors.paidAmount = validateAddPaidAmount(formPaidAmount, formTotalAmount);
    setFormErrors(errors);
    setAddTouched({ name: true, phone: true, totalAmount: true, paidAmount: true });
    return !errors.name && !errors.phone && !errors.totalAmount && !errors.paidAmount;
  };

  // ─── Validate All Pay Fields (for submit) ──────────────────────────────────
  const validateAllPay = (): boolean => {
    if (!payTarget) return false;
    const errors: PayFormErrors = {};
    errors.amount = validatePayAmount(payAmount, payTarget.remaining);
    setPayErrors(errors);
    setPayTouched({ amount: true });
    return !errors.amount;
  };

  // ─── Blur Handlers (validate on blur) ──────────────────────────────────────
  const onAddBlur = (field: string) => {
    setAddTouched((prev) => ({ ...prev, [field]: true }));
    const errors: AddFormErrors = { ...formErrors };
    if (field === 'name') errors.name = validateAddName(formName);
    if (field === 'phone') errors.phone = validateAddPhone(formPhone);
    if (field === 'totalAmount') {
      errors.totalAmount = validateAddTotalAmount(formTotalAmount);
      errors.paidAmount = validateAddPaidAmount(formPaidAmount, formTotalAmount);
    }
    if (field === 'paidAmount') errors.paidAmount = validateAddPaidAmount(formPaidAmount, formTotalAmount);
    setFormErrors(errors);
  };

  const onPayBlur = (field: string) => {
    setPayTouched((prev) => ({ ...prev, [field]: true }));
    const errors: PayFormErrors = { ...payErrors };
    if (field === 'amount' && payTarget) {
      errors.amount = validatePayAmount(payAmount, payTarget.remaining);
    }
    setPayErrors(errors);
  };

  // ─── Clear Individual Field Error on Change ────────────────────────────────
  const clearAddError = (field: keyof AddFormErrors) => {
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const clearPayError = (field: keyof PayFormErrors) => {
    if (payErrors[field]) setPayErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  const fetchUdhar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUdharAction({
        search: debouncedSearch,
        status: statusFilter === 'Overdue' ? 'all' : statusFilter,
        due: statusFilter === 'Overdue' ? 'overdue' : undefined,
        limit: 200,
      });
      if (res.success) {
        setItems(res.data as any);
        setSummary(res.summary as any);
      }
    } catch {
      toast.error('Failed to load credit ledger data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => { fetchUdhar(); }, [fetchUdhar]);

  // ─── Add Entry Submit ──────────────────────────────────────────────────────
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAllAdd()) return;

    setSubmittingAdd(true);
    try {
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
        toast.success('Credit entry recorded successfully!');
        setShowAddModal(false);
        resetAddForm();
        fetchUdhar();
      } else {
        setFormErrors({ name: result.error || 'Failed to record entry.' });
        setAddTouched({ name: true });
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // ─── Record Payment Submit ─────────────────────────────────────────────────
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAllPay()) return;

    const amount = parseFloat(payAmount);
    if (!payTarget) return;

    setSubmittingPay(true);
    try {
      const result = await recordUdharPaymentAction(payTarget.id, {
        amountPaid: amount,
        notes: payNotes.trim() || undefined,
      });
      if (result.success) {
        toast.success('Payment recorded successfully!');
        resetPayForm();
        fetchUdhar();
      } else {
        setPayErrors({ amount: result.error || 'Failed to record payment.' });
        setPayTouched({ amount: true });
      }
    } catch {
      toast.error('An unexpected error occurred while recording payment.');
    } finally {
      setSubmittingPay(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      const result = await deleteUdharAction(id);
      if (result.success) {
        toast.success('Credit entry deleted.');
        setDeleteTarget(null);
        fetchUdhar();
      } else {
        toast.error(result.error || 'Failed to delete entry.');
      }
    } catch {
      toast.error('An unexpected error occurred while deleting.');
    }
  };

  // ─── Payment History ───────────────────────────────────────────────────────
  const openHistory = async (item: UdharItem) => {
    setHistoryTarget(item);
    setLoadingHistory(true);
    try {
      const res = await getUdharPaymentHistoryAction(item.id);
      if (res.success) {
        setPaymentHistory(res.data as any);
      } else {
        toast.error('Failed to load payment history.');
      }
    } catch {
      toast.error('Failed to load payment history.');
    }
    setLoadingHistory(false);
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const resetAddForm = () => {
    setFormName(''); setFormPhone(''); setFormPhoneSold('');
    setFormTotalAmount(''); setFormPaidAmount(''); setFormDueDate(''); setFormNotes('');
    setFormErrors({}); setAddTouched({});
  };

  const resetPayForm = () => {
    setPayTarget(null); setPayAmount(''); setPayNotes('');
    setPayErrors({}); setPayTouched({});
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
      {/* Action Control Strip */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Credit Ledger (Udhar Khata)</span>
          {summary && (
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
              {summary.activeDebtors} active accounts
            </span>
          )}
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="gap-2 shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-9 px-4"
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
            trendText="Requires follow-up"
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
            className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTER_LABELS.map(({ label, value: st }) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                statusFilter === st
                  ? st === 'Overdue' ? 'bg-rose-600 text-white shadow-xs' : 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Udhar Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center py-24 text-slate-400 gap-2 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Loading credit ledger...
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
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{item.customerName}</h4>
                      <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                        <Phone className="w-3 h-3 text-slate-300 shrink-0" /> {item.customerPhone}
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
                      {item.phoneSold}
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
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100/80">
                  {item.remaining > 0 ? (
                    <Button
                      size="sm"
                      onClick={() => setPayTarget(item)}
                      className="h-9 px-3.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold whitespace-nowrap shadow-xs"
                    >
                      Record Payment
                    </Button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/60">
                      Cleared
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openHistory(item)}
                      className="h-9 px-3 text-xs rounded-xl border-slate-200 font-bold whitespace-nowrap"
                    >
                      History
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(item)}
                      className="h-9 px-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 gap-1 text-xs font-semibold whitespace-nowrap"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Payment Modal */}
      {payTarget && (
        <Dialog isOpen={!!payTarget} onClose={resetPayForm} title={`Record Payment — ${payTarget.customerName}`}>
          <form onSubmit={handlePaySubmit} className="flex flex-col gap-4" noValidate>
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Total Credit Amount:</span> <span>{fmt(payTarget.totalAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-600">
                <span>Remaining Balance:</span> <span>{fmt(payTarget.remaining)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Amount Received (Rs) *</label>
              <Input
                type="number"
                placeholder={`Max ${payTarget.remaining}`}
                value={payAmount}
                onChange={(e) => { setPayAmount(e.target.value); clearPayError('amount'); }}
                onBlur={() => onPayBlur('amount')}
                error={payTouched.amount ? payErrors.amount : undefined}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
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
              <Button type="button" variant="outline" onClick={resetPayForm} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingPay} className="rounded-xl text-xs h-9 bg-indigo-600 text-white font-bold">
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
        <Dialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Credit Entry?">
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500 font-medium">
              Are you sure you want to delete the credit record for <strong className="text-slate-900 font-bold">{deleteTarget.customerName}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleDelete(deleteTarget.id)} className="rounded-xl text-xs h-9 bg-rose-600 text-white font-bold">
                Delete Entry
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <Dialog isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetAddForm(); }} title="Add New Credit Entry (Udhar)">
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Customer Name *"
                placeholder="Full Name"
                value={formName}
                onChange={(e) => { setFormName(e.target.value); clearAddError('name'); }}
                onBlur={() => onAddBlur('name')}
                error={addTouched.name ? formErrors.name : undefined}
              />
              <div>
                <Input
                  label="Phone Number *"
                  placeholder="e.g. 0300-1234567"
                  value={formPhone}
                  onChange={(e) => { setFormPhone(e.target.value); clearAddError('phone'); }}
                  onBlur={() => onAddBlur('phone')}
                  error={addTouched.phone ? formErrors.phone : undefined}
                />
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                  Accepts 03XX-XXXXXXX or +92 format
                </span>
              </div>
            </div>

            <Input
              label="Phone Model Sold (Optional)"
              placeholder="e.g. iPhone 15 Pro 256GB"
              value={formPhoneSold}
              onChange={(e) => setFormPhoneSold(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Total Credit Amount (Rs) *"
                type="number"
                placeholder="Total bill"
                value={formTotalAmount}
                onChange={(e) => { setFormTotalAmount(e.target.value); clearAddError('totalAmount'); clearAddError('paidAmount'); }}
                onBlur={() => onAddBlur('totalAmount')}
                error={addTouched.totalAmount ? formErrors.totalAmount : undefined}
              />
              <Input
                label="Upfront Paid (Rs)"
                type="number"
                placeholder="0 if unpaid"
                value={formPaidAmount}
                onChange={(e) => { setFormPaidAmount(e.target.value); clearAddError('paidAmount'); }}
                onBlur={() => onAddBlur('paidAmount')}
                error={addTouched.paidAmount ? formErrors.paidAmount : undefined}
              />
            </div>

            <Input
              label="Promised Due Date"
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
            />

            <Input
              label="Notes"
              placeholder="Additional notes or references"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetAddForm(); }} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAdd} className="rounded-xl text-xs h-9 bg-indigo-600 text-white font-bold">
                {submittingAdd ? 'Saving...' : 'Save Credit Entry'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
