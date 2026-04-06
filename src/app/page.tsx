import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-navy px-6 py-4 flex justify-between items-center">
        <span className="text-xl font-bold text-white tracking-tight">
          CardWatch
        </span>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
          <Link href="/pricing" className="hover:text-white transition">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-white transition">
            Sign in
          </Link>
          <Link
            href="/pricing"
            className="bg-white text-navy font-semibold px-5 py-2.5 rounded-full hover:bg-silver-light transition"
          >
            Get Started &rarr;
          </Link>
        </div>
        <Link
          href="/pricing"
          className="md:hidden bg-white text-navy font-semibold px-4 py-2 rounded-full text-sm"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              Snap up raw cards
              <br />
              <span className="text-white/90">before anyone else.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-10 leading-relaxed max-w-lg">
              CardWatch monitors eBay 24/7 for newly listed ungraded sports
              cards. Build your watchlist, get instant email alerts, and never
              miss a deal again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/pricing"
                className="bg-white text-navy font-bold px-8 py-4 rounded-full text-lg hover:bg-silver-light transition inline-flex items-center gap-2"
              >
                Start free trial &rarr;
              </Link>
              <Link
                href="/login"
                className="border border-white/20 text-white font-semibold px-8 py-4 rounded-full text-lg hover:bg-white/5 transition text-center"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm font-semibold text-navy/60 uppercase tracking-widest mb-3 text-center">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-navy text-center mb-16 tracking-tight">
            The smarter way to collect
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-navy mb-3">
                Auto-Scan eBay
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Scans every 15 minutes to 3 hours depending on your plan.
                Catches newly listed raw cards across all listing types.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h3 className="text-xl font-bold text-navy mb-3">
                Instant Alerts
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Get email notifications the moment a matching card is listed.
                You see it before everyone else.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
              </div>
              <h3 className="text-xl font-bold text-navy mb-3">
                Sort &amp; Filter
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Sort by price, seller rating, bids, and more. Find the best
                deals from the most trusted sellers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-20">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Stop scrolling. Start collecting.
          </h2>
          <p className="text-white/60 text-lg mb-8">
            Join CardWatch and let us find the cards. All plans include a
            3-day free trial.
          </p>
          <Link
            href="/pricing"
            className="bg-white text-navy font-bold px-10 py-4 rounded-full text-lg hover:bg-silver-light transition inline-flex items-center gap-2"
          >
            View pricing &rarr;
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-dark py-8 text-center">
        <p className="text-white/40 text-sm">
          &copy; 2026 CardWatch. Built for collectors.
        </p>
      </footer>
    </div>
  );
}
