"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/logo";

const tiers = [
  {
    key: "scout",
    name: "Scout",
    originalPrice: "$8.99",
    monthlyPrice: "$4.99",
    annualMonthly: "$3.99",
    annualTotal: "$47.88",
    interval: "Up to every 2 hours",
    features: [
      "25 watchlist entries",
      "Scan every 2h, 6h, 12h, or daily",
      "Email alerts for new listings",
      "Sortable results + price check",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    originalPrice: "$24.99",
    monthlyPrice: "$14.99",
    annualMonthly: "$11.99",
    annualTotal: "$143.88",
    interval: "Up to every 30 min",
    popular: true,
    features: [
      "100 watchlist entries",
      "Scan every 30m, 45m, 1h + Scout options",
      "Everything in Scout",
      "Priority scanning",
    ],
  },
  {
    key: "elite",
    name: "Elite",
    originalPrice: "$49.99",
    monthlyPrice: "$29.99",
    annualMonthly: "$23.99",
    annualTotal: "$287.88",
    interval: "Up to every 15 min",
    features: [
      "Unlimited watchlist entries",
      "Scan as fast as every 15 minutes",
      "On-demand Scan Now button",
      "Everything in Pro",
    ],
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [currentTier, setCurrentTier] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        if (data.active) setCurrentTier(data.tier);
      });
  }, [session]);

  async function handleSubscribe(tier: string) {
    if (!session) {
      router.push("/login");
      return;
    }
    setLoading(tier);

    // Try checkout first
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, annual }),
    });
    const data = await res.json();

    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }

    // If already subscribed, redirect to Stripe billing portal to change plan
    if (res.status === 400 && data.error?.includes("already have")) {
      const portalRes = await fetch("/api/billing/portal", { method: "POST" });
      const portalData = await portalRes.json();
      if (portalData.url) {
        window.location.href = portalData.url;
        return;
      }
    }

    setLoading(null);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-navy px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Logo size={22} />
          CardWatch
        </Link>
        <div className="flex gap-3">
          {!session && (
            <button
              onClick={() => router.push("/login")}
              className="text-white/80 hover:text-white text-sm font-medium transition"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      {/* Header */}
      <section className="bg-navy text-white py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Choose your scanning speed
          </h1>
          <p className="text-white/60 text-lg mb-8">
            All plans include a{" "}
            <span className="text-white font-semibold">3-day free trial</span>.
            Cancel anytime.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center bg-white/10 rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                !annual ? "bg-white text-navy" : "text-white/70 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
                annual ? "bg-white text-navy" : "text-white/70 hover:text-white"
              }`}
            >
              Annual
              <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-6 -mt-8">
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`relative bg-white rounded-2xl border-2 ${
                tier.popular
                  ? "border-navy shadow-xl shadow-navy/10 scale-105"
                  : "border-border shadow-lg"
              } p-8 flex flex-col`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-navy text-white font-bold px-4 py-1 rounded-full text-xs">
                  Most Popular
                </div>
              )}

              {/* 40% off badge */}
              <div className="absolute -top-3 -right-3 bg-green-500 text-white font-bold px-2.5 py-1 rounded-full text-[10px]">
                40% OFF
              </div>

              <h3 className="text-lg font-bold text-navy">{tier.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {tier.interval}
              </p>

              {/* Price display */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-lg text-muted-foreground line-through">
                    {tier.originalPrice}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-navy">
                    {annual ? tier.annualMonthly : tier.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                {annual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Billed {tier.annualTotal}/year
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <svg
                      className="w-5 h-5 text-navy shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 rounded-full font-semibold text-sm transition ${
                  tier.popular
                    ? "bg-navy text-white hover:bg-navy-light"
                    : "bg-navy text-white hover:bg-navy-light"
                }`}
                disabled={loading === tier.key || currentTier === tier.key}
                onClick={() => handleSubscribe(tier.key)}
              >
                {loading === tier.key
                  ? "Redirecting..."
                  : currentTier === tier.key
                    ? "Current plan"
                    : currentTier
                      ? "Switch to this plan"
                      : "Start free trial"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="py-16" />
    </div>
  );
}
