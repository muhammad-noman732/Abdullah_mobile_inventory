import Link from 'next/link';

const features = [
  {
    title: 'Stock Management',
    detail: 'Catalog every phone by brand, model, variant, and condition. Set pricing, track quantities, and receive low-stock alerts before you run out.',
  },
  {
    title: 'Sales Tracking',
    detail: 'Record transactions in seconds with auto-calculated profit per unit. Every sale updates your inventory and ledger in real time.',
  },
  {
    title: 'Credit Ledger',
    detail: 'Manage udhar accounts with installment tracking, overdue flags, and full payment histories for every customer.',
  },
  {
    title: 'Reports & Analytics',
    detail: 'Understand your business through sales trends, category breakdowns, profit margins, and expense summaries — all updated live.',
  },
];

export default function LandingPage() {
  return (
    <div className="bg-[#fafafa] text-[#121212] antialiased">

      {/* ── Navigation ───────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#fafafa]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <span className="text-sm font-medium tracking-tight">Mobistore</span>
          <nav className="flex items-center gap-8">
            <a href="#features" className="text-sm text-neutral-400 hover:text-[#121212] transition-colors">Features</a>
            <Link
              href="/dashboard"
              className="text-sm font-medium border-b border-[#121212]/20 pb-0.5 hover:border-[#121212] transition-all"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-16 md:pt-24">
        <div className="max-w-3xl">
          <p className="text-xs font-medium text-neutral-400 tracking-[0.2em] uppercase mb-5">
            Inventory management
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-[200] leading-[1.1] tracking-[-0.03em]">
            The operating
            <br />
            system for phone
            <br />
            retailers
          </h1>
          <p className="text-base leading-[1.7] text-neutral-400 max-w-[440px] mt-5">
            Mobistore replaces paper ledgers and spreadsheets with a single,
            lightweight dashboard built for mobile phone shops in Pakistan.
          </p>
          <div className="flex items-center gap-5 mt-7">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-7 py-2.5 rounded-full bg-[#121212] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-all"
            >
              Open Dashboard
            </Link>
            <a href="#features" className="text-sm text-neutral-400 hover:text-[#121212] transition-colors">
              Explore features
            </a>
          </div>
        </div>
      </section>

      {/* ── Hero Image (full-bleed break) ──────────────── */}
      <div className="mt-12 md:mt-16">
        <img
          src="https://picsum.photos/seed/phone/1600/900"
          alt=""
          className="w-full h-64 md:h-[420px] object-cover"
          loading="eager"
        />
      </div>

      {/* ── Features ──────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 md:px-12 pt-16 md:pt-24">
        <p className="text-xs font-medium text-neutral-400 tracking-[0.2em] uppercase mb-10 md:mb-14">
          Capabilities
        </p>
        <div className="space-y-14 md:space-y-20">
          {features.map((f, i) => (
            <div key={i} className="max-w-3xl">
              <p className="text-[11px] font-medium text-neutral-300 tracking-[0.15em] uppercase mb-3">
                {String(i + 1).padStart(2, '0')}
              </p>
              <h2 className="text-2xl md:text-3xl font-[200] leading-[1.2] tracking-[-0.02em]">
                {f.title}
              </h2>
              <p className="text-base leading-[1.7] text-neutral-400 max-w-[520px] mt-3">
                {f.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full-bleed Image Break ────────────────────── */}
      <div className="mt-14 md:mt-20">
        <img
          src="https://picsum.photos/seed/devices/1600/800"
          alt=""
          className="w-full h-56 md:h-[380px] object-cover"
          loading="lazy"
        />
      </div>

      {/* ── Philosophy ────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-16 md:pt-24">
        <p className="text-xs font-medium text-neutral-400 tracking-[0.2em] uppercase mb-10 md:mb-14">
          Philosophy
        </p>
        <div className="space-y-14 md:space-y-20 max-w-3xl">
          <div>
            <h2 className="text-2xl md:text-3xl font-[200] leading-[1.2] tracking-[-0.02em]">
              Built for the counter, not the cloud
            </h2>
            <p className="text-base leading-[1.7] text-neutral-400 max-w-[520px] mt-3">
              Mobistore works entirely offline on any device. No internet required,
              no server to maintain, no monthly fee.
            </p>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-[200] leading-[1.2] tracking-[-0.02em]">
              Urdu bazaars, English software
            </h2>
            <p className="text-base leading-[1.7] text-neutral-400 max-w-[520px] mt-3">
              The currency, the credit culture, the way phones are sold in Pakistan
              — every feature starts from how business actually happens.
            </p>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-[200] leading-[1.2] tracking-[-0.02em]">
              Your data stays yours
            </h2>
            <p className="text-base leading-[1.7] text-neutral-400 max-w-[520px] mt-3">
              No login, no signup, no cloud sync. The database lives on your device.
              Backup and restore are one click away.
            </p>
          </div>
        </div>
      </section>

      {/* ── Full-bleed Image Break ────────────────────── */}
      <div className="mt-14 md:mt-20">
        <img
          src="https://picsum.photos/seed/shop/1600/800"
          alt=""
          className="w-full h-56 md:h-[380px] object-cover"
          loading="lazy"
        />
      </div>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20 md:pb-28">
        <div className="max-w-3xl">
          <p className="text-xs font-medium text-neutral-400 tracking-[0.2em] uppercase mb-5">
            Get started
          </p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-[200] leading-[1.1] tracking-[-0.03em]">
            No setup.
            <br />
            No signup.
            <br />
            Just open and sell.
          </h2>
          <p className="text-base leading-[1.7] text-neutral-400 max-w-[480px] mt-5">
            Mobistore runs entirely in your browser. There is nothing to install,
            no account to create, and no data ever leaves your machine.
          </p>
          <div className="mt-7">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-7 py-2.5 rounded-full bg-[#121212] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-all"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <div className="border-t border-neutral-200/70">
        <footer className="max-w-6xl mx-auto px-6 md:px-12 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <span className="text-sm text-neutral-400">Mobistore &mdash; mobile inventory management</span>
            <span className="text-sm text-neutral-300">&copy; {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>

    </div>
  );
}