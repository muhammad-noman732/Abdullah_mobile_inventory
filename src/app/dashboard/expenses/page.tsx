'use client';

import { useState, useEffect, useCallback } from 'react';
import { Banknote, Plus, RefreshCw, Trash2, Pencil, Search, Calendar, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { addExpenseAction, deleteExpenseAction, getExpensesAction, updateExpenseAction } from '@/actions/expenses';
import { cn, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';

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
  'Rent':                 { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', dot: 'bg-purple-500' },
  'Electricity':          { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100',  dot: 'bg-amber-500' },
  'Salary':               { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100',   dot: 'bg-blue-500' },
  'Transport':            { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500' },
  'Stock Purchase':       { bg: 'bg-slate-100', text: 'text-slate-800',  border: 'border-slate-200',  dot: 'bg-slate-600' },
  'Repair & Maintenance': { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-100',   dot: 'bg-rose-500' },
  'Marketing':            { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-500' },
  'Other':                { bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-400' },
};

const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExpensesAction({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        month: selectedMonth || undefined,
        search: search || undefined,
      });
      if (res.success) {
        setExpenses(res.data as Expense[]);
        setTotalAmount(res.totalAmount);
        setTotalCount(res.totalCount);
        setThisMonthTotal(res.thisMonthTotal);
        setThisYearTotal(res.thisYearTotal);
        setCategoryBreakdown(res.categoryBreakdown);
      }
    } catch {
      showToast('Failed to load expenses.', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, selectedMonth, search]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // Open edit — pre-fill form
  const openEdit = (item: Expense) => {
    setForm({
      description: item.description,
      amount: String(item.amount),
      category: item.category,
      expenseDate: item.expenseDate.slice(0, 10),
      notes: item.notes || '',
    });
    setErrors({});
    setEditTarget(item);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setShowAddModal(true);
  };

  const validateForm = () => {
    const amt = parseFloat(form.amount);
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = 'Description is required';
    if (isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    const result = await addExpenseAction({
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      expenseDate: form.expenseDate,
      notes: form.notes.trim() || undefined,
    });
    if (result.success) {
      showToast('Expense recorded!');
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      fetchExpenses();
    } else {
      showToast(result.error || 'Failed to record expense.', 'error');
    }
    setSubmitting(false);
  };

  const handleEditSubmit = async () => {
    if (!editTarget || !validateForm()) return;
    setSubmitting(true);
    const result = await updateExpenseAction(editTarget.id, {
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      expenseDate: form.expenseDate,
      notes: form.notes.trim() || undefined,
    });
    if (result.success) {
      showToast('Expense updated!');
      setEditTarget(null);
      fetchExpenses();
    } else {
      showToast(result.error || 'Failed to update.', 'error');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    const result = await deleteExpenseAction(id);
    if (result.success) {
      showToast('Expense deleted.');
      setDeleteTarget(null);
      fetchExpenses();
    } else {
      showToast(result.error || 'Failed to delete.', 'error');
    }
  };

  const ExpenseForm = (
    <div className="flex flex-col gap-4">
      <Input
        label="Description *"
        placeholder="e.g. Shop Electricity Bill July"
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        error={errors.description}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount (Rs) *"
          type="number"
          min={0}
          placeholder="0"
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          error={errors.amount}
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
        <label className="text-xs font-semibold text-slate-700">Notes (optional)</label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
          placeholder="e.g. Paid via Cash"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* Toast */}
      {toast && (
        <div className={cn('fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border',
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800')}>
          {toast.msg}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-slate-500">Expenses Overview</span>
        <Button onClick={openAdd} className="gap-2 shadow-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold">
          <Plus className="w-4 h-4" /> Record Expense
        </Button>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="This Month"
          value={fmt(thisMonthTotal)}
          subtitle="Current month total"
          icon={Banknote}
        />
        <StatCard
          title="This Year"
          value={fmt(thisYearTotal)}
          subtitle="Year-to-date total"
          icon={Banknote}
        />
        <StatCard
          title="Filtered Total"
          value={fmt(totalAmount)}
          subtitle={`${totalCount} records logged`}
          icon={Banknote}
        />
        <StatCard
          title="Top Category"
          value={categoryBreakdown.length > 0 ? categoryBreakdown[0].category : 'None'}
          subtitle={categoryBreakdown.length > 0 ? fmt(categoryBreakdown[0].amount) : 'No expenses logged'}
          icon={TrendingDown}
        />
      </div>

      {/* Category Breakdown Bar */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-700 mb-3">Category Breakdown</p>
          <div className="flex flex-col gap-2.5">
            {categoryBreakdown.map((cat) => {
              const pct = totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0;
              const conf = categoryConfig[cat.category] || categoryConfig['Other'];
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', conf.dot)} />
                    <span className="text-xs text-slate-700 truncate">{cat.category}</span>
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', conf.dot)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 w-24 text-right">{fmt(cat.amount)}</span>
                  <span className="text-xs text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 h-9 flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-20 text-sm text-slate-400 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <TrendingDown className="w-7 h-7 text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">No expenses found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or record a new expense.</p>
          </div>
          <Button onClick={openAdd} className="gap-2 mt-1">
            <Plus className="w-4 h-4" /> Record Expense
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((item) => {
                  const conf = categoryConfig[item.category] || categoryConfig['Other'];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                        {formatDate(item.expenseDate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900 text-sm">{item.description}</p>
                        {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border', conf.bg, conf.text, conf.border)}>
                          <div className={cn('w-1.5 h-1.5 rounded-full', conf.dot)} />
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {fmt(item.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(item)}
                            className="w-8 h-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteTarget(item)}
                            className="w-8 h-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer: Total row */}
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-500">Total ({totalCount} records)</td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900">{fmt(totalAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Record Expense */}
      <Dialog isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record New Expense" maxWidth="md">
        {ExpenseForm}
        <div className="flex gap-3 pt-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button className="flex-1" disabled={submitting} onClick={handleAddSubmit}>
            {submitting ? 'Saving...' : 'Save Expense'}
          </Button>
        </div>
      </Dialog>

      {/* Modal: Edit Expense */}
      <Dialog isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Expense" maxWidth="md">
        {ExpenseForm}
        <div className="flex gap-3 pt-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button className="flex-1" disabled={submitting} onClick={handleEditSubmit}>
            {submitting ? 'Saving...' : 'Update Expense'}
          </Button>
        </div>
      </Dialog>

      {/* Modal: Delete Confirmation */}
      {deleteTarget && (
        <Dialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Expense" maxWidth="sm">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">{deleteTarget.description}</strong>{' '}
              (<span className="text-rose-600 font-semibold">{fmt(deleteTarget.amount)}</span>)?
            </p>
            <p className="text-xs text-slate-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              This expense will be soft-deleted and excluded from all reports.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" onClick={() => handleDelete(deleteTarget.id)}>Delete</Button>
            </div>
          </div>
        </Dialog>
      )}

    </div>
  );
}
