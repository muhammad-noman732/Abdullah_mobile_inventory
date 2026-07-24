'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Receipt, Wallet, Banknote,
  BarChart3, Settings, Smartphone, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/stock', label: 'Stock', icon: Package },
  { href: '/dashboard/sales', label: 'Sales History', icon: Receipt },
  { href: '/dashboard/udhar', label: 'Udhar Khata', icon: Wallet },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Banknote },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white min-h-screen fixed left-0 top-0 z-30 border-r border-slate-200/80">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900 tracking-tight leading-none">MobileShop</span>
          <span className="text-[10px] font-medium text-slate-400 mt-1">POS & Shop Manager</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group',
                active
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0 transition-colors', active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700')} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 text-slate-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Settings Link at Bottom */}
      <div className="p-3 border-t border-slate-100">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group',
            pathname.startsWith('/dashboard/settings')
              ? 'bg-slate-900 text-white font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          )}
        >
          <Settings className={cn('w-4 h-4 shrink-0 transition-colors', pathname.startsWith('/dashboard/settings') ? 'text-white' : 'text-slate-400 group-hover:text-slate-700')} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
