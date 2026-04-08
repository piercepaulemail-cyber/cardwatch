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
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm text-white/80">Scanning eBay right now</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              The card you want
              <br />
              was just listed.
              <br />
              <span className="text-white/60">Did you see it?</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-10 leading-relaxed max-w-lg">
              CardWatch scans eBay every 15 minutes for the exact cards you want — raw, graded, any sport.
              Get alerted before other collectors even open the app.
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
            <p className="text-white/40 text-sm mt-4">3-day free trial. Cancel anytime. Plans start at $4.99/mo.</p>
          </div>
        </div>
      </section>

      {/* Social proof / stats bar */}
      <section className="bg-navy border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-3xl font-extrabold text-white">24/7</p>
            <p className="text-white/50 text-sm mt-1">eBay Monitoring</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white">15 min</p>
            <p className="text-white/50 text-sm mt-1">Fastest Scan Cycle</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white">All Sports</p>
            <p className="text-white/50 text-sm mt-1">Football, Basketball, Baseball +</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-white">Instant</p>
            <p className="text-white/50 text-sm mt-1">Email Alerts</p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-navy/50 uppercase tracking-widest mb-3">
              The problem
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy tracking-tight mb-6">
              You&apos;re missing deals every single day
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A mispriced Prizm Silver hits eBay at 2:47 AM. By 2:52 AM, it&apos;s sold.
              A PSA 10 rookie gets listed $200 under market while you&apos;re at work. Gone in minutes.
              You can&apos;t watch eBay 24/7 — but CardWatch can.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
              <p className="font-bold text-red-900 mb-3">Without CardWatch</p>
              <ul className="space-y-2.5 text-sm text-red-800">
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10005;</span> Manually refreshing eBay search pages</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10005;</span> Missing underpriced cards while you sleep</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10005;</span> Competitors snag the best deals first</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10005;</span> Hours wasted scrolling through irrelevant listings</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10005;</span> No system — just hope and luck</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
              <p className="font-bold text-green-900 mb-3">With CardWatch</p>
              <ul className="space-y-2.5 text-sm text-green-800">
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10003;</span> eBay scanned automatically every 15 minutes</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10003;</span> Email alert with photo, price, and direct link</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10003;</span> See new listings before anyone else</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10003;</span> Filter by condition: raw, graded, near mint</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#10003;</span> Sort by price, seller rating, bids — find the edge</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-20 bg-navy/[0.03]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-navy/50 uppercase tracking-widest mb-3">
              The math
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy tracking-tight">
              One card pays for a year of CardWatch
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-xl overflow-hidden">
            {/* Mock dashboard/ROI visual */}
            <div className="bg-navy p-6 md:p-8">
              <p className="text-white/50 text-xs uppercase tracking-widest mb-4">Example scenario</p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-xl p-5">
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">You spot</p>
                  <p className="text-white font-bold text-lg">2024 Prizm Silver Jayden Daniels RC</p>
                  <p className="text-white/50 text-sm mt-1">Listed at $45 — seller priced it low</p>
                </div>
                <div className="bg-white/10 rounded-xl p-5">
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Market value</p>
                  <p className="text-3xl font-extrabold text-white">$180</p>
                  <p className="text-white/50 text-sm mt-1">Last 5 sold comps on eBay</p>
                </div>
                <div className="bg-white/10 rounded-xl p-5">
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Your profit</p>
                  <p className="text-3xl font-extrabold text-green-400">+$135</p>
                  <p className="text-white/50 text-sm mt-1">One flip = 27x your monthly cost</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-xl font-bold text-navy mb-3">
                    CardWatch users find deals like this every week
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Underpriced cards get listed 24/7. The only question is whether you see them first.
                    At $4.99/month, CardWatch pays for itself with a single find — everything after that is pure profit.
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <p className="text-2xl font-extrabold text-navy">2,700%</p>
                      <p className="text-muted-foreground">Potential ROI</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-navy">$4.99</p>
                      <p className="text-muted-foreground">Monthly cost</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-navy">1 card</p>
                      <p className="text-muted-foreground">To break even</p>
                    </div>
                  </div>
                </div>
                <div className="bg-navy/[0.03] rounded-xl p-5 border border-border">
                  <p className="text-xs font-semibold text-navy/50 uppercase tracking-wide mb-3">Sample alert you&apos;d receive</p>
                  <div className="bg-white rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-navy rounded-full"></div>
                      <span className="text-xs font-semibold text-navy">CardWatch Alert</span>
                    </div>
                    <p className="font-bold text-navy text-sm mb-1">2024 Prizm Silver Jayden Daniels RC</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="text-navy font-bold text-base">$45.00</span>
                      <span className="bg-navy/10 px-2 py-0.5 rounded-full font-medium">Buy Now</span>
                      <span>Seller: cardking99 (2,847)</span>
                    </div>
                    <div className="mt-3 inline-block bg-navy text-white text-xs font-semibold px-3 py-1.5 rounded">
                      View on eBay &rarr;
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-navy/50 uppercase tracking-widest mb-3">
              Features
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy tracking-tight">
              Everything you need to collect smarter
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-border rounded-2xl p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">Smart Scanning</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Scans eBay as often as every 15 minutes. Choose your frequency. Raw cards, graded slabs, any sport, any player.
              </p>
            </div>

            <div className="border border-border rounded-2xl p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">Email Alerts with Photos</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Get an email the second a matching card is listed — with the card image, price, seller info, and a direct eBay link to buy.
              </p>
            </div>

            <div className="border border-border rounded-2xl p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">Advanced Filters</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Filter by condition (raw, graded, near mint), listing type (auction or BIN), min/max price. Sort results your way.
              </p>
            </div>

            <div className="border border-border rounded-2xl p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">Unlimited Watchlists</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Track as many players and card types as you want. Jaxson Dart Prizm, Cooper Flagg Bowman, Wemby Mosaic — add them all.
              </p>
            </div>

            <div className="border border-border rounded-2xl p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">Seller Intelligence</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                See seller feedback scores and ratings at a glance. Sort by seller reputation to buy from trusted sources only.
              </p>
            </div>

            <div className="border border-border rounded-2xl p-6 hover:shadow-lg transition">
              <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-navy mb-2">Works on Mobile</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Get alerts on your phone. Open the email, click the link, buy the card — all from wherever you are. No app download needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 bg-navy/[0.03]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-navy/50 uppercase tracking-widest mb-3">
              Built for
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-navy tracking-tight">
              Collectors, flippers, and hobbyists
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-border p-6">
              <p className="text-2xl mb-3">&#127942;</p>
              <h3 className="font-bold text-navy mb-2">PC Collectors</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Building a player collection? Set alerts for every parallel and insert.
                Grab the cards you need at the best prices before they&apos;re gone.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-6">
              <p className="text-2xl mb-3">&#128176;</p>
              <h3 className="font-bold text-navy mb-2">Card Flippers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Spot mispriced cards instantly. Buy low, sell high. CardWatch finds the deals — you close them.
                One flip covers months of your subscription.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-6">
              <p className="text-2xl mb-3">&#128640;</p>
              <h3 className="font-bold text-navy mb-2">Prospectors</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Watching rookies before they break out? Set up alerts now so you&apos;re first in line when
                their cards hit eBay at pre-hype prices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy py-20">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Stop refreshing eBay manually.
            <br />
            Let CardWatch do the work.
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of collectors who never miss a listing.
            Start your 3-day free trial today — no credit card charged until it ends.
          </p>
          <Link
            href="/pricing"
            className="bg-white text-navy font-bold px-10 py-4 rounded-full text-lg hover:bg-silver-light transition inline-flex items-center gap-2"
          >
            Start your free trial &rarr;
          </Link>
          <p className="text-white/30 text-sm mt-4">Plans start at $4.99/month</p>
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
