'use client';

import { usePathname } from 'next/navigation';
import { Calendar, Menu } from 'lucide-react';
import { format } from 'date-fns';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of shop performance & sales' },
  '/dashboard/stock': { title: 'Stock Management', subtitle: 'Phone inventory, pricing & low stock alerts' },
  '/dashboard/sales': { title: 'Sales History', subtitle: 'All completed transactions & receipts' },
  '/dashboard/udhar': { title: 'Udhar Khata', subtitle: 'Customer credit ledger & payment history' },
  '/dashboard/expenses': { title: 'Expenses', subtitle: 'Shop operational costs & bills' },
  '/dashboard/reports': { title: 'Reports & Analytics', subtitle: 'Profitability, margins & sales breakdown' },
  '/dashboard/settings': { title: 'Shop Settings', subtitle: 'Receipt details & database management' },
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const page = pageTitles[pathname] || { title: 'Dashboard', subtitle: '' };
  const todayDate = format(new Date(), 'EEE, dd MMM yyyy');

  return (
    <header className="h-16 bg-white border-b border-neutral-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-[#121212] leading-none tracking-tight">{page.title}</h1>
          {page.subtitle && <p className="text-[11px] font-medium text-neutral-500 mt-1 hidden sm:block">{page.subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200/80">
          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          <span>{todayDate}</span>
        </div>
      </div>
    </header>
  );
}