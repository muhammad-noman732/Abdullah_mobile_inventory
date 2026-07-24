'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Receipt,
  Wallet,
  Banknote,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Stock', href: '/dashboard/stock', icon: Package },
  { name: 'Sales', href: '/dashboard/sales', icon: Receipt },
  { name: 'Udhar', href: '/dashboard/udhar', icon: Wallet },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Banknote },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 flex items-center justify-around shadow-lg">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all duration-150',
              isActive
                ? 'text-slate-900 bg-slate-100 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Icon className={cn('w-4 h-4', isActive ? 'text-slate-900' : 'text-slate-400')} />
            <span className="leading-none">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
