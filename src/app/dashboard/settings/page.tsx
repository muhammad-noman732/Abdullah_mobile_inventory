'use client';

import { useState, useEffect } from 'react';
import { Save, Download, Upload, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateSettingsAction, clearAllDataAction, getSettingsAction } from '@/actions/settings';
import { seedSampleDataAction } from '@/actions/seed';
import { getStockAction } from '@/actions/stock';
import { getSalesAction } from '@/actions/sales';
import { getUdharAction } from '@/actions/udhar';
import { getExpensesAction } from '@/actions/expenses';

interface Setting {
  id: number;
  shopName: string;
  ownerName: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  receiptFooter: string;
  currencyLabel: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    phoneNumber: '',
    address: '',
    city: '',
    receiptFooter: '',
    currencyLabel: 'Rs',
  });

  // Clear data modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirm, setClearConfirm] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getSettingsAction();
        if (res.success && res.data) {
          setSettings(res.data as any);
          setForm({
            shopName: res.data.shopName || '',
            ownerName: res.data.ownerName || '',
            phoneNumber: res.data.phoneNumber || '',
            address: res.data.address || '',
            city: res.data.city || '',
            receiptFooter: res.data.receiptFooter || '',
            currencyLabel: res.data.currencyLabel || 'Rs',
          });
        }
      } catch {
        toast.error('Failed to load settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!form.shopName.trim()) {
      toast.error('Shop name is required.');
      return;
    }
    setSaving(true);
    try {
      const result = await updateSettingsAction(form);
      if (result.success) {
        toast.success('Shop configuration saved successfully!');
      } else {
        toast.error(result.error || 'Failed to save settings.');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const [stockRes, salesRes, udharRes, expRes] = await Promise.all([
        getStockAction({ limit: 1000 }),
        getSalesAction({ limit: 1000 }),
        getUdharAction({ limit: 1000 }),
        getExpensesAction({}),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        shop: form,
        stock: stockRes.data || [],
        sales: salesRes.data || [],
        udhar: udharRes.data || [],
        expenses: expRes.data || [],
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `mobileshop_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success('JSON backup downloaded successfully!');
    } catch {
      toast.error('Failed to generate backup file. Please try again.');
    }
  };

  const handleSeedData = async () => {
    setSaving(true);
    try {
      const result = await seedSampleDataAction();
      if (result.success) {
        toast.success('Sample data seeded successfully!');
      } else {
        toast.error(result.error || 'Failed to seed sample data.');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    if (clearConfirm !== 'DELETE ALL DATA') {
      setClearError('Please type DELETE ALL DATA exactly as shown.');
      return;
    }
    setClearing(true);
    setClearError('');

    try {
      const result = await clearAllDataAction(clearConfirm);
      if (result.success) {
        toast.success('Database wiped successfully!');
        setShowClearModal(false);
        setClearConfirm('');
      } else {
        setClearError(result.error || 'Wipe failed.');
      }
    } catch {
      setClearError('An unexpected error occurred. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shop Settings & Backup</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage business identity, receipt headers, and database backups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Shop Profile & Receipt Config</h2>
            <Button onClick={handleSave} disabled={saving} className="gap-2 text-xs">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Shop Name *" value={form.shopName} onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))} placeholder="e.g. Al-Madina Mobiles" />
            <Input label="Owner Name" value={form.ownerName} onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))} placeholder="e.g. Muhammad Ahmad" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone Number" value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} placeholder="0300-1234567" />
            <Input label="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Faisalabad" />
          </div>

          <Input label="Shop Address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Shop #12, Mobile Market, Karkhana Bazaar" />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Receipt Footer Text</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              value={form.receiptFooter}
              onChange={(e) => setForm((p) => ({ ...p, receiptFooter: e.target.value }))}
              placeholder="Thank you for shopping with us! No returns without receipt."
            />
            <p className="text-[11px] text-slate-400">This text appears at the bottom of printed customer receipts.</p>
          </div>
        </div>

        {/* Backup & Tools Column */}
        <div className="flex flex-col gap-6">
          {/* Seed Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" /> Demo Sample Data
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Populate your store with realistic sample phones, sales transactions, credit ledgers, and expense records for quick testing.
            </p>
            <Button variant="outline" onClick={handleSeedData} disabled={saving} className="w-full text-xs gap-2">
              <Upload className="w-3.5 h-3.5" /> Seed Demo Data
            </Button>
          </div>

          {/* Backup Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" /> Backup Data
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export all your stock items, sales history, credit ledger, and expenses into a portable JSON backup file.
            </p>
            <Button variant="outline" onClick={handleExportBackup} className="w-full text-xs gap-2">
              <Download className="w-3.5 h-3.5" /> Download JSON Backup
            </Button>
          </div>

          {/* Danger Zone */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-2xs flex flex-col gap-4">
            <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Danger Zone
            </h3>
            <p className="text-xs text-rose-600 leading-relaxed">
              Wipe all database records (stock, sales, credit ledger, expenses). This action is irreversible.
            </p>
            <Button variant="danger" onClick={() => setShowClearModal(true)} className="w-full text-xs gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Clear All Data
            </Button>
          </div>
        </div>
      </div>

      {/* Clear Data Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowClearModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 z-10 animate-in zoom-in-95 duration-150 flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-900">Confirm Wiping Database</h3>
            <p className="text-xs text-slate-600">
              Type <strong className="text-rose-600 select-all font-mono">DELETE ALL DATA</strong> below to confirm.
            </p>
            <Input
              value={clearConfirm}
              onChange={(e) => { setClearConfirm(e.target.value); setClearError(''); }}
              placeholder="Type DELETE ALL DATA"
              error={clearError}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowClearModal(false)}>Cancel</Button>
              <Button variant="danger" className="flex-1" disabled={clearing} onClick={handleClearData}>
                {clearing ? 'Wiping...' : 'Wipe Database'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
