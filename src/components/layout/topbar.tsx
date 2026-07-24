'use client';

import { usePathname } from 'next/navigation';
import { Calendar, Menu, Smartphone, X } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, Receipt, Wallet, Banknote,
  BarChart3, Settings
} from 'lucide-react';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of shop performance & sales' },
  '/dashboard/stock': { title: 'Stock Management', subtitle: 'Phone inventory, pricing & low stock alerts' },
  '/dashboard/sales': { title: 'Sales History', subtitle: 'All completed transactions & receipts' },
  '/dashboard/udhar': { title: 'Udhar Khata', subtitle: 'Customer credit ledger & payment history' },
  '/dashboard/expenses': { title: 'Expenses', subtitle: 'Shop operational costs & bills' },
  '/dashboard/reports': { title: 'Reports & Analytics', subtitle: 'Profitability, margins & sales breakdown' },
  '/dashboard/settings': { title: 'Shop Settings', subtitle: 'Receipt details & database management' },
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/stock', label: 'Stock', icon: Package },
  { href: '/dashboard/sales', label: 'Sales History', icon: Receipt },
  { href: '/dashboard/udhar', label: 'Udhar Khata', icon: Wallet },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Banknote },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Topbar() {
  const pathname = usePathname();
  const page = pageTitles[pathname] || { title: 'Dashboard', subtitle: '' };
  const todayDate = format(new Date(), 'EEE, dd MMM yyyy');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Title + Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-none tracking-tight">{page.title}</h1>
            {page.subtitle && <p className="text-[11px] font-medium text-slate-500 mt-1 hidden sm:block">{page.subtitle}</p>}
          </div>
        </div>

        {/* Right: Date Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{todayDate}</span>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-start pt-16">
          <div className="bg-white border-b border-slate-200 p-4 shadow-xl flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-150">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">
              Mobile Shop Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    active
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <Icon className={cn('w-4 h-4', active ? 'text-white' : 'text-slate-400')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
