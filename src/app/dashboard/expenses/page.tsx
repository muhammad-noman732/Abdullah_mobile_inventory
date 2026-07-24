'use client';

import { useState, useEffect, useCallback } from 'react';
import { Banknote, Plus, RefreshCw, Trash2, Pencil, Search, Calendar, TrendingDown, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { addExpenseAction, deleteExpenseAction, getExpensesAction, updateExpenseAction } from '@/actions/expenses';
import { cn, formatDate } from '@/lib/utils';
import { SparklineCard } from '@/components/ui/sparkline-card';

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  notes: string | null;
  createdAt: string;
}

const CATEGORIES = [
  'Rent', 'Electricity', 'Salary', 'Transport',
  'Stock Purchase', 'Repair & Maintenance', 'Marketing', 'Other',
];

const EMPTY_FORM = {
  description: '',
  amount: '',
  category: 'Electricity',
  expenseDate: new Date().toISOString().split('T')[0],
  notes: '',
};

const categoryConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Rent':                 { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/60', dot: 'bg-purple-500' },
  'Electricity':          { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200/60',  dot: 'bg-amber-500' },
  'Salary':               { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200/60',   dot: 'bg-blue-500' },
  'Transport':            { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60', dot: 'bg-emerald-500' },
  'Stock Purchase':       { bg: 'bg-slate-100', text: 'text-slate-800',  border: 'border-slate-200',  dot: 'bg-slate-600' },
  'Repair & Maintenance': { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200/60',   dot: 'bg-rose-500' },
  'Marketing':            { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/60', dot: 'bg-indigo-500' },
  'Other':                { bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-400' },
};

const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

type ExpenseFormErrors = {
  description?: string;
  amount?: string;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [thisYearTotal, setThisYearTotal] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ category: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Form
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<ExpenseFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Validators
  const validateDescription = (v: string): string | undefined => {
    if (!v.trim()) return 'Description is required.';
    if (v.trim().length < 2) return 'Description must be at least 2 characters.';
    if (v.trim().length > 300) return 'Description must be 300 characters or fewer.';
    return undefined;
  };

  const validateAmount = (v: string): string | undefined => {
    if (!v) return 'Amount is required.';
    const num = parseFloat(v);
    if (isNaN(num) || num <= 0) return 'Amount must be greater than 0.';
    if (num > 10_000_000) return 'Amount seems unusually high. Please verify.';
    return undefined;
  };

  const validateAll = (): boolean => {
    const errors: ExpenseFormErrors = {};
    errors.description = validateDescription(form.description);
    errors.amount = validateAmount(form.amount);
    setFormErrors(errors);
    setTouched({ description: true, amount: true });
    return !errors.description && !errors.amount;
  };

  const onFieldBlur = (field: keyof ExpenseFormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errors: ExpenseFormErrors = { ...formErrors };
    if (field === 'description') errors.description = validateDescription(form.description);
    if (field === 'amount') errors.amount = validateAmount(form.amount);
    setFormErrors(errors);
  };

  const clearError = (field: keyof ExpenseFormErrors) => {
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setTouched({});
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExpensesAction({
        search: search.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        month: selectedMonth || undefined,
      });

      if (res.success && res.data) {
        const summary = (res as any).summary;
        setExpenses(res.data as any);
        setTotalAmount(summary?.totalAmount || 0);
        setTotalCount(summary?.totalCount || 0);
        setThisMonthTotal(summary?.thisMonthTotal || 0);
        setThisYearTotal(summary?.thisYearTotal || 0);
        setCategoryBreakdown(summary?.categoryBreakdown || []);
      }
    } catch {
      toast.error('Failed to load expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, selectedMonth]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const openAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEdit = (item: Expense) => {
    setEditTarget(item);
    setForm({
      description: item.description,
      amount: String(item.amount),
      category: item.category,
      expenseDate: item.expenseDate ? item.expenseDate.split('T')[0] : new Date().toISOString().split('T')[0],
      notes: item.notes || '',
    });
    setFormErrors({});
    setTouched({});
  };

  const handleAddSubmit = async () => {
    if (!validateAll()) return;
    setSubmitting(true);
    try {
      const result = await addExpenseAction({
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        expenseDate: form.expenseDate,
        notes: form.notes.trim() || undefined,
      });
      if (result.success) {
        toast.success('Expense recorded successfully!');
        setShowAddModal(false);
        resetForm();
        fetchExpenses();
      } else {
        toast.error(result.error || 'Failed to add expense.');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editTarget || !validateAll()) return;
    setSubmitting(true);
    try {
      const result = await updateExpenseAction(editTarget.id, {
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        expenseDate: form.expenseDate,
        notes: form.notes.trim() || undefined,
      });
      if (result.success) {
        toast.success('Expense updated successfully!');
        setEditTarget(null);
        resetForm();
        fetchExpenses();
      } else {
        toast.error(result.error || 'Failed to update expense.');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await deleteExpenseAction(id);
      if (result.success) {
        toast.success('Expense deleted.');
        setDeleteTarget(null);
        fetchExpenses();
      } else {
        toast.error(result.error || 'Failed to delete expense.');
      }
    } catch {
      toast.error('An unexpected error occurred while deleting.');
    }
  };

  const ExpenseForm = (
    <div className="flex flex-col gap-4">
      <Input
        label="Description *"
        placeholder="e.g. Shop Electricity Bill July"
        value={form.description}
        onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); clearError('description'); }}
        onBlur={() => onFieldBlur('description')}
        error={touched.description ? formErrors.description : undefined}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount (Rs) *"
          type="number"
          min={0}
          placeholder="0"
          value={form.amount}
          onChange={(e) => { setForm((p) => ({ ...p, amount: e.target.value })); clearError('amount'); }}
          onBlur={() => onFieldBlur('amount')}
          error={touched.amount ? formErrors.amount : undefined}
        />
        <Select
          label="Category *"
          value={form.category}
          onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          options={CATEGORIES.map((c) => ({ label: c, value: c }))}
        />
      </div>
      <Input
        label="Date"
        type="date"
        value={form.expenseDate}
        onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-700">Notes (optional)</label>
        <textarea
          rows={2}
          className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition-all resize-none"
          placeholder="e.g. Paid via JazzCash"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-slate-500">Shop Expense Tracker</span>
        <Button onClick={openAdd} className="gap-2 shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-9 px-4">
          <Plus className="w-4 h-4" /> Record Expense
        </Button>
      </div>

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SparklineCard
          title="This Month"
          value={fmt(thisMonthTotal)}
          subtitle="Current month operational expenses"
          color="amber"
          icon={Banknote}
          trendText="Monthly expense sum"
        />
        <SparklineCard
          title="This Year"
          value={fmt(thisYearTotal)}
          subtitle="Year-to-date total overhead"
          color="purple"
          icon={Receipt}
          trendText="Cumulative annual cost"
        />
        <SparklineCard
          title="Filtered Total"
          value={fmt(totalAmount)}
          subtitle={`${totalCount} expense logs`}
          color="blue"
          icon={Banknote}
          trendText="Filtered period total"
        />
        <SparklineCard
          title="Top Category"
          value={categoryBreakdown.length > 0 ? categoryBreakdown[0].category : 'None'}
          subtitle={categoryBreakdown.length > 0 ? fmt(categoryBreakdown[0].amount) : 'No expenses logged'}
          color="emerald"
          icon={TrendingDown}
          trendText="Highest expense line"
        />
      </div>

      {/* Category Breakdown Progress Bar */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-bold text-slate-800 mb-3">Category Cost Breakdown</p>
          <div className="flex flex-col gap-2.5">
            {categoryBreakdown.map((cat) => {
              const pct = totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0;
              const conf = categoryConfig[cat.category] || categoryConfig['Other'];
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', conf.dot)} />
                    <span className="text-xs font-semibold text-slate-700 truncate">{cat.category}</span>
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', conf.dot)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-900 w-24 text-right">{fmt(cat.amount)}</span>
                  <span className="text-[11px] font-semibold text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expense description or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-10 bg-white">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Expense List Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 gap-2 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No expenses recorded</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing filters or add a new expense log.</p>
            </div>
            <Button onClick={openAdd} size="sm" className="mt-1 text-xs h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              <Plus className="w-3.5 h-3.5 mr-1" /> Record First Expense
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    <th className="text-left px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px] w-28">Date</th>
                    <th className="text-left px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Description & Details</th>
                    <th className="text-left px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px] w-40">Category</th>
                    <th className="text-right px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px] w-36">Amount</th>
                    <th className="text-right px-5 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px] w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {expenses.map((item) => {
                    const conf = categoryConfig[item.category] || categoryConfig['Other'];
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                          {formatDate(item.expenseDate)}
                        </td>
                        <td className="px-5 py-3.5 max-w-xs md:max-w-md">
                          <p className="font-bold text-slate-900 text-xs break-words line-clamp-2 leading-relaxed" title={item.description}>
                            {item.description}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5 break-words line-clamp-1" title={item.notes}>
                              {item.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md border', conf.bg, conf.text, conf.border)}>
                            <div className={cn('w-1.5 h-1.5 rounded-full', conf.dot)} />
                            {item.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-rose-600 text-xs">
                          {fmt(item.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(item)}
                              className="h-8 px-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              title="Edit Expense"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(item)}
                              className="h-8 px-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card list view */}
            <div className="md:hidden divide-y divide-slate-100">
              {expenses.map((item) => {
                const conf = categoryConfig[item.category] || categoryConfig['Other'];
                return (
                  <div key={item.id} className="p-4 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-xs break-words leading-snug">{item.description}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1">{formatDate(item.expenseDate)}</p>
                      </div>
                      <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0', conf.bg, conf.text, conf.border)}>
                        <div className={cn('w-1.5 h-1.5 rounded-full', conf.dot)} />
                        {item.category}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-500 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100 break-words">
                        {item.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                      <span className="text-sm font-black text-rose-600">{fmt(item.amount)}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(item)}
                          className="h-8 px-2.5 text-xs rounded-xl border-slate-200 font-bold"
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(item)}
                          className="h-8 px-2.5 text-xs rounded-xl text-rose-600 hover:bg-rose-50 font-bold"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Modal */}
      <Dialog isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }} title="Record New Expense">
        <div className="flex flex-col gap-5">
          {ExpenseForm}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }} className="rounded-xl text-xs h-9">
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} disabled={submitting} className="rounded-xl text-xs h-9 bg-indigo-600 text-white font-bold">
              {submitting ? 'Saving...' : 'Save Expense'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Modal */}
      <Dialog isOpen={!!editTarget} onClose={() => { setEditTarget(null); resetForm(); }} title="Edit Expense Entry">
        <div className="flex flex-col gap-5">
          {ExpenseForm}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setEditTarget(null); resetForm(); }} className="rounded-xl text-xs h-9">
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={submitting} className="rounded-xl text-xs h-9 bg-indigo-600 text-white font-bold">
              {submitting ? 'Updating...' : 'Update Expense'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Modal */}
      <Dialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Expense Record?">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-500 font-medium">
            Are you sure you want to delete the expense entry for <strong className="text-slate-900 font-bold">{deleteTarget?.description}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className="rounded-xl text-xs h-9">
              Cancel
            </Button>
            <Button size="sm" onClick={() => deleteTarget && handleDelete(deleteTarget.id)} className="rounded-xl text-xs h-9 bg-rose-600 text-white font-bold">
              Delete Record
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
