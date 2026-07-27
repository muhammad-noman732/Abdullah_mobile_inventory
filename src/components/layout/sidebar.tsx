'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Receipt, Wallet, Banknote,
  BarChart3, Settings, X, ShoppingCart, Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/daily-sales', label: 'Daily Sales', icon: ShoppingCart },
  { href: '/dashboard/stock', label: 'Stock', icon: Smartphone },
  { href: '/dashboard/accessories', label: 'Accessories', icon: Package },
  { href: '/dashboard/sales', label: 'Sales History', icon: Receipt },
  { href: '/dashboard/udhar', label: 'Udhar Khata', icon: Wallet },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Banknote },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {isOpen && onClose && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'flex flex-col w-60 bg-white min-h-screen fixed left-0 top-0 z-50 border-r border-neutral-200/80 transition-transform duration-300',
          'md:translate-x-0 md:z-30',
          onClose ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'md:flex'
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-100 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#121212] flex items-center justify-center text-white shadow-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="14" x2="4" y2="14" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#121212] tracking-tight leading-none">Mobistore</span>
              <span className="text-[10px] font-medium text-neutral-400 mt-0.5">Inventory Manager</span>
            </div>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-[#121212] hover:bg-neutral-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group',
                  active
                    ? 'bg-[#121212] text-white font-semibold shadow-xs'
                    : 'text-neutral-500 hover:text-[#121212] hover:bg-neutral-100/80'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0 transition-colors', active ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-600')} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-100">
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group',
              pathname.startsWith('/dashboard/settings')
                ? 'bg-[#121212] text-white font-semibold shadow-xs'
                : 'text-neutral-500 hover:text-[#121212] hover:bg-neutral-100/80'
            )}
          >
            <Settings className={cn('w-4 h-4 shrink-0 transition-colors', pathname.startsWith('/dashboard/settings') ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-600')} />
            <span>Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
