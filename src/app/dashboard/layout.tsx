import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex">
      {/* Fixed Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-60 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Bottom Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
