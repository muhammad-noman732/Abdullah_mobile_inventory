'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface SparklineCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  color?: 'emerald' | 'blue' | 'purple' | 'amber';
  trendText?: string;
  icon?: LucideIcon;
}

const colorConfig = {
  emerald: {
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  blue: {
    iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  purple: {
    iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
  },
  amber: {
    iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
  },
};

export function SparklineCard({
  title,
  subtitle = 'Monthly overview',
  value,
  color = 'blue',
  trendText,
  icon: Icon,
}: SparklineCardProps) {
  const conf = colorConfig[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 sm:p-4 flex flex-col justify-between hover:border-slate-300 transition-all duration-150">
      {/* Top Row: Title + Icon */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-none truncate">{title}</h3>
          <p className="text-[11px] font-medium text-slate-400 mt-1 truncate">{subtitle}</p>
        </div>
        {Icon && (
          <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center border shrink-0', conf.iconBg)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Metric Row */}
      <div className="mt-3 flex flex-col gap-1">
        <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
          {value}
        </span>
        {trendText && (
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
            <span className="truncate">{trendText}</span>
          </span>
        )}
      </div>
    </div>
  );
}
