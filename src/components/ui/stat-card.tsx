import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all duration-150', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">{value}</span>
        {trend && (
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full border',
              trend.positive ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'
            )}
          >
            {trend.positive ? '↑ ' : '↓ '}
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[11px] font-medium text-slate-500 mt-1.5">{subtitle}</p>}
    </div>
  );
}
