import Link from 'next/link';
import {
  Package,
  Receipt,
  Wallet,
  Banknote,
  BarChart3,
  Printer,
  ArrowRight,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Package,
    title: 'Stock Management',
    description: 'Track brand, model, condition, purchase/selling price, and low stock alerts.',
  },
  {
    icon: Receipt,
    title: 'Sales Tracking',
    description: 'Instant selling process with auto profit calculation per unit.',
  },
  {
    icon: Wallet,
    title: 'Udhar Khata',
    description: 'Manage credit sales, log installment payments, and view overdue debtors.',
  },
  {
    icon: Banknote,
    title: 'Expense Tracking',
    description: 'Log shop rent, utilities, salaries, transport, and maintenance expenses.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Charts',
    description: 'Real-time gross/net profit metrics, sales trend charts, and model rankings.',
  },
  {
    icon: Printer,
    title: 'Print Receipts',
    description: 'One-click formatted receipt printing for customers with customizable headers.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* Header Bar */}
      <header className="max-w-6xl w-full mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">MobileShop POS</span>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Dashboard
          </Button>
        </Link>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-4xl w-full mx-auto px-6 py-12 md:py-20 text-center flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/70 text-slate-700 text-xs font-semibold">
          <span>Fast, Lightweight Internal POS</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight max-w-2xl leading-tight">
          Complete shop management for mobile retailers
        </h1>
        <p className="text-base md:text-lg text-slate-600 max-w-xl">
          Effortlessly manage stock inventory, track customer sales, record credit (Udhar) installments, and view real-time shop profit reports.
        </p>

        <div className="pt-2">
          <Link href="/dashboard">
            <Button size="lg" className="px-7 py-3 text-base font-semibold shadow-md">
              Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-left w-full mt-12">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl w-full mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} MobileShop POS. All rights reserved.</p>
          <p>Internal POS & Inventory Management</p>
        </div>
      </footer>
    </div>
  );
}
