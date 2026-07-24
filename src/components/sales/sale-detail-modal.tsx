'use client';

import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

interface SaleItem {
  id: number;
  brand: string;
  model: string;
  variant: string | null;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  subtotal: number;
  profit: number;
}

interface Sale {
  id: number;
  customerName: string;
  paymentMethod: string;
  totalAmount: number;
  totalProfit: number;
  totalCost: number;
  isUdhar: boolean;
  saleDate: string;
  createdAt: string;
  items: SaleItem[];
}

interface SaleDetailModalProps {
  sale: Sale | null;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopCity?: string;
  receiptFooter?: string;
  currencyLabel?: string;
  onClose: () => void;
}

function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, string> = {
    Cash: 'success',
    Card: 'info',
    Easypaisa: 'info',
    JazzCash: 'info',
    'Bank Transfer': 'default',
    Udhar: 'warning',
  };
  return <Badge variant={(map[method] || 'default') as any}>{method}</Badge>;
}

export function SaleDetailModal({
  sale,
  shopName = 'My Mobile Shop',
  shopAddress,
  shopPhone,
  shopCity,
  receiptFooter = 'Thank you for your purchase!',
  currencyLabel = 'Rs',
  onClose,
}: SaleDetailModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const fmt = (n: number) => `${currencyLabel} ${Math.round(n).toLocaleString('en-PK')}`;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - Sale #${sale.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; background: #fff; padding: 16px; max-width: 300px; margin: 0 auto; }
            .center { text-align: center; }
            .shop-name { font-size: 16px; font-weight: bold; }
            .divider { border-top: 1px dashed #555; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin: 6px 0; }
            th { text-align: left; font-size: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
            td { padding: 3px 0; vertical-align: top; }
            td:last-child { text-align: right; }
            .total-row { font-weight: bold; border-top: 1px solid #111; padding-top: 4px; }
            .footer { text-align: center; font-size: 11px; color: #444; margin-top: 10px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="center">
            <p class="shop-name">${shopName.toUpperCase()}</p>
            ${shopAddress ? `<p>${shopAddress}${shopCity ? `, ${shopCity}` : ''}</p>` : ''}
            ${shopPhone ? `<p>Tel: ${shopPhone}</p>` : ''}
          </div>
          <div class="divider"></div>
          <p>Date: ${formatDateTime(sale.createdAt)}</p>
          <p>Customer: ${sale.customerName}</p>
          <p>Receipt #: ${String(sale.id).padStart(5, '0')}</p>
          <div class="divider"></div>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>${item.brand} ${item.model}${item.variant ? ` (${item.variant})` : ''}</td>
                  <td>${item.quantity}</td>
                  <td>${currencyLabel} ${Math.round(item.salePrice).toLocaleString()}</td>
                  <td>${currencyLabel} ${Math.round(item.subtotal).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <table>
            <tr class="total-row"><td>TOTAL</td><td>${fmt(sale.totalAmount)}</td></tr>
            <tr><td>Payment</td><td>${sale.paymentMethod}</td></tr>
          </table>
          <div class="divider"></div>
          <p class="footer">${receiptFooter}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Sale #{String(sale.id).padStart(5, '0')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(sale.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 flex flex-col gap-5">

          {/* Customer & Payment Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Customer</p>
              <p className="text-sm font-semibold text-slate-900">{sale.customerName}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Payment</p>
              <PaymentBadge method={sale.paymentMethod} />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Items Sold</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{item.brand} {item.model}</p>
                        {item.variant && <p className="text-xs text-slate-500">{item.variant}</p>}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700 font-medium">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(item.salePrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 rounded-xl p-4 text-white">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
              <p className="text-xl font-bold">{fmt(sale.totalAmount)}</p>
            </div>
            <div className="grid gap-2">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest mb-0.5">Profit</p>
                <p className="text-base font-bold text-emerald-700">{fmt(sale.totalProfit)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Cost</p>
                <p className="text-base font-bold text-slate-700">{fmt(sale.totalCost)}</p>
              </div>
            </div>
          </div>

          {sale.isUdhar && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800">This was a <strong>credit sale (Udhar)</strong>. Check the Udhar Khata for payment status.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
