import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

export const TIERS = {
  scout: {
    name: "Scout",
    price: 2999, // cents
    priceDisplay: "$29.99",
    interval: "month" as const,
    scanIntervalMinutes: 180,
    features: [
      "Scan every 3 hours",
      "Unlimited watchlist entries",
      "Email alerts",
      "Sortable results",
    ],
  },
  pro: {
    name: "Pro",
    price: 4999,
    priceDisplay: "$49.99",
    interval: "month" as const,
    scanIntervalMinutes: 60,
    features: [
      "Scan every hour",
      "Everything in Scout",
      "Priority scanning",
    ],
  },
  elite: {
    name: "Elite",
    price: 9999,
    priceDisplay: "$99.99",
    interval: "month" as const,
    scanIntervalMinutes: 15,
    features: [
      "Scan every 15 minutes",
      "Everything in Pro",
      "PSA grade data (coming soon)",
      "Strong buy scoring (coming soon)",
    ],
  },
} as const;

export type TierKey = keyof typeof TIERS;
