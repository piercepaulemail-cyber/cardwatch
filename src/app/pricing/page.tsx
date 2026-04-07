"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const tiers = [
  {
    key: "scout",
    name: "Scout",
    price: "$4.99",
    interval: "Up to every 2 hours",
    features: [
      "Choose: every 2h, 6h, 12h, or daily",
      "Unlimited watchlist entries",
      "Email alerts for new listings",
      "Sortable results table",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$14.99",
    interval: "Up to every 30 min",
    popular: true,
    features: [
      "Choose: every 30m, 45m, 1h, 2h, 6h, 12h, daily",
      "Everything in Scout",
      "Priority scanning",
      "Faster alerts",
    ],
  },
  {
    key: "elite",
    name: "Elite",
    price: "$29.99",
    interval: "Up to every 15 min",
    features: [
      "All scan intervals including every 15 min",
      "Everything in Pro",
      "PSA grade data (coming soon)",
      "Strong buy scoring (coming soon)",
    ],
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(tier: string) {
    if (!session) {
      router.push("/login");
      return;
    }
    setLoading(tier);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    setLoading(null);
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-navy px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white tracking-tight">
          CardWatch
        </Link>
        <div className="flex gap-3">
          {session ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-white text-navy font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-silver-light transition"
            >
              Dashboard
            </button>
          ) : (
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
          <p className="text-white/60 text-lg">
            All plans include a{" "}
            <span className="text-white font-semibold">3-day free trial</span>.
            Cancel anytime.
          </p>
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
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-navy font-bold px-4 py-1 rounded-full text-xs">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold text-navy">{tier.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {tier.interval}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-navy">
                  {tier.price}
                </span>
                <span className="text-muted-foreground">/mo</span>
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
                    ? "bg-white text-navy hover:bg-silver-light"
                    : "bg-navy text-white hover:bg-navy-light"
                }`}
                disabled={loading === tier.key}
                onClick={() => handleSubscribe(tier.key)}
              >
                {loading === tier.key
                  ? "Redirecting..."
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
