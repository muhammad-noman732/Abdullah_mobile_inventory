import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'Rs'): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${currency} 0`;
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency} ${Math.round(numericAmount).toLocaleString('en-PK')}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return format(d, 'dd/MM/yyyy');
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return format(d, 'dd/MM/yyyy hh:mm a');
}
